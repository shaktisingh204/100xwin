import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../prisma.service';
import { OriginalsConfig, OriginalsConfigDocument, OriginalsAccessMode } from './schemas/originals-config.schema';
import { MinesGame, MinesGameDocument } from './schemas/mines-game.schema';
import { OriginalsGGRSnapshot, OriginalsGGRSnapshotDocument } from './schemas/originals-ggr-snapshot.schema';
import { OriginalsSession, OriginalsSessionDocument } from './schemas/originals-session.schema';
import { OriginalsEngagementEvent, OriginalsEngagementEventDocument } from './schemas/originals-engagement-event.schema';
import { GGRService } from './ggr.service';

export const GAME_KEYS = ['mines', 'crash', 'dice', 'limbo'];
const GLOBAL_ACCESS_KEY = '__global_access__';
const LEGACY_ALLOWED_PHONE_SUFFIXES = ['9460290991'];

const DEFAULT_CONFIGS: Record<string, any> = {
  mines:  { isActive: true,  minBet: 10, maxBet: 100000, maxWin: 1000000, houseEdgePercent: 1.0, maxMultiplier: 500,  targetGgrPercent: 5.0, ggrWindowHours: 24, ggrBiasStrength: 0.20, engagementMode: 'SOFT', nearMissEnabled: true,  bigWinThreshold: 10,  streakWindow: 5, displayRtpPercent: 95.0, gameName: 'Zeero Mines',  gameDescription: 'Dodge the mines, collect the gems.',             fakePlayerMin: 200, fakePlayerMax: 300 },
  crash:  { isActive: true,  minBet: 10, maxBet: 50000,  maxWin: 500000,  houseEdgePercent: 1.0, maxMultiplier: 1000, targetGgrPercent: 4.0, ggrWindowHours: 24, ggrBiasStrength: 0.15, engagementMode: 'SOFT', nearMissEnabled: true,  bigWinThreshold: 10,  streakWindow: 5, displayRtpPercent: 96.0, gameName: 'Zeero Crash',  gameDescription: 'Watch the multiplier climb. Cash out in time.',  fakePlayerMin: 180, fakePlayerMax: 280 },
  dice:   { isActive: true,  minBet: 10, maxBet: 50000,  maxWin: 500000,  houseEdgePercent: 1.0, maxMultiplier: 100,  targetGgrPercent: 3.0, ggrWindowHours: 24, ggrBiasStrength: 0.10, engagementMode: 'SOFT', nearMissEnabled: false, bigWinThreshold: 10,  streakWindow: 5, displayRtpPercent: 97.0, gameName: 'Zeero Dice',   gameDescription: 'Roll the dice, beat the house.',                fakePlayerMin: 120, fakePlayerMax: 220 },
  limbo:  { isActive: true,  minBet: 10, maxBet: 50000,  maxWin: 500000,  houseEdgePercent: 1.0, maxMultiplier: 200,  targetGgrPercent: 3.5, ggrWindowHours: 24, ggrBiasStrength: 0.12, engagementMode: 'SOFT', nearMissEnabled: false, bigWinThreshold: 10,  streakWindow: 5, displayRtpPercent: 96.5, gameName: 'Zeero Limbo',  gameDescription: 'Pick your multiplier and beat the bust point.', fakePlayerMin: 140, fakePlayerMax: 240 },
};

const ALLOWED_FIELDS = [
  'isActive','maintenanceMode','maintenanceMessage','minBet','maxBet','maxWin','houseEdgePercent',
  'maxMultiplier','targetGgrPercent','ggrWindowHours','ggrBiasStrength','engagementMode',
  'nearMissEnabled','bigWinThreshold','streakWindow','displayRtpPercent',
  'thumbnailUrl','gameName','gameDescription','fakePlayerMin','fakePlayerMax',
];

@Injectable()
export class OriginalsAdminService {
  constructor(
    @InjectModel(OriginalsConfig.name)   private readonly configModel:     Model<OriginalsConfigDocument>,
    @InjectModel(MinesGame.name)         private readonly minesGameModel:  Model<MinesGameDocument>,
    @InjectModel(OriginalsGGRSnapshot.name) private readonly snapshotModel: Model<OriginalsGGRSnapshotDocument>,
    @InjectModel(OriginalsSession.name)  private readonly sessionModel:    Model<OriginalsSessionDocument>,
    @InjectModel(OriginalsEngagementEvent.name) private readonly engagementModel: Model<OriginalsEngagementEventDocument>,
    private readonly prisma: PrismaService,
    private readonly ggrService: GGRService,
  ) {}

  private async ensureConfig(gameKey: string): Promise<OriginalsConfigDocument> {
    return this.configModel.findOneAndUpdate(
      { gameKey },
      { $setOnInsert: { gameKey, ...(DEFAULT_CONFIGS[gameKey] ?? DEFAULT_CONFIGS.mines) } },
      { upsert: true, new: true },
    );
  }

  private async ensureAccessConfig(): Promise<OriginalsConfigDocument> {
    const existing = await this.configModel.findOne({ gameKey: GLOBAL_ACCESS_KEY });
    if (existing) {
      return existing;
    }

    const legacyUsers = await this.prisma.user.findMany({
      where: {
        OR: LEGACY_ALLOWED_PHONE_SUFFIXES.map((phoneSuffix) => ({
          phoneNumber: { endsWith: phoneSuffix },
        })),
      },
      select: { id: true },
    });

    const allowedUserIds = [...new Set(legacyUsers.map((user) => user.id))];

    return this.configModel.create({
      gameKey: GLOBAL_ACCESS_KEY,
      accessMode: 'ALLOW_LIST',
      allowedUserIds,
    });
  }

  private normalizeAllowedUserIds(userIds: unknown): number[] {
    if (!Array.isArray(userIds)) {
      return [];
    }

    return [...new Set(
      userIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    )];
  }

  private async filterExistingUserIds(userIds: number[]): Promise<number[]> {
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    const existingIds = new Set(users.map((user) => user.id));
    return userIds.filter((userId) => existingIds.has(userId));
  }

  async getAllConfigs() {
    await Promise.all(GAME_KEYS.map((k) => this.ensureConfig(k)));
    return this.configModel.find({ gameKey: { $in: GAME_KEYS } }).sort({ gameKey: 1 }).lean();
  }

  async getConfig(gameKey: string) {
    return this.ensureConfig(gameKey);
  }

  async upsertConfig(gameKey: string, data: any, adminId?: number) {
    const clean: Record<string, any> = {};
    for (const k of ALLOWED_FIELDS) {
      if (k in data && data[k] !== undefined) clean[k] = data[k];
    }
    if (adminId) clean.updatedBy = adminId;
    return this.configModel.findOneAndUpdate(
      { gameKey },
      { $setOnInsert: { gameKey, ...(DEFAULT_CONFIGS[gameKey] ?? DEFAULT_CONFIGS.mines) }, $set: clean },
      { upsert: true, new: true },
    );
  }

  async getAccessConfig() {
    return this.ensureAccessConfig();
  }

  async updateAccessConfig(data: { accessMode?: OriginalsAccessMode; allowedUserIds?: number[] }, adminId?: number) {
    const clean: Record<string, any> = {};

    if (data.accessMode === 'ALL' || data.accessMode === 'ALLOW_LIST') {
      clean.accessMode = data.accessMode;
    }

    if (data.allowedUserIds !== undefined) {
      const normalizedIds = this.normalizeAllowedUserIds(data.allowedUserIds);
      clean.allowedUserIds = await this.filterExistingUserIds(normalizedIds);
    }

    if (adminId) {
      clean.updatedBy = adminId;
    }

    const insertDefaults: Record<string, any> = { gameKey: GLOBAL_ACCESS_KEY };
    if (clean.accessMode === undefined) {
      insertDefaults.accessMode = 'ALLOW_LIST';
    }
    if (clean.allowedUserIds === undefined) {
      insertDefaults.allowedUserIds = [];
    }

    return this.configModel.findOneAndUpdate(
      { gameKey: GLOBAL_ACCESS_KEY },
      {
        $setOnInsert: insertDefaults,
        $set: clean,
      },
      { upsert: true, new: true },
    );
  }

  async canUserPlayOriginals(userId: number) {
    const config = await this.ensureAccessConfig();
    if ((config.accessMode ?? 'ALLOW_LIST') === 'ALL') {
      return true;
    }

    const allowedUserIds = this.normalizeAllowedUserIds(config.allowedUserIds ?? []);
    return allowedUserIds.includes(userId);
  }

  // ── Per-user GGR ──────────────────────────────────────────────────────────

  async setPerUserGGR(gameKey: string, userId: number, targetGgr: number) {
    if (targetGgr < 0 || targetGgr > 100) throw new BadRequestException('targetGgr must be 0–100');
    return this.configModel.findOneAndUpdate(
      { gameKey },
      { $set: { [`perUserGgrOverrides.${userId}`]: targetGgr } },
      { upsert: true, new: true },
    );
  }

  async removePerUserGGR(gameKey: string, userId: number) {
    return this.configModel.findOneAndUpdate(
      { gameKey },
      { $unset: { [`perUserGgrOverrides.${userId}`]: '' } },
      { new: true },
    );
  }

  async getPerUserGGR(gameKey: string) {
    const config = await this.ensureConfig(gameKey);
    const overrides = config.perUserGgrOverrides ?? {};
    return Object.entries(overrides).map(([uid, tgr]) => ({ userId: parseInt(uid), targetGgr: tgr }));
  }

  // ── GGR ───────────────────────────────────────────────────────────────────

  async getLiveGGR(gameKey: string)  { return this.ggrService.getLiveGGRStats(gameKey); }
  async getAllGGR()                   { return Promise.all(GAME_KEYS.map((k) => this.ggrService.getLiveGGRStats(k))); }

  async getGGRHistory(gameKey: string, hours = 168) {
    const since = new Date(Date.now() - hours * 3600 * 1000);
    return this.snapshotModel.find({ gameKey, snapshotAt: { $gte: since } }).sort({ snapshotAt: 1 }).lean();
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async getActiveSessions(gameKey?: string) {
    const filter: any = { isActive: true };
    if (gameKey) filter.gameKey = gameKey;
    return this.sessionModel.find(filter).sort({ connectedAt: -1 }).lean();
  }

  // ── Game History ──────────────────────────────────────────────────────────

  async getGameHistory(gameKey: string, page = 1, limit = 50, userId?: number) {
    const filter: any = { status: { $ne: 'ACTIVE' } };
    if (userId) filter.userId = userId;

    const [games, total] = await Promise.all([
      this.minesGameModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.minesGameModel.countDocuments(filter),
    ]);

    const won          = games.filter((g) => g.status === 'CASHEDOUT').length;
    const lost         = games.filter((g) => g.status === 'LOST').length;
    const totalWagered = games.reduce((s, g) => s + g.betAmount, 0);
    const totalPaidOut = games.reduce((s, g) => s + g.payout, 0);

    return {
      games: games.map((g) => ({ ...g, gameId: String((g as any)._id) })),
      total, page, limit, pages: Math.ceil(total / limit),
      summary: { won, lost, totalWagered, totalPaidOut, house: totalWagered - totalPaidOut },
    };
  }

  async getGameDetail(gameId: string) {
    const game = await this.minesGameModel.findById(gameId).lean();
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    return { ...game, gameId: String((game as any)._id) };
  }

  async getActiveGames() {
    return this.minesGameModel.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).lean();
  }

  async forceCloseGame(gameId: string, adminId?: number) {
    const game = await this.minesGameModel.findById(gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== 'ACTIVE') throw new BadRequestException(`Game is not active (${game.status})`);
    game.status = 'LOST';
    game.payout = 0;
    await game.save();
    return { gameId, closed: true };
  }

  async forceCloseUserGames(userId: number) {
    const result = await this.minesGameModel.updateMany({ userId, status: 'ACTIVE' }, { $set: { status: 'LOST', payout: 0 } });
    return { closed: result.modifiedCount };
  }

  // ── Engagement ────────────────────────────────────────────────────────────

  async getEngagementStats(gameKey: string) {
    const [summary, recent] = await Promise.all([
      this.engagementModel.aggregate([
        { $match: { gameKey } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
      ]),
      this.engagementModel.find({ gameKey }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return { summary, recent };
  }

  // ── Player stats ──────────────────────────────────────────────────────────

  async getUserOriginalsStats(userId: number) {
    const games = await this.minesGameModel.find({ userId, status: { $ne: 'ACTIVE' } }).sort({ createdAt: -1 }).lean();
    const totalGames   = games.length;
    const totalWins    = games.filter((g) => g.status === 'CASHEDOUT').length;
    const totalLosses  = games.filter((g) => g.status === 'LOST').length;
    const totalWagered = games.reduce((s, g) => s + g.betAmount, 0);
    const totalPaidOut = games.reduce((s, g) => s + g.payout, 0);
    return {
      userId, totalGames, totalWins, totalLosses, totalWagered, totalPaidOut,
      netPnl: totalPaidOut - totalWagered,
      avgBet: totalGames > 0 ? totalWagered / totalGames : 0,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      lastPlayed: (games[0] as any)?.createdAt ?? null,
      recentGames: games.slice(0, 10).map((g) => ({ ...g, gameId: String((g as any)._id) })),
    };
  }

  async pruneOldSnapshots(daysToKeep = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 86400 * 1000);
    const result = await this.snapshotModel.deleteMany({ snapshotAt: { $lt: cutoff } });
    return { deleted: result.deletedCount };
  }
}
