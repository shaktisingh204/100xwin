import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { LimboBet, LimboBetDocument } from './schemas/limbo-bet.schema';
import { PrismaService } from '../prisma.service';
import { BonusService } from '../bonus/bonus.service';

const HOUSE_EDGE = 0.01; // 1%

function generateLimboResult(serverSeed: string, nonce: number): number {
  const hmac = crypto
    .createHmac('sha256', serverSeed)
    .update(String(nonce))
    .digest('hex');
  const h = parseInt(hmac.slice(0, 8), 16) / 0xffffffff;
  if (h < HOUSE_EDGE) return 1.00;
  return parseFloat(((1 - HOUSE_EDGE) / (1 - h)).toFixed(2));
}

@Injectable()
export class LimboService {
  private readonly logger = new Logger(LimboService.name);
  private userNonces = new Map<number, number>();

  constructor(
    @InjectModel(LimboBet.name) private readonly betModel: Model<LimboBetDocument>,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BonusService))
    private readonly bonusService: BonusService,
  ) {}

  private getNextNonce(userId: number): number {
    const current = this.userNonces.get(userId) || 0;
    const next = current + 1;
    this.userNonces.set(userId, next);
    return next;
  }

  private async deductBalance(userId: number, betAmount: number, walletType: string) {
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
    return user;
  }

  private async creditPayout(userId: number, walletType: string, payout: number) {
    try {
      const balanceField = walletType === 'crypto' ? 'cryptoBalance' : 'balance';
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          [balanceField]: { increment: payout },
        },
      });
    } catch (e) {
      this.logger.error(`Failed to credit user ${userId}: ${e}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO MODE — instant result (target multiplier provided)
  // ═══════════════════════════════════════════════════════════════════════════

  async play(userId: number, betAmount: number, targetMultiplier: number, walletType = 'fiat') {
    if (betAmount <= 0) throw new BadRequestException('Bet amount must be > 0');
    if (targetMultiplier < 1.01) throw new BadRequestException('Target multiplier must be >= 1.01');
    if (targetMultiplier > 1000000) throw new BadRequestException('Target multiplier too high');

    const user = await this.deductBalance(userId, betAmount, walletType);
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const nonce = this.getNextNonce(userId);
    const resultMultiplier = generateLimboResult(serverSeed, nonce);

    const isWin = resultMultiplier >= targetMultiplier;
    const payout = isWin ? parseFloat((betAmount * targetMultiplier).toFixed(2)) : 0;
    const result = isWin ? 'WIN' : 'LOSE';

    await this.betModel.create({
      userId, betAmount, targetMultiplier, resultMultiplier,
      result, payout, walletType,
      currency: walletType === 'crypto' ? 'USD' : user.currency || 'INR',
      serverSeed, serverSeedHash, nonce,
    });

    if (isWin) {
      await this.creditPayout(userId, walletType, payout);
    }

    await this.bonusService.recordWagering(userId, betAmount, 'CASINO', walletType === 'crypto' ? 'crypto' : 'main').catch(() => {
      this.bonusService.emitWalletRefresh(userId);
    });

    return { resultMultiplier, targetMultiplier, result, payout, betAmount, serverSeedHash, nonce };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL MODE — multiplier counts up, player cashes out
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start a manual round: deducts balance, generates crash point,
   * returns betId + crashPoint to client. Client animates the multiplier
   * counting up and player can cash out anytime before crashPoint.
   */
  async playManual(userId: number, betAmount: number, walletType = 'fiat') {
    if (betAmount <= 0) throw new BadRequestException('Bet amount must be > 0');

    const user = await this.deductBalance(userId, betAmount, walletType);
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const nonce = this.getNextNonce(userId);
    const crashPoint = generateLimboResult(serverSeed, nonce);

    const bet = await this.betModel.create({
      userId, betAmount, targetMultiplier: 0, resultMultiplier: crashPoint,
      result: 'ACTIVE', payout: 0, walletType,
      currency: walletType === 'crypto' ? 'USD' : user.currency || 'INR',
      serverSeed, serverSeedHash, nonce,
    });

    await this.bonusService.recordWagering(userId, betAmount, 'CASINO', walletType === 'crypto' ? 'crypto' : 'main').catch(() => {
      this.bonusService.emitWalletRefresh(userId);
    });

    return {
      betId: String(bet._id),
      crashPoint,
      betAmount,
      serverSeedHash,
      nonce,
    };
  }

  /**
   * Cash out a manual round before the crash point is reached.
   */
  async cashOutManual(userId: number, betId: string, cashoutAt: number) {
    const bet = await this.betModel.findById(betId);
    if (!bet) throw new NotFoundException('Bet not found');
    if (bet.userId !== userId) throw new BadRequestException('Not your bet');
    if (bet.result !== 'ACTIVE') throw new BadRequestException('Bet already resolved');
    if (cashoutAt >= bet.resultMultiplier) throw new BadRequestException('Crash point already passed');
    if (cashoutAt < 1) throw new BadRequestException('Invalid cashout multiplier');

    const payout = parseFloat((bet.betAmount * cashoutAt).toFixed(2));
    bet.result = 'WIN';
    bet.payout = payout;
    bet.cashedOutAt = cashoutAt;
    await bet.save();

    await this.creditPayout(userId, bet.walletType, payout);
    this.bonusService.emitWalletRefresh(userId);

    return { payout, multiplier: cashoutAt, betAmount: bet.betAmount };
  }

  /**
   * Mark a manual bet as lost (called when client-side animation reaches crash point).
   */
  async bustManual(userId: number, betId: string) {
    const bet = await this.betModel.findById(betId);
    if (!bet || bet.userId !== userId || bet.result !== 'ACTIVE') return null;
    bet.result = 'LOSE';
    await bet.save();
    return bet;
  }

  async getUserHistory(userId: number, limit = 30) {
    return this.betModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).select('-serverSeed').lean();
  }
}
