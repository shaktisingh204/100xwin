import {
  Injectable, BadRequestException, NotFoundException,
  Inject, forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../prisma.service';
import { DiceGame, DiceGameDocument } from '../originals/schemas/dice-game.schema';
import { GGRService } from '../originals/ggr.service';
import * as crypto from 'crypto';
import { BonusService } from '../bonus/bonus.service';

const DEFAULT_HOUSE_EDGE = 1; // 1% house edge

/**
 * Provably-fair roll:  HMAC-SHA256(serverSeed:clientSeed:nonce)
 * → take first 8 hex chars → parseInt base 16 → mod 10000 → divide by 100
 * Result range: 0.00 – 99.99
 */
function generateRoll(serverSeed: string, clientSeed: string, nonce: number): number {
  const hmac = crypto.createHmac('sha256', `${serverSeed}:${clientSeed}:${nonce}`).digest('hex');
  const raw = parseInt(hmac.slice(0, 8), 16) % 10000;
  return raw / 100; // 0.00 – 99.99
}

function calcMultiplier(winChance: number, houseEdge = DEFAULT_HOUSE_EDGE): number {
  if (winChance <= 0 || winChance >= 100) return 0;
  return parseFloat(((100 - houseEdge) / winChance).toFixed(4));
}

function calcWinChance(target: number, direction: 'over' | 'under'): number {
  // "over" means roll > target  →  winChance = 99.99 - target  (convert to %)
  // "under" means roll < target →  winChance = target
  if (direction === 'over') return parseFloat((99.99 - target).toFixed(2));
  return parseFloat(target.toFixed(2));
}

export interface PlayDiceDto {
  betAmount: number;
  target: number;
  direction: 'over' | 'under';
  clientSeed?: string;
  walletType?: 'fiat' | 'crypto';
  useBonus?: boolean;
}

@Injectable()
export class DiceService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(DiceGame.name)
    private readonly diceGameModel: Model<DiceGameDocument>,
    @Inject(forwardRef(() => GGRService))
    private readonly ggrService: GGRService,
    private readonly bonusService: BonusService,
  ) {}

  async playDice(userId: number, dto: PlayDiceDto) {
    const {
      betAmount,
      target,
      direction,
      clientSeed = 'zeero',
      walletType = 'fiat',
      useBonus = false,
    } = dto;

    // Validation
    if (!target || target < 1 || target > 98) throw new BadRequestException('Target must be 1–98');
    if (!['over', 'under'].includes(direction)) throw new BadRequestException('Direction must be "over" or "under"');
    if (betAmount <= 0) throw new BadRequestException('Bet must be positive');

    const winChance = calcWinChance(target, direction);
    if (winChance <= 0 || winChance >= 100) throw new BadRequestException('Invalid win chance');
    const mult = calcMultiplier(winChance);

    // Get user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Deduct balance (Prisma — atomic)
    let bonusUsed = 0;
    let actualBet = betAmount;

    await this.prisma.$transaction(async (tx) => {
      if (walletType === 'crypto') {
        if (user.cryptoBalance < betAmount) throw new BadRequestException('Insufficient crypto balance');
        await tx.user.update({ where: { id: userId }, data: { cryptoBalance: { decrement: betAmount } } });
      } else {
        if (useBonus && user.casinoBonus > 0) {
          bonusUsed = Math.min(user.casinoBonus, betAmount);
          actualBet = Math.max(0, betAmount - bonusUsed);
          if (user.balance < actualBet) throw new BadRequestException('Insufficient balance');
          await tx.user.update({
            where: { id: userId },
            data: { balance: { decrement: actualBet }, casinoBonus: { decrement: bonusUsed } },
          });
        } else {
          if (user.balance < betAmount) throw new BadRequestException('Insufficient balance');
          await tx.user.update({ where: { id: userId }, data: { balance: { decrement: betAmount } } });
        }
      }
    });

    // Generate provably fair roll
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const nonce = Date.now();
    const roll = generateRoll(serverSeed, clientSeed, nonce);

    // Determine win/loss
    const won = direction === 'over' ? roll > target : roll < target;
    const payout = won ? parseFloat((betAmount * mult).toFixed(2)) : 0;
    const status = won ? 'WON' : 'LOST';

    // Save game (MongoDB)
    const game = await this.diceGameModel.create({
      userId, betAmount, target, direction, roll, multiplier: mult,
      payout, status, winChance,
      serverSeed, clientSeed, serverSeedHash,
      walletType, usedBonus: bonusUsed > 0, bonusAmount: bonusUsed,
      currency: walletType === 'crypto' ? 'USD' : user.currency || 'INR',
    });

    // Credit payout if won (Prisma — atomic)
    if (won) {
      await this.prisma.$transaction(async (tx) => {
        if (walletType === 'crypto') {
          await tx.user.update({ where: { id: userId }, data: { cryptoBalance: { increment: payout } } });
        } else {
          await tx.user.update({ where: { id: userId }, data: { balance: { increment: payout } } });
        }
      });
    }

    await this.bonusService.recordWagering(userId, betAmount, 'CASINO', bonusUsed > 0 ? 'fiatbonus' : 'main').catch(() => {
      this.bonusService.emitWalletRefresh(userId);
    });

    return {
      gameId: String(game._id),
      roll, target, direction, multiplier: mult, winChance,
      payout, status, betAmount,
      serverSeed, serverSeedHash, clientSeed,
    };
  }

  async getHistory(userId: number, limit = 20) {
    const games = await this.diceGameModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return games.map((g: any) => ({
      gameId: String(g._id),
      roll: g.roll, target: g.target, direction: g.direction,
      multiplier: g.multiplier, winChance: g.winChance,
      payout: g.payout, status: g.status, betAmount: g.betAmount,
      createdAt: g.createdAt,
    }));
  }
}
