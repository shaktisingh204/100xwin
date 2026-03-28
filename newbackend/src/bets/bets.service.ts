import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { Bet, BetDocument } from './schemas/bet.schema';
import { Market, MarketDocument } from '../sports/schemas/market.schema';
import { Event, EventDocument } from '../sports/schemas/event.schema';
import { SportsSocketService } from '../sports/sports.socket.service';
import { ReferralService } from '../referral/referral.service';
import { BonusService } from '../bonus/bonus.service';
import {
  calculatePotentialWinAmount,
  getRateFromSize,
  isDecimalPriceMarket,
} from './bet-pricing.util';
import { PlaceBetDto } from './dto/place-bet.dto';

type BetWalletField = 'balance' | 'cryptoBalance' | 'sportsBonus';
type BetPayoutAllocation = {
  walletField: BetWalletField;
  walletLabel: string;
  amount: number;
};

type MarketQuote = {
  odds: number | null;
  rate: number | null;
};

const BET_PLACE_RATE_LIMIT = 12;
const BET_PLACE_RATE_WINDOW_SECS = 10;
const BET_PLACE_LOCK_TTL_SECS = 5;
const BET_CASHOUT_RATE_LIMIT = 15;
const BET_CASHOUT_RATE_WINDOW_SECS = 10;
const BET_CASHOUT_LOCK_TTL_SECS = 5;

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);
  private readonly SPORTS_BASE_URL = (
    process.env.SPORTS_BASE_URL ||
    'https://zeero.bet'
  ).replace(/\/$/, '');
  private readonly SPORTS_API_KEY =
    process.env.SPORTS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    @InjectModel(Bet.name) private betModel: Model<BetDocument>,
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private referralService: ReferralService,
    private sportsSocketService: SportsSocketService,
    @Inject(forwardRef(() => BonusService)) private bonusService: BonusService,
  ) {}

  private isCashoutSupportedMarket(market: {
    gtype?: string | null;
    market_type?: string | null;
    market_name?: string | null;
    mname?: string | null;
  } | null | undefined): boolean {
    if (!market) return false;

    const marketType = String(
      market.gtype || market.market_type || '',
    ).toLowerCase();
    const marketName = String(
      market.market_name || market.mname || '',
    ).toLowerCase();

    const isBookmaker =
      marketType === 'bookmaker' ||
      marketType === 'special' ||
      marketType === 'bm' ||
      marketName.includes('bookmaker') ||
      marketName.includes('book maker');

    const isMatchOdds =
      marketName.includes('match_odds') ||
      marketName.includes('match odds') ||
      marketName === 'matchodds';

    return isMatchOdds || isBookmaker;
  }

  async placeBet(userId: number, betData: PlaceBetDto) {
    const placementLockKey = this.buildPlacementLockKey(userId, betData);

    await this.enforceRateLimit(
      `bet_place_rl:${userId}`,
      BET_PLACE_RATE_LIMIT,
      BET_PLACE_RATE_WINDOW_SECS,
      `Too many bet placement attempts. Max ${BET_PLACE_RATE_LIMIT} per ${BET_PLACE_RATE_WINDOW_SECS}s.`,
    );
    await this.acquireActionLock(
      placementLockKey,
      BET_PLACE_LOCK_TTL_SECS,
      'Duplicate bet submission detected. Please wait a moment and try again.',
    );

    try {
      // --- 4-LAYER SECURITY VALIDATION ---

      // 1. Fetch Market from DB (Layer 1 & 2 Source)
      const market = await this.marketModel.findOne({
        market_id: betData.marketId,
      });
      if (!market) throw new BadRequestException('Market not found');

      const canonicalEventId = this.normalizeText(
        (market as any).event_id || betData.eventId,
      );
      if (!canonicalEventId) {
        throw new BadRequestException('Market event is unavailable');
      }

      const requestedEventId = this.normalizeText(betData.eventId);
      if (requestedEventId && requestedEventId !== canonicalEventId) {
        throw new BadRequestException('Market does not belong to the requested event');
      }

      const canonicalSelectionId = this.normalizeText(betData.selectionId);
      const runner = this.findRunnerBySelectionId(market as any, canonicalSelectionId);
      const canonicalSelectionName = this.getRunnerDisplayName(runner);
      if (!canonicalSelectionName) {
        throw new BadRequestException('Selection not found in market');
      }

      const canonicalMarketName = this.normalizeText(
        (market as any).market_name || (market as any).mname || 'Market',
      );

    // Layer 1: Status Check
    if (!market.is_active || market.status !== 'OPEN') {
      // Allow 'OPEN' or specific internal status.
      // If local status is 'SUSPENDED', reject.
      if (market.status === 'SUSPENDED' || market.status === 'CLOSED') {
        throw new BadRequestException('Market is suspended or closed');
      }
    }

    // ── Layer 0: Bet Limits (mirrors kuber min/max logic) ─────────────────────
    const stake = Number(betData.stake);
    if (!stake || stake < 1) {
      throw new BadRequestException('Minimum bet stake is ₹1');
    }
    const marketType =
      (market as any).gtype || (market as any).market_type || 'match';
    const isSession =
      marketType.toLowerCase() === 'session' ||
      marketType.toLowerCase() === 'fancy';
    const isBookmaker =
      marketType.toLowerCase() === 'special' ||
      marketType.toLowerCase() === 'bookmaker';

    // Read per-market limits stored on Market document
    const mktAny = market as any;
    let minBet = 1;
    let maxBet = 999999999;
    if (isSession) {
      if (mktAny.session_minlimit > 0) minBet = mktAny.session_minlimit;
      if (mktAny.session_maxlimit > 0) maxBet = mktAny.session_maxlimit;
    } else if (isBookmaker) {
      if (mktAny.bookmaker_minlimit > 0) minBet = mktAny.bookmaker_minlimit;
      if (mktAny.bookmaker_maxlimit > 0) maxBet = mktAny.bookmaker_maxlimit;
    } else {
      if (mktAny.machodds_minlimit > 0) minBet = mktAny.machodds_minlimit;
      if (mktAny.matchodd_maxlimit > 0) maxBet = mktAny.matchodd_maxlimit;
    }

    if (stake < minBet) {
      throw new BadRequestException(
        `Minimum bet for this market is ₹${minBet}`,
      );
    }
    if (stake > maxBet) {
      throw new BadRequestException(
        `Maximum bet for this market is ₹${maxBet}`,
      );
    }

    // Lay liability validation (kuber: lay liability must be >= 1)
    const betTypeNorm = (
      betData.betType ||
      betData.type ||
      'back'
    ).toLowerCase();
    if (betTypeNorm === 'lay') {
      const requestedOdds = Number(betData.odds);
      const liability = Math.round(stake * (requestedOdds - 1));
      if (liability < 1) {
        throw new BadRequestException('Lay liability must be at least ₹1');
      }
    }

    // Layer 1.5: Event Status Check
    const event = await this.eventModel.findOne({ event_id: canonicalEventId });
    const canonicalEventName = this.normalizeText(
      event?.event_name || (market as any).event_name || 'Event',
    );

    if (event && event.match_status === 'Completed') {
      throw new BadRequestException(
        'Match is completed. Betting is suspended.',
      );
    }

    // Layer 2: DB Odds Validation (Optional but recommended)
    // Check if cached DB odds match requested odds within tolerance?
    // DB might be slightly stale compared to socket, so we leniency or skip if Socket is primary.
    // Let's rely on Socket for strictness, but DB for sanity check if Socket is empty.

    // Layer 3: Socket/Live Odds Validation & Layer 4: LTR/Best Price Check
    const liveData = this.sportsSocketService.getLiveOdds(betData.marketId);

    if (liveData) {
      // Check based on Market Type logic
      // 1. Match Odds (Back/Lay)
      if (betTypeNorm === 'back' || betTypeNorm === 'lay') {
        const isBack = betTypeNorm === 'back';
        const requestedOdds = Number(betData.odds);
        const selectionId = canonicalSelectionId;

        // Match Odds Logic (Runners in 'rt' or 'data')
        // liveData might be the update object itself or containing 'rt'.
        // Based on `SportsSocketService` cache logic: `this.marketCache.set(String(parsed.id), parsed);`
        // parsed usually has `rt`.

        let bestPrice = 0;
        let found = false;

        if (Array.isArray(liveData.rt)) {
          // Filter updates for this runner
          const runnerUpdates = liveData.rt.filter(
            (r: any) =>
              String(r.ri) === String(selectionId) ||
              String(r.id) === String(selectionId) ||
              String(r.selectionId) === String(selectionId),
          );

          if (runnerUpdates.length > 0) {
            found = true;
            // Sort to find best price
            // Backs: Higher is better. Lays: Lower is better.
            if (isBack) {
              const hacks = runnerUpdates.filter(
                (r: any) => r.ib === true || r.type === 'back',
              );
              if (hacks.length > 0) {
                // Sort descending
                hacks.sort((a, b) => (a.rt || a.pr || 0) - (b.rt || b.pr || 0));
                bestPrice = parseFloat(hacks[0].rt || hacks[0].pr || 0);
              }
            } else {
              const lays = runnerUpdates.filter(
                (r: any) => !r.ib || r.type === 'lay',
              );
              if (lays.length > 0) {
                // Sort ascending
                lays.sort((a, b) => (a.rt || a.pr || 0) - (b.rt || b.pr || 0));
                bestPrice = parseFloat(lays[0].rt || lays[0].pr || 0);
              }
            }
          }
        }
        // Session/Fancy Logic (b1, l1)
        else if (liveData.b1 !== undefined || liveData.l1 !== undefined) {
          // Assuming this is the market update itself (Session/Fancy)
          found = true;
          if (isBack) {
            bestPrice = parseFloat(liveData.b1 || liveData.BackPrice1 || 0);
          } else {
            bestPrice = parseFloat(liveData.l1 || liveData.LayPrice1 || 0);
          }
        }

        // VALIDATION
        if (found && bestPrice > 0) {
          // Tolerance check involves allowing small slip or checking strictly.
          // "LTR Check before bet placement":
          // If Backing: Requested <= BestPrice (You can match if you ask for less or equal)
          // If Laying: Requested >= BestPrice (You can match if you ask for more or equal)

          // However, users usually click the Best Price.
          // If price moved AGAINST them, reject.
          // Back: Price dropped below requested? REJECT.
          // Lay: Price rose above requested? REJECT.

          // Tolerance: 0 for now (Strict)
          if (isBack) {
            if (bestPrice < requestedOdds) {
              // E.g. Asked 2.0, Best is 1.9 -> Reject
              throw new BadRequestException(
                `Odds changed. Best available: ${bestPrice}`,
              );
            }
          } else {
            if (bestPrice > requestedOdds) {
              // E.g. Asked 2.0, Best is 2.1 -> Reject
              throw new BadRequestException(
                `Odds changed. Best available: ${bestPrice}`,
              );
            }
          }
        }
      }
    }

    const pricingMarketType =
      (market as any).gtype || (market as any).market_type;
    const pricingMarketName =
      (market as any).market_name ||
      (market as any).mname ||
      canonicalMarketName;
    const resolvedQuote =
      this.extractCurrentQuoteFromMarket(
        liveData,
        canonicalSelectionId,
        betTypeNorm,
      ) ??
      this.extractCurrentQuoteFromMarket(
        market as any,
        canonicalSelectionId,
        betTypeNorm,
      );
    const fallbackRate = this.parsePositiveOdds(betData.rate);
    const resolvedRate = resolvedQuote?.rate ?? fallbackRate;
    if (
      resolvedQuote?.odds &&
      Math.abs(Number(betData.odds || 0) - resolvedQuote.odds) > 0.05
    ) {
      throw new BadRequestException(
        `Odds changed. Best available: ${resolvedQuote.odds}`,
      );
    }
    const usesDecimalPricing = isDecimalPriceMarket({
      marketType: pricingMarketType,
      marketName: pricingMarketName,
    });

    if (!usesDecimalPricing && !resolvedRate) {
      throw new BadRequestException(
        'Unable to resolve the market payout rate. Please refresh and try again.',
      );
    }

    const computedPotentialWin = calculatePotentialWinAmount({
      stake,
      odds: Number(betData.odds || 0),
      rate: resolvedRate,
      marketType: pricingMarketType,
      marketName: pricingMarketName,
    });

    // Layer 4: Tolerance Check
    // If we found a "reference price" (from DB or Socket), check difference.
    // const requestedOdds = parseFloat(betData.odds);
    // if (referencePrice) {
    //    const diff = Math.abs(requestedOdds - referencePrice);
    //    if (diff > 0.05) throw new BadRequestException('Odds have changed');
    // }

    // --- END SECURITY CHECKS ---

    // ── Pre-compute market details for Diamond API result fetching ─────────
    // (must be outside Prisma transaction since it queries MongoDB)
    const _mktDoc = market as any; // mname/nat/gtype exist at runtime but not in typed Market schema
    const _rawGtype = (
      _mktDoc?.gtype ||
      _mktDoc?.market_type ||
      'match'
    ).toLowerCase();
    const _mname = _mktDoc?.mname || 'NORMAL';
    const _nat = _mktDoc?.nat || canonicalMarketName || '';
    const _section = _mktDoc?.runners_data || [];
    const _computedMarketName =
      this.getMarketNameFromGtype({
        mname: _mname,
        gtype: _rawGtype,
        nat: _nat,
        section: _section,
      }) || _nat;
    // ──────────────────────────────────────────────────────────────────────

    // 1. Transactional Bet Placement
    const result = await this.prisma.$transaction(async (prisma) => {
      // A. Validate User & Balance
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('User not found');

      // Wallet routing:
      //   If user has active sportsBonus → deduct stake from sportsBonus first,
      //   then fall back to main balance for any remainder.
      const walletType: 'fiat' | 'crypto' =
        betData.walletType === 'crypto' ? 'crypto' : 'fiat';
      const balanceField =
        walletType === 'crypto' ? 'cryptoBalance' : 'balance';
      const currentBalance =
        walletType === 'crypto'
          ? ((user as any).cryptoBalance ?? 0)
          : (user.balance ?? 0);
      const currentSportsBonus: number = (user as any).sportsBonus ?? 0;

      // Check if user has selected the sports bonus for betting (isEnabled=true)
      // Only look up DB if there's actually a sports bonus balance (avoid unnecessary query)
      const activeSportsBonusRow =
        currentSportsBonus > 0 && walletType === 'fiat'
          ? await (this.prisma as any).userBonus.findFirst({
              where: {
                userId,
                status: 'ACTIVE',
                applicableTo: { in: ['SPORTS', 'BOTH'] },
              },
              select: { isEnabled: true },
            })
          : null;
      const isSportsBonusSelected = activeSportsBonusRow?.isEnabled !== false; // default true if no row

      // Determine how much to pull from sportsBonus vs main balance
      const stakeFromBonus =
        walletType === 'fiat' && isSportsBonusSelected
          ? Math.min(currentSportsBonus, stake)
          : 0;
      const stakeFromBalance = stake - stakeFromBonus;
      const betSource =
        stakeFromBonus > 0
          ? stakeFromBonus >= stake
            ? 'sportsBonus'
            : 'sportsBonus+balance'
          : 'balance';

      if (stakeFromBalance > currentBalance) {
        throw new BadRequestException(
          walletType === 'crypto'
            ? `Insufficient crypto balance ($${currentBalance.toFixed(2)} available)`
            : `Insufficient balance. Bonus: ₹${currentSportsBonus.toFixed(2)}, Main: ₹${currentBalance.toFixed(2)}. Needed: ₹${stake}`,
        );
      }

      const txRemarks =
        stakeFromBonus > 0
          ? `Bet on ${canonicalEventName} - ${canonicalSelectionName} [Bonus ₹${stakeFromBonus.toFixed(2)} + Balance ₹${stakeFromBalance.toFixed(2)}]`
          : `Bet on ${canonicalEventName} - ${canonicalSelectionName} [${walletType.toUpperCase()} wallet]`;

      // B. Create Transaction Record (Deduction)
      await prisma.transaction.create({
        data: {
          userId,
          amount: stake,
          type: 'BET_PLACE',
          status: 'COMPLETED',
          paymentMethod:
            walletType === 'crypto' ? 'CRYPTO_WALLET' : 'FIAT_WALLET',
          remarks: txRemarks,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // C. Deduct from sportsBonus first, then main balance; also update Exposure
      const deductData: any = { exposure: { increment: stake } };
      if (stakeFromBonus > 0)
        deductData.sportsBonus = { decrement: stakeFromBonus };
      if (stakeFromBalance > 0)
        deductData[balanceField] = { decrement: stakeFromBalance };
      await prisma.user.update({
        where: { id: userId },
        data: deductData,
      });

      // D. Create Bet in MongoDB (store walletType for settlement)
      try {
        const bet = await new this.betModel({
          userId,
          eventId: canonicalEventId,
          matchId: canonicalEventId,
          eventName: canonicalEventName,
          marketId: betData.marketId,
          marketName: canonicalMarketName,
          selectionId: canonicalSelectionId,
          selectionName: canonicalSelectionName,
          selectedTeam: canonicalSelectionName,
          odds: betData.odds,
          stake,
          originalStake: stake,
          potentialWin: computedPotentialWin,
          originalPotentialWin: computedPotentialWin,
          status: 'PENDING',
          betType: (betData.betType || betData.type || 'back').toLowerCase(),
          walletType,
          betSource, // 'balance' | 'sportsBonus' | 'sportsBonus+balance'
          bonusStakeAmount: this.roundCurrency(stakeFromBonus),
          walletStakeAmount: this.roundCurrency(stakeFromBalance),
          cashoutEnabled: this.isCashoutSupportedMarket(market as any),
          partialCashoutValue: 0,
          partialCashoutCount: 0,
          placedAt: new Date(),
          // ── Diamond API market details (for result fetching) ──────
          gtype: _rawGtype,
          mname: _mname,
          nat: _nat,
          computedMarketName: _computedMarketName,
          // ─────────────────────────────────────────────────────────
        }).save();

        await this.redis.sadd(`active_bets:${userId}`, bet._id.toString());
        return { ...bet.toObject(), id: bet._id.toString() };
      } catch (mongoError) {
        throw new BadRequestException(
          'Failed to place bet record. Please try again.',
        );
      }
    });

    // 2. Referral Trigger (Fire and Forget or Await)
    try {
      // Calculate total volume for this user
      const aggregation = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'BET_PLACE',
          status: 'COMPLETED',
        },
      });
      const totalVolume = aggregation._sum.amount || 0;

      await this.referralService.checkAndAward(
        userId,
        'BET_VOLUME',
        totalVolume,
      );
    } catch (e) {
      console.error('Referral check failed for bet', e);
    }

    // ── Real-time wagering turnover tracking ──────────────────────────────
    try {
      // betSource is stored on the bet doc inside the transaction — read it from the result
      const resolvedBetSource: string = (result as any).betSource || 'balance';
      await this.bonusService.recordWagering(userId, stake, 'SPORTS', resolvedBetSource);
    } catch (e) {
      console.error('[BonusWagering] Failed for user', userId, e);
      this.bonusService.emitWalletRefresh(userId);
    }

    // 3. Notify Diamond API about this market (fire-and-forget — never blocks)
    this.postMarketToDiamond(
      {
        ...betData,
        eventId: canonicalEventId,
        eventName: canonicalEventName,
        marketName: canonicalMarketName,
        selectionId: canonicalSelectionId,
        selectionName: canonicalSelectionName,
      },
      event,
    ).catch(() => {
      /* already logged */
    });

    return result;
    } catch (error) {
      await this.releaseActionLock(placementLockKey);
      throw error;
    }
  }

  // ── Port of turnkeyxgaming's getMarketNameFromGtype ──────────────────────
  private getMarketNameFromGtype({
    mname,
    gtype,
    nat,
    section,
  }: {
    mname?: string;
    gtype?: string;
    nat?: string;
    section?: any[];
  }): string | null {
    if (!mname || !gtype) return null;

    // 1. MATCH / MATCH1 — join runner nat fields with " vs "
    if (gtype === 'match' || gtype === 'match1') {
      const sections = Array.isArray(section) ? section : [];
      const runnerNames = sections
        .map((s: any) => s?.nat?.trim())
        .filter(Boolean);
      if (runnerNames.length === 0) return null;
      return runnerNames.length > 1 ? runnerNames.join(' vs ') : runnerNames[0];
    }

    // 2. ALL OTHER TYPES — nat is the market name
    if (!nat || typeof nat !== 'string') return null;
    return nat.trim();
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findRunnerBySelectionId(market: any, selectionId: string): any | null {
    const normalizedSelectionId = this.normalizeText(selectionId);
    if (!normalizedSelectionId) return null;

    const runnerCollections = [
      market?.runners_data,
      market?.marketOdds,
      market?.section,
    ];

    for (const runners of runnerCollections) {
      if (!Array.isArray(runners)) continue;

      for (const runner of runners) {
        const runnerId = this.getRunnerSelectionId(runner);
        if (runnerId === normalizedSelectionId) {
          return runner;
        }
      }
    }

    return null;
  }

  private getRunnerDisplayName(runner: any): string | null {
    const candidate = this.normalizeText(
      runner?.nat ??
        runner?.RunnerName ??
        runner?.runnerName ??
        runner?.name ??
        runner?.oname,
    );

    return candidate || null;
  }

  private buildPlacementLockKey(userId: number, betData: PlaceBetDto): string {
    const fingerprint = createHash('sha256')
      .update(
        [
          userId,
          this.normalizeText(betData.clientRequestId),
          this.normalizeText(betData.eventId),
          this.normalizeText(betData.marketId),
          this.normalizeText(betData.selectionId),
          Number(betData.stake || 0).toFixed(2),
          Number(betData.odds || 0).toFixed(2),
          Number(betData.rate || 0).toFixed(2),
          this.normalizeText(betData.betType || betData.type || 'back'),
          this.normalizeText(betData.walletType || 'fiat'),
        ].join('|'),
      )
      .digest('hex');

    return `bet_place_lock:${userId}:${fingerprint}`;
  }

  private async enforceRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    message: string,
  ) {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();
    const currentCount = Number(results?.[0]?.[1] || 0);

    if (currentCount > limit) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async acquireActionLock(
    key: string,
    ttlSeconds: number,
    message: string,
  ) {
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    if (result !== 'OK') {
      throw new ConflictException(message);
    }
  }

  private async releaseActionLock(key?: string | null) {
    if (!key) return;

    try {
      await this.redis.del(key);
    } catch {
      // Best-effort cleanup only.
    }
  }

  private roundCurrency(value: number): number {
    return parseFloat(Number(value || 0).toFixed(2));
  }

  private resolveCashoutWalletField(
    bet: Pick<BetDocument, 'walletType' | 'betSource'>,
  ): BetWalletField {
    const betSource = String((bet as any).betSource || '');
    if (betSource.includes('sportsBonus')) {
      return 'sportsBonus';
    }

    return bet.walletType === 'crypto' ? 'cryptoBalance' : 'balance';
  }

  private getPrimaryWalletField(
    walletType: string | null | undefined,
  ): BetWalletField {
    return walletType === 'crypto' ? 'cryptoBalance' : 'balance';
  }

  private mapWalletFieldToPaymentMethod(walletField: BetWalletField) {
    if (walletField === 'sportsBonus') {
      return 'BONUS_WALLET';
    }

    return walletField === 'cryptoBalance' ? 'CRYPTO_WALLET' : 'MAIN_WALLET';
  }

  private getWalletFieldLabel(walletField: BetWalletField) {
    if (walletField === 'sportsBonus') {
      return 'Sports Bonus Wallet';
    }

    return walletField === 'cryptoBalance' ? 'Crypto Wallet' : 'Main Wallet';
  }

  private getBetOriginalStake(
    bet: Pick<BetDocument, 'originalStake' | 'stake'>,
  ): number {
    return this.roundCurrency((bet as any).originalStake ?? bet.stake ?? 0);
  }

  private getBetOriginalPotentialWin(
    bet: Pick<BetDocument, 'originalPotentialWin' | 'potentialWin'>,
  ): number {
    return this.roundCurrency(
      (bet as any).originalPotentialWin ?? bet.potentialWin ?? 0,
    );
  }

  private getBetPartialCashoutValue(
    bet: Pick<BetDocument, 'partialCashoutValue'>,
  ): number {
    return this.roundCurrency((bet as any).partialCashoutValue ?? 0);
  }

  private normalizeCashoutValue(
    bet: Pick<BetDocument, 'potentialWin'>,
    proposedValue: number,
  ): number {
    return this.roundCurrency(
      Math.min(
        this.roundCurrency(Math.max(0, proposedValue)),
        this.roundCurrency(Math.max(0, Number(bet.potentialWin || 0))),
      ),
    );
  }

  private calculateBaseCashoutValue(
    bet: Pick<BetDocument, 'odds' | 'stake' | 'potentialWin'>,
    currentOdds: number,
  ): number {
    const originalOdds = Number(bet.odds || 0);
    const currentStake = this.roundCurrency(Number(bet.stake || 0));

    if (currentStake <= 0 || currentOdds <= 1 || originalOdds <= 1) {
      return 0;
    }

    // 30% odds move -> 10% cashout move, then apply a 5% house cut.
    // Examples:
    //   2.0 -> 1.4  => +10% cashout, then 5% cut
    //   2.0 -> 2.6  => -10% cashout, then 5% cut
    const oddsChangePercent = (currentOdds - originalOdds) / originalOdds;
    const cashoutAdjustmentPercent = -oddsChangePercent / 3;
    const houseCut = 0.95;

    return this.roundCurrency(
      currentStake * (1 + cashoutAdjustmentPercent) * houseCut,
    );
  }

  private getBetBonusStakeAmount(
    bet: Pick<BetDocument, 'betSource' | 'originalStake' | 'stake'>,
  ): number {
    const storedBonusStake = this.roundCurrency(
      Number((bet as any).bonusStakeAmount ?? 0),
    );
    if (storedBonusStake > 0) {
      return storedBonusStake;
    }

    const betSource = String((bet as any).betSource || '');
    return betSource.includes('sportsBonus')
      ? this.getBetOriginalStake(bet)
      : 0;
  }

  private buildBetPayoutAllocations(
    bet: Pick<
      BetDocument,
      'walletType' | 'betSource' | 'originalStake' | 'stake'
    >,
    amount: number,
  ): BetPayoutAllocation[] {
    const payoutAmount = this.roundCurrency(amount);
    if (payoutAmount <= 0) {
      return [];
    }

    const primaryWalletField = this.getPrimaryWalletField(bet.walletType);
    const originalStake = this.getBetOriginalStake(bet);
    const bonusStakeAmount = Math.min(
      originalStake,
      this.getBetBonusStakeAmount(bet),
    );
    const walletStakeAmount = this.roundCurrency(
      Math.max(0, originalStake - bonusStakeAmount),
    );

    if (bonusStakeAmount <= 0 || originalStake <= 0) {
      return [
        {
          walletField: primaryWalletField,
          walletLabel: this.getWalletFieldLabel(primaryWalletField),
          amount: payoutAmount,
        },
      ];
    }

    if (walletStakeAmount <= 0) {
      return [
        {
          walletField: 'sportsBonus',
          walletLabel: this.getWalletFieldLabel('sportsBonus'),
          amount: payoutAmount,
        },
      ];
    }

    const bonusPayout = this.roundCurrency(
      (payoutAmount * bonusStakeAmount) / originalStake,
    );
    const walletPayout = this.roundCurrency(payoutAmount - bonusPayout);

    const allocations: BetPayoutAllocation[] = [
      {
        walletField: 'sportsBonus',
        walletLabel: this.getWalletFieldLabel('sportsBonus'),
        amount: bonusPayout,
      },
      {
        walletField: primaryWalletField,
        walletLabel: this.getWalletFieldLabel(primaryWalletField),
        amount: walletPayout,
      },
    ];

    return allocations.filter((allocation) => allocation.amount > 0);
  }

  private isEventPreMatch(
    event: Pick<EventDocument, 'match_status'> | null | undefined,
  ): boolean {
    if (!event) return false;
    const status = String(event?.match_status || '')
      .trim()
      .toUpperCase();
    return ![
      'INPLAY',
      'IN PLAY',
      'LIVE',
      'COMPLETED',
      'ENDED',
      'FINISHED',
      'ABANDONED',
    ].includes(status);
  }

  private matchesMarketId(candidateId: unknown, marketId: string): boolean {
    if (candidateId === null || candidateId === undefined) return false;
    const candidate = String(candidateId);
    return candidate === marketId || marketId.endsWith(`_${candidate}`);
  }

  private isExplicitOpenState(value: unknown): boolean {
    if (value === 1 || value === 9) return true;
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    return (
      normalized === '1' ||
      normalized === '9' ||
      normalized === 'OPEN' ||
      normalized === 'ACTIVE' ||
      normalized === 'BALL RUNNING'
    );
  }

  private isExplicitSuspendedState(value: unknown): boolean {
    if (value === 2 || value === 3 || value === 4) return true;
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    return ['2', '3', '4', 'SUSPENDED', 'CLOSED', 'INACTIVE'].includes(
      normalized,
    );
  }

  private isMarketSuspended(market: any): boolean {
    if (!market) return true;

    const status = market?.status ?? market?.market_status;
    const marketStatus =
      market?.marketStatus ?? market?.ms ?? market?.source_market_status_id;

    if (
      this.isExplicitSuspendedState(status) ||
      this.isExplicitSuspendedState(marketStatus)
    ) {
      return true;
    }

    if (market?.is_active === false) {
      const explicitlyOpen =
        this.isExplicitOpenState(status) ||
        this.isExplicitOpenState(marketStatus);
      if (!explicitlyOpen) {
        return true;
      }
    }

    return false;
  }

  private parsePositiveOdds(value: unknown): number | null {
    const parsed = parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) && parsed > 1 ? parsed : null;
  }

  private parsePositiveSize(value: unknown): number | null {
    const parsed = parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private pickBestQuote(entries: any[], betType: string): MarketQuote | null {
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const wantsBack = betType !== 'lay';
    const quotes = entries
      .filter((entry: any) => {
        if (entry?.ib === true) return wantsBack;
        if (entry?.ib === false) return !wantsBack;

        const entryType = String(
          entry?.otype ?? entry?.type ?? entry?.side ?? '',
        ).toLowerCase();
        if (entryType === 'back') return wantsBack;
        if (entryType === 'lay') return !wantsBack;

        return false;
      })
      .map((entry: any, index: number) => {
        const odds = this.parsePositiveOdds(
          entry?.odds ?? entry?.rt ?? entry?.price,
        );
        if (!odds) return null;

        const size = this.parsePositiveSize(
          entry?.size ?? entry?.bv ?? entry?.amount ?? entry?.volume,
        );
        const levelCandidate =
          entry?.tno ?? entry?.pr ?? entry?.level ?? entry?.position;
        const level = Number.isFinite(Number(levelCandidate))
          ? Number(levelCandidate)
          : index;

        return { odds, rate: getRateFromSize(size), level };
      })
      .filter(Boolean) as Array<MarketQuote & { level: number }>;

    if (quotes.length === 0) return null;

    quotes.sort((a, b) => a.level - b.level);
    return {
      odds: quotes[0].odds,
      rate: quotes[0].rate,
    };
  }

  private pickBestBackOdds(entries: any[]): number | null {
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const backs = entries
      .filter(
        (entry: any) =>
          entry?.ib === true ||
          entry?.otype === 'back' ||
          entry?.type === 'back',
      )
      .map((entry: any, index: number) => {
        const price = this.parsePositiveOdds(
          entry?.odds ?? entry?.rt ?? entry?.price,
        );
        const level = Number.isFinite(Number(entry?.pr))
          ? Number(entry.pr)
          : index;
        return price ? { price, level } : null;
      })
      .filter(Boolean) as { price: number; level: number }[];

    if (backs.length === 0) return null;

    backs.sort((a, b) => a.level - b.level);
    return backs[0].price;
  }

  private getRunnerSelectionId(runner: any): string | null {
    const rawId =
      runner?.sid ??
      runner?.selectionId ??
      runner?.selection_id ??
      runner?.id ??
      runner?.ri ??
      runner?.RunnerID;

    if (rawId === null || rawId === undefined || rawId === '') return null;
    return String(rawId);
  }

  private extractOddsFromRunner(runner: any): number | null {
    const oddsFromArray = this.pickBestBackOdds(
      Array.isArray(runner?.odds) ? runner.odds : [],
    );
    if (oddsFromArray) return oddsFromArray;

    const oddsFromBackArray = this.pickBestBackOdds(
      Array.isArray(runner?.back)
        ? runner.back.map((entry: any) => ({
            ...entry,
            otype: 'back',
          }))
        : [],
    );
    if (oddsFromBackArray) return oddsFromBackArray;

    const directBack =
      this.parsePositiveOdds(runner?.back1) ??
      this.parsePositiveOdds(runner?.b1) ??
      this.parsePositiveOdds(runner?.BackPrice1) ??
      this.parsePositiveOdds(runner?.back0_price) ??
      this.parsePositiveOdds(runner?.back1_price) ??
      this.parsePositiveOdds(runner?.back2_price);
    if (directBack) return directBack;

    return (
      this.parsePositiveOdds(runner?.ltp) ??
      this.parsePositiveOdds(runner?.LTP) ??
      this.parsePositiveOdds(runner?.LastPrice)
    );
  }

  private extractQuoteFromRunner(
    runner: any,
    betType: string,
  ): MarketQuote | null {
    const oddsQuote = this.pickBestQuote(
      Array.isArray(runner?.odds) ? runner.odds : [],
      betType,
    );
    if (oddsQuote) return oddsQuote;

    const directionalEntries = Array.isArray(
      betType === 'lay' ? runner?.lay : runner?.back,
    )
      ? (betType === 'lay' ? runner.lay : runner.back).map((entry: any) => ({
          ...entry,
          otype: betType,
        }))
      : [];
    const directionalQuote = this.pickBestQuote(directionalEntries, betType);
    if (directionalQuote) return directionalQuote;

    const price = [
      betType === 'lay' ? runner?.lay1 : runner?.back1,
      betType === 'lay' ? runner?.l1 : runner?.b1,
      betType === 'lay' ? runner?.LayPrice1 : runner?.BackPrice1,
      betType === 'lay' ? runner?.lay0_price : runner?.back0_price,
      betType === 'lay' ? runner?.lay1_price : runner?.back1_price,
      betType === 'lay' ? runner?.lay2_price : runner?.back2_price,
    ]
      .map((value) => this.parsePositiveOdds(value))
      .find(Boolean);

    if (!price) return null;

    const size = [
      betType === 'lay' ? runner?.ls1 : runner?.bs1,
      betType === 'lay' ? runner?.lay0_size : runner?.back0_size,
      betType === 'lay' ? runner?.lay1_size : runner?.back1_size,
      betType === 'lay' ? runner?.lay2_size : runner?.back2_size,
      betType === 'lay' ? runner?.ls : runner?.bs,
    ]
      .map((value) => this.parsePositiveSize(value))
      .find(Boolean);

    return {
      odds: price,
      rate: getRateFromSize(size),
    };
  }

  private extractCurrentOddsFromMarket(
    market: any,
    selectionId: string,
  ): number | null {
    if (!market) return null;

    if (Array.isArray(market?.rt)) {
      const matchingUpdates = (market.rt || []).filter((runner: any) => {
        const runnerId = this.getRunnerSelectionId(runner);
        return runnerId !== null && runnerId === String(selectionId);
      });

      const socketPrice = this.pickBestBackOdds(matchingUpdates);
      if (socketPrice) return socketPrice;
    }

    const runnerCollections = [
      market?.section,
      market?.runners_data,
      market?.marketOdds,
    ];
    for (const runners of runnerCollections) {
      if (!Array.isArray(runners)) continue;

      for (const runner of runners) {
        const runnerId = this.getRunnerSelectionId(runner);
        if (runnerId !== String(selectionId)) continue;

        const price = this.extractOddsFromRunner(runner);
        if (price) return price;
      }
    }

    return (
      this.parsePositiveOdds(market?.b1) ??
      this.parsePositiveOdds(market?.BackPrice1)
    );
  }

  private extractCurrentQuoteFromMarket(
    market: any,
    selectionId: string,
    betType: string,
  ): MarketQuote | null {
    if (!market) return null;

    if (Array.isArray(market?.rt)) {
      const matchingUpdates = (market.rt || []).filter((runner: any) => {
        const runnerId = this.getRunnerSelectionId(runner);
        return runnerId !== null && runnerId === String(selectionId);
      });

      const socketQuote = this.pickBestQuote(matchingUpdates, betType);
      if (socketQuote) return socketQuote;
    }

    const runnerCollections = [
      market?.section,
      market?.runners_data,
      market?.marketOdds,
    ];
    for (const runners of runnerCollections) {
      if (!Array.isArray(runners)) continue;

      for (const runner of runners) {
        const runnerId = this.getRunnerSelectionId(runner);
        if (runnerId !== String(selectionId)) continue;

        const quote = this.extractQuoteFromRunner(runner, betType);
        if (quote) return quote;
      }
    }

    const fallbackOdds =
      betType === 'lay'
        ? this.parsePositiveOdds(market?.l1) ??
          this.parsePositiveOdds(market?.LayPrice1)
        : this.parsePositiveOdds(market?.b1) ??
          this.parsePositiveOdds(market?.BackPrice1);

    if (!fallbackOdds) return null;

    const fallbackSize =
      betType === 'lay'
        ? this.parsePositiveSize(market?.ls1)
        : this.parsePositiveSize(market?.bs1);

    return {
      odds: fallbackOdds,
      rate: getRateFromSize(fallbackSize),
    };
  }

  private findMatchingMarket(markets: any[], marketId: string): any | null {
    if (!Array.isArray(markets)) return null;

    return (
      markets.find((market: any) => {
        const candidateIds = [
          market?.mid,
          market?.market_id,
          market?.id,
          market?.bmi,
        ];
        return candidateIds.some((candidateId) =>
          this.matchesMarketId(candidateId, marketId),
        );
      }) || null
    );
  }

  private async loadEventMarketsSnapshot(
    eventId: string,
  ): Promise<any[] | null> {
    if (!eventId) return null;

    try {
      const cached = await this.redis.get(`odds:${eventId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Best-effort only: cashout should still work off MongoDB when Redis misses.
    }

    try {
      const event = (await this.eventModel
        .findOne({ event_id: eventId })
        .select('sport_id')
        .lean()) as any;
      const sportId = String(event?.sport_id || 4);
      const url = `${this.SPORTS_BASE_URL}/api/v1/sports/odds?gmid=${eventId}&sportsid=${sportId}`;
      const resp = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'x-turnkeyxgaming-key': this.SPORTS_API_KEY },
          timeout: 3000,
        }),
      );
      const oddsMap = resp.data?.data?.odds;
      const liveMarkets = oddsMap?.[eventId];
      return Array.isArray(liveMarkets) ? liveMarkets : null;
    } catch {
      return null;
    }
  }

  private async resolveCashoutMarketState(
    eventId: string,
    marketId: string,
    selectionId: string,
  ): Promise<{
    market: any | null;
    currentOdds: number | null;
    suspended: boolean;
  }> {
    const socketMarket = this.sportsSocketService.getLiveOdds(marketId);
    if (socketMarket) {
      const currentOdds = this.extractCurrentOddsFromMarket(
        socketMarket,
        selectionId,
      );
      const suspended = this.isMarketSuspended(socketMarket);
      if (currentOdds || suspended) {
        return { market: socketMarket, currentOdds, suspended };
      }
    }

    const liveMarkets = await this.loadEventMarketsSnapshot(eventId);
    const liveMarket = this.findMatchingMarket(liveMarkets || [], marketId);
    if (liveMarket) {
      const currentOdds = this.extractCurrentOddsFromMarket(
        liveMarket,
        selectionId,
      );
      const suspended = this.isMarketSuspended(liveMarket);
      if (currentOdds || suspended) {
        return { market: liveMarket, currentOdds, suspended };
      }
    }

    const dbMarket = await this.marketModel
      .findOne({ market_id: marketId })
      .lean();
    if (!dbMarket) {
      return { market: null, currentOdds: null, suspended: true };
    }

    return {
      market: dbMarket,
      currentOdds: this.extractCurrentOddsFromMarket(dbMarket, selectionId),
      suspended: this.isMarketSuspended(dbMarket),
    };
  }

  /**
   * POST to Diamond API /api/v1/post-market with 3 immediate retries.
   * Uses getMarketNameFromGtype (turnkeyxgaming spec) to build marketName.
   * If all retries fail, saves job to DiamondPostQueue for cron retry.
   */
  private async postMarketToDiamond(betData: any, event: any) {
    // Build payload using getMarketNameFromGtype (provider spec)
    // getMarketNameFromGtype logic (matches frontend):
    //   match/match1  → runners joined " vs "  (section[].nat)
    //   ALL other     → nat  (= bet.selectionName, the exact runner nat the user bet on)
    const sportsId =
      betData.sportsId || event?.sport_id || betData.sportId || 4;
    const market = (await this.marketModel
      .findOne({ market_id: betData.marketId })
      .lean()) as any;
    const rawGtype = (
      betData.gtype ||
      market?.gtype ||
      market?.market_type ||
      'match'
    ).toLowerCase();
    const mname = betData.mname || market?.mname || 'NORMAL';

    // For match/match1: build from runners_data (section)
    // For ALL other types (fancy, session, oddeven, khado, meter, ...):
    //   nat = betData.selectionName  ← this is the runner's nat value from Diamond API
    //   (market.nat doesn't exist at market level — nat is per-section in the API response)
    const isMatchType = rawGtype === 'match' || rawGtype === 'match1';
    const nat = isMatchType
      ? '' // not used for match — section provides the runner names
      : betData.selectionName || betData.marketName || '';
    const section = isMatchType ? market?.runners_data || [] : [];

    const computedName = this.getMarketNameFromGtype({
      mname,
      gtype: rawGtype,
      nat,
      section,
    });
    const marketName =
      computedName || betData.selectionName || betData.marketName || nat || '';

    const payload = {
      sportsid: Number(sportsId),
      gmid: String(betData.eventId),
      marketName,
      mname,
      gtype: rawGtype.toUpperCase(),
    };

    const url = `${this.SPORTS_BASE_URL}/api/v1/post-market`;
    const RETRIES = 3;

    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        this.logger.log(
          `[postMarket] Attempt ${attempt}/${RETRIES} → ${url} ${JSON.stringify(payload)}`,
        );

        const resp = await firstValueFrom(
          this.httpService.post(url, payload, {
            headers: { 'x-turnkeyxgaming-key': this.SPORTS_API_KEY },
            timeout: 5000,
          }),
        );

        this.logger.log(
          `[postMarket] ✓ Success on attempt ${attempt}, gmid=${payload.gmid}, response=${JSON.stringify(resp.data)}`,
        );
        return; // success — done
      } catch (err) {
        const errMsg = err?.response?.data
          ? JSON.stringify(err.response.data).substring(0, 500)
          : err.message;

        this.logger.warn(`[postMarket] Attempt ${attempt} failed: ${errMsg}`);

        if (attempt < RETRIES) {
          // Short exponential back-off: 1s, 2s before next retry
          await new Promise((res) => setTimeout(res, attempt * 1000));
        } else {
          // All inline retries exhausted — persist to queue for cron retry
          try {
            await this.prisma.diamondPostQueue.create({
              data: {
                sportsid: payload.sportsid,
                gmid: payload.gmid,
                marketName: payload.marketName,
                mname: payload.mname,
                gtype: payload.gtype,
                attempts: RETRIES,
                status: 'PENDING',
                lastError: errMsg,
              },
            });
            this.logger.warn(
              `[postMarket] Saved to DiamondPostQueue for cron retry (gmid=${payload.gmid})`,
            );
          } catch (dbErr) {
            this.logger.error(
              `[postMarket] Failed to save to queue: ${dbErr.message}`,
            );
          }
        }
      }
    }
  }

  async getUserBets(userId: number) {
    // Fetch from MongoDB
    const bets = await this.betModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return bets.map((b) => ({ ...b.toObject(), id: b._id.toString() }));
  }

  // --- Admin Methods ---

  async getAllBets(page: number, limit: number, filters: any = {}) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.search) {
      // Can search by betId, username (if we join/store), or eventName
      // Storing username/email on bet would be better for performance, but if not, we rely on what we have
      query.$or = [
        { eventName: { $regex: filters.search, $options: 'i' } },
        { marketName: { $regex: filters.search, $options: 'i' } },
        { selectionName: { $regex: filters.search, $options: 'i' } },
        { _id: { $regex: filters.search, $options: 'i' } }, // searching by ID might need ObjectId casting or string
      ];
    }

    if (Array.isArray(filters.statusIn) && filters.statusIn.length > 0) {
      query.status = { $in: filters.statusIn };
    } else if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.userId) {
      query.userId = Number(filters.userId);
    }

    const [bets, total] = await Promise.all([
      this.betModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.betModel.countDocuments(query),
    ]);

    return {
      bets: bets.map((b) => ({ ...b.toObject(), id: b._id.toString() })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelBet(betId: string, adminId: number) {
    // ... (existing cancelBet code)
    // 1. Find Bet
    const bet = await this.betModel.findById(betId);
    if (!bet) throw new BadRequestException('Bet not found');
    if (bet.status !== 'PENDING')
      throw new BadRequestException('Can only cancel PENDING bets');

    const userId = bet.userId;
    const refundAmount = bet.stake;

    // 2. Transactional Refund
    return await this.prisma.$transaction(async (prisma) => {
      // A. Refund Balance & Reduce Exposure
      await prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: refundAmount },
          exposure: { decrement: refundAmount },
        },
      });

      // B. Create Transaction Record (Refund)
      await prisma.transaction.create({
        data: {
          userId,
          amount: refundAmount,
          type: 'BET_REFUND',
          status: 'COMPLETED',
          remarks: `Bet Voided by Admin (ID: ${betId})`,
          adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // C. Update Bet Status in Mongo
      bet.status = 'VOID';
      // @ts-ignore
      bet.settledReason =
        'Bet was voided by admin and the full stake was refunded.';
      // @ts-ignore
      bet.settledAt = new Date();
      await bet.save();

      // D. Remove from Redis active bets
      await this.redis.srem(`active_bets:${userId}`, betId);

      return { ...bet.toObject(), id: bet._id.toString() };
    });
  }

  async settleMarket(
    marketId: string,
    winningSelectionId: string,
    adminId: number,
  ) {
    // 1. Find all PENDING bets for this market
    const bets = await this.betModel.find({ marketId, status: 'PENDING' });
    const winningSelectionName =
      bets.find((bet) => String(bet.selectionId) === String(winningSelectionId))
        ?.selectionName || winningSelectionId;

    const results = {
      total: bets.length,
      settled: 0,
      errors: 0,
    };

    for (const bet of bets) {
      try {
        const isBack = bet.betType === 'back';
        // Win Condition:
        // If Back: Selection MUST match winningSelectionId
        // If Lay: Selection MUST NOT match winningSelectionId
        // Note: selectionId might be number or string, ensure comparison is safe
        const isSelectionWinner =
          String(bet.selectionId) === String(winningSelectionId);

        const userWins = isBack ? isSelectionWinner : !isSelectionWinner;
        const settledReason = userWins
          ? `Manual market settlement. Winner: ${winningSelectionName}. Your ${isBack ? 'Back' : 'Lay'} selection "${bet.selectionName}" was settled as WON.`
          : `Manual market settlement. Winner: ${winningSelectionName}. Your ${isBack ? 'Back' : 'Lay'} selection "${bet.selectionName}" was settled as LOST.`;

        let payout = 0;
        let status = 'LOST';

        if (userWins) {
          status = 'WON';
          // Assumption: potentialWin includes the stake return for Back bets.
          // For Lay bets (Liability model), potentialWin should be (Liability + BackerStake).
          payout = bet.potentialWin;
        }

        // Database Transaction per bet to ensure consistency
        await this.prisma.$transaction(async (prisma) => {
          // 1. Update User Balance & Exposure
          // Exposure: Always reduce by STAKE (amount risked)
          // Balance: If Won, increment by payout.

          const updateData: any = {
            exposure: { decrement: bet.stake },
          };
          let winWallet: 'balance' | 'cryptoBalance' | 'sportsBonus' =
            'balance';

          if (userWins) {
            // If the stake came from sportsBonus, wins go BACK into sportsBonus
            // (not main balance) until wagering is complete.
            // Only completeBonus() converts accumulated sportsBonus → real balance.
            winWallet = this.resolveCashoutWalletField(bet);
            updateData[winWallet] = { increment: payout };
          }

          await prisma.user.update({
            where: { id: bet.userId },
            data: updateData,
          });

          // 2. Transaction Record if Won
          if (userWins) {
            await prisma.transaction.create({
              data: {
                userId: bet.userId,
                amount: payout,
                type: 'BET_WIN',
                status: 'COMPLETED',
                paymentMethod: this.mapWalletFieldToPaymentMethod(winWallet),
                paymentDetails: {
                  source: 'SPORTS_SETTLEMENT',
                  walletField: winWallet,
                  walletLabel: this.getWalletFieldLabel(winWallet),
                  marketId: bet.marketId,
                },
                remarks: `Won Bet on ${bet.eventName} (${bet.selectionName})`,
                adminId, // System settled initiated by admin
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }

          // 3. Update Mongo Bet
          bet.status = status;
          // @ts-ignore
          bet.settledReason = settledReason;
          // @ts-ignore
          bet.settledAt = new Date();
          await bet.save();

          // 4. Redis Cleanup
          await this.redis.srem(
            `active_bets:${bet.userId}`,
            bet._id.toString(),
          );

          // 5. Socket Event (Optional - Notify User)
          // this.sportsSocketService.notifyUser(bet.userId, 'betSettled', { ... });
        });

        results.settled++;

        this.bonusService.emitWalletRefresh(bet.userId);
      } catch (error) {
        console.error(`Failed to settle bet ${bet._id}:`, error);
        results.errors++;
      }
    }

    return results;
  }

  // ── Cash Out ─────────────────────────────────────────────────────────────

  /**
   * Returns the current cash out offer for a PENDING bet.
   * Does NOT settle anything — read-only.
   *
   * Security layers:
   *  1. Bet exists
   *  2. Caller owns the bet (userId match)
   *  3. Bet is still PENDING
   *  4. Cash out is enabled on this bet
   *  5. Market is not SUSPENDED / CLOSED
   *  6. Live odds are available
   *
   * Product rule:
   *  Cash out moves linearly with the live odds change from the entry price.
   */
  async getCashoutOffer(betId: string, userId: number) {
    // Layer 1: Bet exists
    const bet = await this.betModel.findById(betId);
    if (!bet) throw new BadRequestException('Bet not found');

    // Layer 2: Ownership check (prevents IDOR)
    if (bet.userId !== userId) {
      throw new BadRequestException('Bet not found'); // intentionally vague
    }

    // Layer 3: Must be PENDING
    if (bet.status !== 'PENDING') {
      return {
        betId,
        status: 'UNAVAILABLE',
        reason: `Bet is already ${bet.status}`,
      };
    }

    // Layer 4: Cash out enabled flag
    if (bet.cashoutEnabled === false) {
      return {
        betId,
        status: 'UNAVAILABLE',
        reason: 'Cash out not available for this bet',
      };
    }

    // Layer 5: Market status and live odds
    const marketState = await this.resolveCashoutMarketState(
      bet.eventId,
      bet.marketId,
      bet.selectionId,
    );
    if (!marketState.market)
      return { betId, status: 'SUSPENDED', reason: 'Market not found' };
    if (!this.isCashoutSupportedMarket(marketState.market)) {
      return {
        betId,
        status: 'UNAVAILABLE',
        reason: 'Cash out is only available for MATCH_ODDS and Bookmaker markets',
      };
    }
    if (marketState.suspended) {
      return { betId, status: 'SUSPENDED', reason: 'Market is suspended' };
    }

    const currentOdds = marketState.currentOdds;
    if (!currentOdds || currentOdds <= 1) {
      return { betId, status: 'SUSPENDED', reason: 'Live odds unavailable' };
    }

    // ── Calculate offer ───────────────────────────────────────────────────
    // Formula:
    //   stake * (1 - (((currentOdds - originalOdds) / originalOdds) / 3)) * 0.95
    // Example:
    //   100 @ 2.0 -> 1.4 = 104.50
    //   100 @ 2.0 -> 2.6 = 85.50
    const cashoutValue = this.normalizeCashoutValue(
      bet,
      this.calculateBaseCashoutValue(bet, currentOdds),
    );
    if (cashoutValue <= 0) {
      return {
        betId,
        status: 'UNAVAILABLE',
        reason: 'Cash out value is unavailable for this bet',
      };
    }

    return {
      betId,
      status: 'AVAILABLE',
      cashoutValue,
      currentOdds,
      originalOdds: bet.odds,
      stake: bet.stake,
      potentialWin: bet.potentialWin,
      fullRefundEligible: false,
      fullRefundValue: null,
    };
  }

  /**
   * Executes full or partial cash out for a PENDING bet.
   *
   * Stake.com-style features:
   *  1. Partial cash out — fraction 0 < f <= 1 (e.g. 0.5 = 50%)
   *     Partial cashout: reduces the remaining live stake on the bet
   *     and credits the realized cashout value immediately.
   *  2. Price-change tolerance band (2%):
   *     - If server re-computed value is within 2% of client's expectation → accept silently
   *     - If > 2% divergence → return PRICE_CHANGED with new value (frontend re-confirms)
   *  3. Cash out follows the odds-change percentage rule, then applies a 5% house haircut.
   *
   * Security: ALL values re-computed server-side. clientExpectedValue is only used for
   * tolerance comparison — it is NEVER credited to the user.
   *
   * @param betId           - MongoDB bet ID
   * @param userId          - from JWT
   * @param fraction        - 0 < fraction <= 1 (default 1 = full cashout)
   * @param clientExpectedValue - what the client UI showed the user (for tolerance check)
   * @param fullRefund      - deprecated legacy flag, no longer supported
   */
  async executeCashout(
    betId: string,
    userId: number,
    fraction = 1,
    clientExpectedValue?: number,
    fullRefund = false,
  ): Promise<any> {
    const cashoutLockKey = `bet_cashout_lock:${userId}:${this.normalizeText(
      betId,
    )}`;
    let keepLock = false;

    await this.enforceRateLimit(
      `bet_cashout_rl:${userId}`,
      BET_CASHOUT_RATE_LIMIT,
      BET_CASHOUT_RATE_WINDOW_SECS,
      `Too many cash out attempts. Max ${BET_CASHOUT_RATE_LIMIT} per ${BET_CASHOUT_RATE_WINDOW_SECS}s.`,
    );
    await this.acquireActionLock(
      cashoutLockKey,
      BET_CASHOUT_LOCK_TTL_SECS,
      'Cash out already in progress for this bet. Please wait a moment.',
    );

    try {
      // ── Validate fraction ───────────────────────────────────────────────
      if (fraction <= 0 || fraction > 1) {
        throw new BadRequestException(
          'Fraction must be between 0 (exclusive) and 1 (inclusive)',
        );
      }

      // ── Fetch & validate bet ────────────────────────────────────────────
      const bet = await this.betModel.findById(betId);
      if (!bet) throw new BadRequestException('Bet not found');

      // Ownership — prevents IDOR
      if (bet.userId !== userId) throw new BadRequestException('Bet not found');

      // Idempotency — prevents double cashout
      if (bet.status !== 'PENDING') {
        throw new BadRequestException(`Cannot cash out — bet is '${bet.status}'`);
      }

      if (bet.cashoutEnabled === false) {
        throw new BadRequestException('Cash out is not available for this bet');
      }

      // ── Market status ───────────────────────────────────────────────────
      const marketState = await this.resolveCashoutMarketState(
        bet.eventId,
        bet.marketId,
        bet.selectionId,
      );
      if (!marketState.market) throw new BadRequestException('Market not found');
      if (!this.isCashoutSupportedMarket(marketState.market)) {
        throw new BadRequestException(
          'Cash out is only available for MATCH_ODDS and Bookmaker markets',
        );
      }
      if (marketState.suspended) {
        throw new BadRequestException('Market is suspended');
      }

      if (fullRefund) {
        throw new BadRequestException('Full refund cash out is not available');
      }

      // ── Re-compute live odds (NEVER trust client) ───────────────────────
      const currentOdds = marketState.currentOdds;
      if (!currentOdds || currentOdds <= 1) {
        throw new BadRequestException(
          'Live odds unavailable — market may be suspended',
        );
      }

      // ── Calculate server-side cashout value ─────────────────────────────
      const fullCashoutValue = this.normalizeCashoutValue(
        bet,
        this.calculateBaseCashoutValue(bet, currentOdds),
      );

      if (fullCashoutValue <= 0) {
        throw new BadRequestException('Cash out value is zero');
      }

      const requestedCashoutValue = this.roundCurrency(
        fullCashoutValue * fraction,
      );

      if (clientExpectedValue !== undefined && clientExpectedValue > 0) {
        const divergence =
          Math.abs(requestedCashoutValue - clientExpectedValue) /
          clientExpectedValue;
        const TOLERANCE = 0.02;
        if (divergence > TOLERANCE) {
          return {
            status: 'PRICE_CHANGED',
            newCashoutValue: requestedCashoutValue,
            fullCashoutValue,
            currentOdds,
            fraction,
          };
        }
      }

      const settlement = await this._settleCashout(
        bet,
        requestedCashoutValue,
        bet.stake,
        fraction,
        currentOdds,
        userId,
      );
      keepLock = true;
      return settlement;
    } finally {
      if (!keepLock) {
        await this.releaseActionLock(cashoutLockKey);
      }
    }
  }

  /**
   * Internal: atomically credit cashout value, update the live bet state,
   * and clean up Redis when the bet is fully exited.
   */
  private async _settleCashout(
    bet: BetDocument,
    cashoutValue: number,
    originalStake: number,
    fraction: number,
    currentOdds: number,
    userId: number,
  ): Promise<any> {
    const settledCashoutValue = this.normalizeCashoutValue(bet, cashoutValue);
    if (settledCashoutValue <= 0) {
      throw new BadRequestException('Cash out value is unavailable for this bet');
    }

    const payoutAllocations = this.buildBetPayoutAllocations(
      bet,
      settledCashoutValue,
    );
    const primaryAllocation = payoutAllocations[0];
    const paymentMethod =
      payoutAllocations.length === 1 && primaryAllocation
        ? this.mapWalletFieldToPaymentMethod(primaryAllocation.walletField)
        : 'MULTI_WALLET';
    const walletLabel =
      payoutAllocations.length === 1 && primaryAllocation
        ? primaryAllocation.walletLabel
        : payoutAllocations
            .map((allocation) => allocation.walletLabel)
            .join(' + ');
    const betOriginalStake = this.getBetOriginalStake(bet);
    const betOriginalPotentialWin = this.getBetOriginalPotentialWin(bet);
    const priorPartialCashoutValue = this.getBetPartialCashoutValue(bet);

    const cashedStake = this.roundCurrency(originalStake * fraction);
    const remainStake = this.roundCurrency(originalStake * (1 - fraction));
    const isPartial = fraction < 1 && remainStake > 0;

    // ── Atomic Prisma transaction ─────────────────────────────────────────
    await this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('User not found');

      const creditData = payoutAllocations.reduce<Record<string, any>>(
        (acc, allocation) => {
          acc[allocation.walletField] = { increment: allocation.amount };
          return acc;
        },
        {},
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          ...creditData,
          // Release exposure of the CASHED portion only
          exposure: { decrement: cashedStake },
        } as any,
      });

      await prisma.transaction.create({
        data: {
          userId,
          amount: settledCashoutValue,
          type: 'BET_CASHOUT',
          status: 'COMPLETED',
          paymentMethod,
          paymentDetails: {
            source: 'BET_CASHOUT',
            walletField:
              payoutAllocations.length === 1
                ? (primaryAllocation?.walletField ?? null)
                : null,
            walletLabel,
            allocations: payoutAllocations,
            betId: String(bet._id),
            marketId: bet.marketId,
          },
          remarks: isPartial
            ? `Partial Cash Out (${Math.round(fraction * 100)}%): ${bet.eventName} — ${bet.selectionName} @ ${currentOdds} (original ${bet.odds})`
            : `Cash Out: ${bet.eventName} — ${bet.selectionName} @ ${currentOdds} (original ${bet.odds})`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    // ── MongoDB updates ───────────────────────────────────────────────────
    if (isPartial) {
      // Shrink the original bet to the remaining live portion while
      // preserving the immutable opening values for history/P&L.
      const remainPotentialWin = this.roundCurrency(
        bet.potentialWin * (1 - fraction),
      );
      const updatedPartialCashoutValue = this.roundCurrency(
        priorPartialCashoutValue + settledCashoutValue,
      );

      bet.originalStake = betOriginalStake;
      bet.originalPotentialWin = betOriginalPotentialWin;
      bet.stake = remainStake;
      bet.potentialWin = remainPotentialWin;
      (bet as any).partialCashoutValue = updatedPartialCashoutValue;
      (bet as any).partialCashoutCount =
        Number((bet as any).partialCashoutCount || 0) + 1;
      (bet as any).lastPartialCashoutAt = new Date();
      bet.settledReason = [
        bet.settledReason,
        `Partial cash out ${Math.round(fraction * 100)}% at odds ${currentOdds}: received ₹${settledCashoutValue}.`,
      ]
        .filter(Boolean)
        .join(' | ');
      await bet.save();
    } else {
      // Full cash out — mark bet as settled
      const totalCashoutValue = this.roundCurrency(
        priorPartialCashoutValue + settledCashoutValue,
      );

      bet.originalStake = betOriginalStake;
      bet.originalPotentialWin = betOriginalPotentialWin;
      bet.status = 'CASHED_OUT';
      bet.cashoutValue = totalCashoutValue;
      bet.cashedOutAt = new Date();
      bet.settledReason =
        priorPartialCashoutValue > 0
          ? `Final cash out at odds ${currentOdds} (original: ${bet.odds}). Received ₹${settledCashoutValue}. Total returned from cash outs ₹${totalCashoutValue}.`
          : `Cashed out at odds ${currentOdds} (original: ${bet.odds}). Received ₹${settledCashoutValue}.`;
      await bet.save();

      // Redis: remove from active bets only on full settle
      await this.redis.srem(`active_bets:${userId}`, bet._id.toString());
    }

    this.bonusService.emitWalletRefresh(userId);

    return {
      status: isPartial ? 'PARTIAL_CASHED_OUT' : 'CASHED_OUT',
      cashoutValue: settledCashoutValue,
      remainingStake: isPartial ? remainStake : 0,
      bet: { ...bet.toObject(), id: bet._id.toString() },
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
}
