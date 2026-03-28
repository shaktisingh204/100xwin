import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { AviatorRound, AviatorRoundDocument } from './schemas/aviator-round.schema';
import { AviatorBet, AviatorBetDocument } from './schemas/aviator-bet.schema';
import { PrismaService } from '../prisma.service';
import { BonusService } from '../bonus/bonus.service';

const HOUSE_EDGE = 0.01;       // 1%
const BETTING_DURATION_MS = 5000;   // 5s betting window
const TICK_INTERVAL_MS = 100;       // emit multiplier every 100ms

/**
 * Provably fair crash point generation.
 * Crash point = 0.99 / (1 - H)  where H ∈ [0,1) is derived from HMAC-SHA256.
 * With 1% house edge → instant crash if H < 0.01.
 */
function generateCrashPoint(serverSeed: string, roundId: number): number {
  const hmac = crypto
    .createHmac('sha256', serverSeed)
    .update(String(roundId))
    .digest('hex');

  const h = parseInt(hmac.slice(0, 8), 16) / 0xffffffff;

  if (h < HOUSE_EDGE) return 1.00;  // instant crash (house wins)
  return parseFloat(((1 - HOUSE_EDGE) / (1 - h)).toFixed(2));
}

@Injectable()
export class AviatorService {
  private readonly logger = new Logger(AviatorService.name);
  private roundCounter = 1;
  private _onRoundStart: ((round: any) => void) | null = null;
  private _onMultiplierTick: ((roundId: number, multiplier: number) => void) | null = null;
  private _onCrash: ((roundId: number, crashPoint: number, winners: any[]) => void) | null = null;
  private _onBettingPhase: ((round: any) => void) | null = null;

  constructor(
    @InjectModel(AviatorRound.name) private readonly roundModel: Model<AviatorRoundDocument>,
    @InjectModel(AviatorBet.name)   private readonly betModel:   Model<AviatorBetDocument>,
    private readonly prisma: PrismaService,
    private readonly bonusService: BonusService,
  ) {}

  // ── Callbacks (set by gateway) ────────────────────────────────────────────

  onRoundStart(cb: (round: any) => void)    { this._onRoundStart = cb; }
  onMultiplierTick(cb: (roundId: number, multiplier: number) => void) { this._onMultiplierTick = cb; }
  onCrash(cb: (roundId: number, crashPoint: number, winners: any[]) => void) { this._onCrash = cb; }
  onBettingPhase(cb: (round: any) => void)  { this._onBettingPhase = cb; }

  // ── Round lifecycle ───────────────────────────────────────────────────────

  async startLoop() {
    this.logger.log('Aviator round loop started');
    const latest = await this.roundModel.findOne().sort({ roundId: -1 });
    if (latest) this.roundCounter = latest.roundId + 1;
    this.runRound();
  }

  private async runRound() {
    const roundId = this.roundCounter++;
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const crashPoint = generateCrashPoint(serverSeed, roundId);

    // Create round in DB
    const round = await this.roundModel.create({
      roundId, serverSeed, serverSeedHash, crashPoint, status: 'BETTING',
    });

    // Announce betting phase
    const bettingPayload = { roundId, serverSeedHash, status: 'BETTING', endsIn: BETTING_DURATION_MS };
    this._onBettingPhase?.(bettingPayload);
    this.logger.debug(`Round ${roundId} — BETTING (crash @ ${crashPoint}x)`);

    // Wait for betting window
    await this.sleep(BETTING_DURATION_MS);

    // Mark as FLYING
    await this.roundModel.updateOne({ roundId }, { $set: { status: 'FLYING', startedAt: new Date() } });
    this._onRoundStart?.({ roundId, serverSeedHash, status: 'FLYING' });

    // Grow multiplier until crash
    let currentMultiplier = 1.0;
    const startTime = Date.now();

    while (currentMultiplier < crashPoint) {
      await this.sleep(TICK_INTERVAL_MS);
      const elapsed = (Date.now() - startTime) / 1000;  // seconds
      // Exponential growth: m = e^(0.00006 × elapsed_ms) — smooth like real Aviator
      currentMultiplier = parseFloat(Math.pow(Math.E, 0.00006 * (Date.now() - startTime)).toFixed(2));
      if (currentMultiplier >= crashPoint) break;

      // Auto-cashout for any bets with target reached
      await this.processAutoCashouts(roundId, currentMultiplier);

      this._onMultiplierTick?.(roundId, currentMultiplier);
    }

    // Crash!
    const crashedAt = new Date();
    await this.roundModel.updateOne(
      { roundId },
      { $set: { status: 'CRASHED', crashedAt, currentMultiplier: crashPoint } },
    );

    // Mark all remaining ACTIVE bets as LOST
    await this.betModel.updateMany({ roundId, status: 'ACTIVE' }, { $set: { status: 'LOST', payout: 0 } });

    // Gather winners for broadcast
    const winners = await this.betModel.find({ roundId, status: 'CASHEDOUT' }).lean();
    this._onCrash?.(roundId, crashPoint, winners);
    this.logger.debug(`Round ${roundId} CRASHED @ ${crashPoint}x`);

    // Wait 3s between rounds
    await this.sleep(3000);
    this.runRound();  // next round
  }

  private async processAutoCashouts(roundId: number, multiplier: number) {
    const bets = await this.betModel.find({
      roundId, status: 'ACTIVE', autoCashoutAt: { $gt: 0, $lte: multiplier },
    });
    for (const bet of bets) {
      await this.processCashout(bet, multiplier, true);
    }
  }

  private async processCashout(bet: AviatorBetDocument, multiplier: number, auto = false) {
    const payout = parseFloat((bet.betAmount * multiplier).toFixed(2));
    bet.status = 'CASHEDOUT';
    bet.cashedOutMultiplier = multiplier;
    bet.payout = payout;
    await bet.save();

    // Credit user (Prisma)
    try {
      const balanceField = bet.walletType === 'crypto' ? 'cryptoBalance' : 'balance';
      await this.prisma.user.update({
        where: { id: bet.userId },
        data: {
          [balanceField]: { increment: payout },
        },
      });
      this.bonusService.emitWalletRefresh(bet.userId);
    } catch (e) {
      this.logger.error(`Failed to credit user ${bet.userId}: ${e}`);
    }
    return { userId: bet.userId, payout, multiplier, auto };
  }

  // ── Player actions ────────────────────────────────────────────────────────

  async placeBet(userId: number, roundId: number, betAmount: number, autoCashoutAt = 0, walletType = 'fiat') {
    const round = await this.roundModel.findOne({ roundId });
    if (!round || round.status !== 'BETTING') {
      throw new BadRequestException('Betting phase is over for this round');
    }

    // Check existing bet this round
    const existing = await this.betModel.findOne({ roundId, userId });
    if (existing) throw new BadRequestException('Already placed a bet this round');

    // Deduct balance
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      if (walletType === 'crypto') {
        if (user.cryptoBalance < betAmount) throw new BadRequestException('Insufficient crypto balance');
        await tx.user.update({ where: { id: userId }, data: { cryptoBalance: { decrement: betAmount } } });
      } else {
        if (user.balance < betAmount) throw new BadRequestException('Insufficient balance');
        await tx.user.update({ where: { id: userId }, data: { balance: { decrement: betAmount } } });
      }
    });

    const bet = await this.betModel.create({
      roundId, userId, betAmount, autoCashoutAt, walletType,
      currency: walletType === 'crypto' ? 'USD' : user.currency || 'INR',
    });

    await this.roundModel.updateOne({ roundId }, { $inc: { totalWagered: betAmount } });
    await this.bonusService.recordWagering(userId, betAmount, 'CASINO', walletType === 'crypto' ? 'crypto' : 'main').catch(() => {
      this.bonusService.emitWalletRefresh(userId);
    });
    return { betId: String(bet._id), roundId, betAmount, autoCashoutAt };
  }

  async cashOut(userId: number, roundId: number, currentMultiplier: number) {
    const round = await this.roundModel.findOne({ roundId });
    if (!round || round.status !== 'FLYING') {
      throw new BadRequestException('Round is not in flying phase');
    }

    const bet = await this.betModel.findOne({ roundId, userId, status: 'ACTIVE' });
    if (!bet) throw new BadRequestException('No active bet found for this round');

    return this.processCashout(bet, currentMultiplier);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getCurrentRound() {
    return this.roundModel.findOne({ status: { $in: ['BETTING', 'FLYING'] } }).sort({ roundId: -1 });
  }

  async getRoundHistory(limit = 20) {
    const rounds = await this.roundModel
      .find({ status: 'CRASHED' })
      .sort({ roundId: -1 })
      .limit(limit)
      .lean();
    return rounds.map((r) => ({
      roundId: r.roundId,
      crashPoint: r.crashPoint,
      serverSeedHash: r.serverSeedHash,
      serverSeed: r.serverSeed,  // revealed after crash for fairness
      crashedAt: r.crashedAt,
    }));
  }

  async getUserBetHistory(userId: number, limit = 20) {
    const bets = await this.betModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    return bets.map((b) => ({ ...b, betId: String((b as any)._id) }));
  }

  async getRoundBets(roundId: number) {
    return this.betModel.find({ roundId }).sort({ createdAt: -1 }).lean();
  }

  private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}
