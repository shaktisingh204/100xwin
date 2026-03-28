"use server";

import connectMongo from "@/lib/mongo";
import { prisma } from "@/lib/db";
import {
  OriginalsConfig,
  MinesGame,
  OriginalsGGRSnapshot,
  OriginalsSession,
  OriginalsEngagementEvent,
  AviatorRound,
  AviatorBet,
} from "@/models/MongoModels";

const GAME_KEYS = ["mines", "crash", "dice", "limbo"];
const GLOBAL_ACCESS_KEY = "__global_access__";
const LEGACY_ALLOWED_PHONE_SUFFIXES = ["9460290991"];

const DEFAULTS: Record<string, any> = {
  mines:  { isActive: true,  minBet: 10, maxBet: 100000, targetGgrPercent: 5.0,  displayRtpPercent: 95.0, gameName: "Zeero Mines",   gameDescription: "Dodge the mines, collect the gems.",             fakePlayerMin: 200, fakePlayerMax: 300 },
  crash:  { isActive: true,  minBet: 10, maxBet: 50000,  targetGgrPercent: 4.0,  displayRtpPercent: 96.0, gameName: "Zeero Crash",   gameDescription: "Watch the multiplier climb. Cash out in time.",  fakePlayerMin: 180, fakePlayerMax: 280 },
  dice:   { isActive: true,  minBet: 10, maxBet: 50000,  targetGgrPercent: 3.0,  displayRtpPercent: 97.0, gameName: "Zeero Dice",    gameDescription: "Roll the dice, beat the house.",                 fakePlayerMin: 120, fakePlayerMax: 220 },
  limbo:  { isActive: true,  minBet: 10, maxBet: 50000,  targetGgrPercent: 3.5,  displayRtpPercent: 96.5, gameName: "Zeero Limbo",   gameDescription: "Pick your multiplier and beat the bust point.",  fakePlayerMin: 140, fakePlayerMax: 240 },
};

async function ensureConfig(gameKey: string) {
  await connectMongo();
  const existing = await OriginalsConfig.findOne({ gameKey });
  if (existing) return existing;
  return OriginalsConfig.create({ gameKey, ...(DEFAULTS[gameKey] ?? DEFAULTS.mines) });
}

function normalizeAllowedUserIds(userIds: unknown): number[] {
  if (!Array.isArray(userIds)) {
    return [];
  }

  return [...new Set(
    userIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  )];
}

async function filterExistingUserIds(userIds: number[]) {
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });

  const existingIds = new Set(users.map((user) => user.id));
  return userIds.filter((userId) => existingIds.has(userId));
}

async function ensureAccessConfig() {
  await connectMongo();
  const existing = await OriginalsConfig.findOne({ gameKey: GLOBAL_ACCESS_KEY });
  if (existing) return existing;

  const legacyUsers = await prisma.user.findMany({
    where: {
      OR: LEGACY_ALLOWED_PHONE_SUFFIXES.map((phoneSuffix) => ({
        phoneNumber: { endsWith: phoneSuffix },
      })),
    },
    select: { id: true },
  });

  const allowedUserIds = [...new Set(legacyUsers.map((user) => user.id))];
  return OriginalsConfig.create({
    gameKey: GLOBAL_ACCESS_KEY,
    accessMode: "ALLOW_LIST",
    allowedUserIds,
  });
}

async function getCompactUsersByIds(userIds: number[]) {
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      email: true,
      phoneNumber: true,
      role: true,
      isBanned: true,
    },
  });

  const order = new Map(userIds.map((userId, index) => [userId, index]));
  return users.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getAllOriginalsConfigs() {
  try {
    await connectMongo();
    await Promise.all(GAME_KEYS.map(ensureConfig));
    const data = await OriginalsConfig.find({ gameKey: { $in: GAME_KEYS } })
      .sort({ gameKey: 1 }).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getOriginalsConfig(game: string) {
  try {
    const data = await ensureConfig(game);
    return { success: true, data: data.toObject() };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateOriginalsConfig(game: string, payload: any) {
  try {
    await connectMongo();
    const ALLOWED = [
      "isActive","maintenanceMode","maintenanceMessage","minBet","maxBet","maxWin",
      "houseEdgePercent","maxMultiplier","targetGgrPercent","ggrWindowHours","ggrBiasStrength",
      "engagementMode","nearMissEnabled","bigWinThreshold","streakWindow","displayRtpPercent",
      "thumbnailUrl","gameName","gameDescription","fakePlayerMin","fakePlayerMax",
    ];
    const clean: Record<string, any> = {};
    for (const k of ALLOWED) if (k in payload && payload[k] !== undefined) clean[k] = payload[k];

    const data = await OriginalsConfig.findOneAndUpdate(
      { gameKey: game },
      { $setOnInsert: { gameKey: game }, $set: clean },
      { upsert: true, new: true }
    ).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Access Control ───────────────────────────────────────────────────────────

export async function getOriginalsAccessControl() {
  try {
    const config = await ensureAccessConfig();
    const allowedUserIds = normalizeAllowedUserIds((config as any)?.allowedUserIds ?? []);
    const allowedUsers = await getCompactUsersByIds(allowedUserIds);

    return {
      success: true,
      data: {
        accessMode: (config as any)?.accessMode === "ALL" ? "ALL" : "ALLOW_LIST",
        allowedUserIds,
        allowedUsers,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateOriginalsAccessControl(payload: { accessMode?: "ALL" | "ALLOW_LIST"; allowedUserIds?: number[] }) {
  try {
    await connectMongo();
    const clean: Record<string, any> = {};

    if (payload.accessMode === "ALL" || payload.accessMode === "ALLOW_LIST") {
      clean.accessMode = payload.accessMode;
    }

    if (payload.allowedUserIds !== undefined) {
      const normalizedIds = normalizeAllowedUserIds(payload.allowedUserIds);
      clean.allowedUserIds = await filterExistingUserIds(normalizedIds);
    }

    const insertDefaults: Record<string, any> = { gameKey: GLOBAL_ACCESS_KEY };
    if (clean.accessMode === undefined) {
      insertDefaults.accessMode = "ALLOW_LIST";
    }
    if (clean.allowedUserIds === undefined) {
      insertDefaults.allowedUserIds = [];
    }

    const data = await OriginalsConfig.findOneAndUpdate(
      { gameKey: GLOBAL_ACCESS_KEY },
      {
        $setOnInsert: insertDefaults,
        $set: clean,
      },
      { upsert: true, new: true }
    ).lean();

    const allowedUserIds = normalizeAllowedUserIds((data as any)?.allowedUserIds ?? []);
    const allowedUsers = await getCompactUsersByIds(allowedUserIds);

    return {
      success: true,
      data: {
        ...(data as any),
        accessMode: (data as any)?.accessMode === "ALL" ? "ALL" : "ALLOW_LIST",
        allowedUserIds,
        allowedUsers,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function searchOriginalsAccessUsers(query: string) {
  try {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { success: true, data: [] };
    }

    const data = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: trimmed, mode: "insensitive" } },
          { email: { contains: trimmed, mode: "insensitive" } },
          { phoneNumber: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        phoneNumber: true,
        role: true,
        isBanned: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── GGR ───────────────────────────────────────────────────────────────────────

export async function getOriginalsGGR(game: string) {
  try {
    await connectMongo();
    const [config, snapshot] = await Promise.all([
      OriginalsConfig.findOne({ gameKey: game }).lean(),
      OriginalsGGRSnapshot.findOne({ gameKey: game }).sort({ snapshotAt: -1 }).lean(),
    ]);
    return {
      success: true,
      data: {
        gameKey: game,
        targetGgrPercent:  (config as any)?.targetGgrPercent ?? 5,
        actualGgrPercent:  (snapshot as any)?.ggrPercent ?? 0,
        totalWagered:      (snapshot as any)?.totalWagered ?? 0,
        totalPaidOut:      (snapshot as any)?.totalPaidOut ?? 0,
        totalGames:        (snapshot as any)?.totalGames ?? 0,
        totalWins:         (snapshot as any)?.totalWins ?? 0,
        totalLosses:       (snapshot as any)?.totalLosses ?? 0,
        snapshotAt:        (snapshot as any)?.snapshotAt,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getAllOriginalsGGR() {
  try {
    const results = await Promise.all(GAME_KEYS.map((g) => getOriginalsGGR(g)));
    return { success: true, data: results.map((r) => r.data) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getOriginalsGGRHistory(game: string, hours = 168) {
  try {
    await connectMongo();
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const data = await OriginalsGGRSnapshot.find({ gameKey: game, snapshotAt: { $gte: since } })
      .sort({ snapshotAt: 1 }).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getOriginalsSessions(game?: string) {
  try {
    await connectMongo();
    const filter: any = { isActive: true };
    if (game) filter.gameKey = game;
    const data = await OriginalsSession.find(filter).sort({ connectedAt: -1 }).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Game History ──────────────────────────────────────────────────────────────

export async function getOriginalsHistory(game: string, page = 1, limit = 50, userId?: number) {
  try {
    await connectMongo();
    // Only mines has MinesGame collection — extend for other games later
    const filter: any = { status: { $ne: "ACTIVE" } };
    if (userId) filter.userId = userId;

    const [games, total] = await Promise.all([
      MinesGame.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean(),
      MinesGame.countDocuments(filter),
    ]);
    const won          = games.filter((g) => g.status === "CASHEDOUT").length;
    const lost         = games.filter((g) => g.status === "LOST").length;
    const totalWagered = games.reduce((s, g) => s + g.betAmount, 0);
    const totalPaidOut = games.reduce((s, g) => s + g.payout, 0);

    return {
      success: true,
      data: {
        games: games.map((g) => ({ ...g, gameId: String((g as any)._id) })),
        total, page, limit, pages: Math.ceil(total / limit),
        summary: { won, lost, totalWagered, totalPaidOut, house: totalWagered - totalPaidOut },
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function forceCloseGame(gameId: string) {
  try {
    await connectMongo();
    const game = await MinesGame.findById(gameId);
    if (!game) return { success: false, error: "Game not found" };
    if (game.status !== "ACTIVE") return { success: false, error: `Game is not active (${game.status})` };
    game.status = "LOST";
    game.payout = 0;
    await game.save();
    return { success: true, data: { gameId, closed: true } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function forceCloseUserGames(userId: number) {
  try {
    await connectMongo();
    const result = await MinesGame.updateMany(
      { userId, status: "ACTIVE" },
      { $set: { status: "LOST", payout: 0 } }
    );
    return { success: true, data: { closed: result.modifiedCount } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Active Games ──────────────────────────────────────────────────────────────

export async function getActiveGames() {
  try {
    await connectMongo();
    const [mines, aviator] = await Promise.all([
      MinesGame.find({ status: "ACTIVE" }).sort({ createdAt: -1 }).lean(),
      AviatorRound.findOne({ status: { $in: ["BETTING", "FLYING"] } }).sort({ roundId: -1 }).lean(),
    ]);
    return { success: true, data: { mines, currentAviatorRound: aviator } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Engagement ────────────────────────────────────────────────────────────────

export async function getEngagementStats(game: string) {
  try {
    await connectMongo();
    const [summary, recent] = await Promise.all([
      OriginalsEngagementEvent.aggregate([
        { $match: { gameKey: game } },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $project: { _id: 0, type: "$_id", count: 1 } },
      ]),
      OriginalsEngagementEvent.find({ gameKey: game }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return { success: true, data: { summary, recent } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Per-user GGR ──────────────────────────────────────────────────────────────

export async function getPerUserGGR(game: string) {
  try {
    await connectMongo();
    const config = await OriginalsConfig.findOne({ gameKey: game }).lean();
    const overrides = (config as any)?.perUserGgrOverrides ?? {};
    const data = Object.entries(overrides).map(([uid, tgr]) => ({ userId: parseInt(uid), targetGgr: tgr }));
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function setPerUserGGR(game: string, userId: number, targetGgr: number) {
  try {
    await connectMongo();
    const data = await OriginalsConfig.findOneAndUpdate(
      { gameKey: game },
      { $set: { [`perUserGgrOverrides.${userId}`]: targetGgr } },
      { upsert: true, new: true }
    ).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removePerUserGGR(game: string, userId: number) {
  try {
    await connectMongo();
    const data = await OriginalsConfig.findOneAndUpdate(
      { gameKey: game },
      { $unset: { [`perUserGgrOverrides.${userId}`]: "" } },
      { new: true }
    ).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Player stats ──────────────────────────────────────────────────────────────

export async function getUserOriginalsStats(userId: number) {
  try {
    await connectMongo();
    const games = await MinesGame.find({ userId, status: { $ne: "ACTIVE" } }).sort({ createdAt: -1 }).lean();
    const totalGames   = games.length;
    const totalWins    = games.filter((g) => g.status === "CASHEDOUT").length;
    const totalLosses  = games.filter((g) => g.status === "LOST").length;
    const totalWagered = games.reduce((s, g) => s + g.betAmount, 0);
    const totalPaidOut = games.reduce((s, g) => s + g.payout, 0);
    return {
      success: true,
      data: {
        userId, totalGames, totalWins, totalLosses, totalWagered, totalPaidOut,
        netPnl: totalPaidOut - totalWagered,
        winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
        recentGames: games.slice(0, 10).map((g) => ({ ...g, gameId: String((g as any)._id) })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Aviator ───────────────────────────────────────────────────────────────────

export async function getAviatorHistory(limit = 50) {
  try {
    await connectMongo();
    const data = await AviatorRound.find({ status: "CRASHED" })
      .sort({ roundId: -1 }).limit(limit).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getAviatorRoundBets(roundId: number) {
  try {
    await connectMongo();
    const data = await AviatorBet.find({ roundId }).sort({ createdAt: -1 }).lean();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
