'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import connectMongo from '@/lib/mongo';
import { Bet, Sport, Event as SportEvent, Competition, TopEvent, HomeEvent } from '@/models/MongoModels';
import Redis from 'ioredis';

const SPORT_LIST = [
    { eid: 4, name: 'Cricket' },
    { eid: 1, name: 'Football' },
    { eid: 2, name: 'Tennis' },
    { eid: 66, name: 'Kabaddi' },
    { eid: 10, name: 'Horse Racing' },
    { eid: 40, name: 'Politics' },
    { eid: 8, name: 'Table Tennis' },
    { eid: 15, name: 'Basketball' },
    { eid: 6, name: 'Boxing' },
    { eid: 18, name: 'Volleyball' },
    { eid: 22, name: 'Badminton' },
];

let redis: Redis | null = null;

function getRedis() {
    if (!redis) {
        redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            lazyConnect: true,
        });
        redis.on('error', () => { /* suppress */ });
    }
    return redis;
}

// ─── Sports ──────────────────────────────────────────────────────────────────

export async function getSports() {
    try {
        await connectMongo();
        const sports = await Sport.find().sort({ sport_name: 1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(sports)) };
    } catch (error) {
        return { success: false, error: 'Failed to fetch sports' };
    }
}

export async function updateSportLimits(sportId: string, minBet: number, maxBet: number) {
    try {
        await connectMongo();
        await Sport.findOneAndUpdate({ sport_id: sportId }, { minBet, maxBet });
        revalidatePath('/dashboard/sports/limits');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update limits' };
    }
}

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Get events for a specific sport, with joined competition info.
 */
export async function getSportsEvents(sportId: string) {
    try {
        await connectMongo();

        const competitions = await Competition.find({ sport_id: sportId }).select('competition_id').lean();
        const competitionIds = competitions.map((c: any) => c.competition_id);

        if (competitionIds.length === 0) {
            return { success: true, data: [] };
        }

        const events = await SportEvent.aggregate([
            { $match: { competition_id: { $in: competitionIds } } },
            { $sort: { open_date: 1 } },
            { $limit: 200 },
            {
                $lookup: {
                    from: 'competitions',
                    localField: 'competition_id',
                    foreignField: 'competition_id',
                    as: 'competition'
                }
            },
            { $unwind: { path: '$competition', preserveNullAndEmptyArrays: true } }
        ]);

        return { success: true, data: JSON.parse(JSON.stringify(events)) };
    } catch (error) {
        console.error('Fetch events error', error);
        return { success: false, error: 'Failed to fetch events' };
    }
}

/**
 * Get ALL events across ALL sports (live + upcoming), joined with competition.
 * Optionally filter by search term.
 */
export async function getAllEvents(search?: string) {
    try {
        await connectMongo();

        const matchStage: any = {};
        if (search && search.length > 1) {
            matchStage.event_name = { $regex: search, $options: 'i' };
        }

        const events = await SportEvent.aggregate([
            { $match: matchStage },
            { $sort: { open_date: 1 } },
            { $limit: 500 },
            {
                $lookup: {
                    from: 'competitions',
                    localField: 'competition_id',
                    foreignField: 'competition_id',
                    as: 'competition'
                }
            },
            { $unwind: { path: '$competition', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'sports',
                    localField: 'competition.sport_id',
                    foreignField: 'sport_id',
                    as: 'sport'
                }
            },
            { $unwind: { path: '$sport', preserveNullAndEmptyArrays: true } }
        ]);

        return { success: true, data: JSON.parse(JSON.stringify(events)) };
    } catch (error) {
        console.error('Fetch all events error', error);
        return { success: false, error: 'Failed to fetch events from database' };
    }
}

export async function getPromoTeamEvents(search = '') {
    try {
        const client = getRedis();
        await client.connect().catch(() => {});

        const q = search.toLowerCase().trim();
        const allEvents: any[] = [];

        await Promise.all(SPORT_LIST.map(async (sport) => {
            try {
                const raw = await client.get(`allevents:${sport.eid}`);
                if (!raw) return;

                const feedEvents: any[] = JSON.parse(raw);
                for (const e of feedEvents) {
                    const eventId = String(e?.gmid ?? e?.eid ?? e?.event_id ?? '');
                    if (!eventId) continue;

                    const inplay = !!(e?.iplay ?? e?.inplay ?? false);
                    const openDate = String(e?.stime ?? e?.open_date ?? '');
                    const startMs = openDate ? new Date(openDate).getTime() : 0;
                    const hours = startMs > 0 ? (Date.now() - startMs) / 3_600_000 : 0;
                    if (!inplay && hours > 5) continue;

                    const eventName = String(e?.ename ?? e?.event_name ?? '');
                    const competitionName = String(e?.cname ?? e?.competition_name ?? '');
                    if (q) {
                        const hay = `${eventName} ${competitionName}`.toLowerCase();
                        if (!hay.includes(q)) continue;
                    }

                    const nameParts = eventName.split(' v ');
                    const homeTeam = nameParts.length >= 2 ? nameParts[0].trim() : eventName;
                    const awayTeam = nameParts.length >= 2 ? nameParts[1].trim() : '';

                    allEvents.push({
                        event_id: eventId,
                        event_name: eventName,
                        home_team: homeTeam,
                        away_team: awayTeam,
                        teams: [homeTeam, awayTeam].filter(Boolean),
                        competition_name: competitionName,
                        sport_name: sport.name,
                        sport_id: String(sport.eid),
                        open_date: openDate,
                        in_play: inplay,
                        match_status: inplay ? 'Live' : 'Pending',
                    });
                }
            } catch { /* skip sport on error */ }
        }));

        const seen = new Set<string>();
        const deduped = allEvents.filter((event) => {
            if (seen.has(event.event_id)) return false;
            seen.add(event.event_id);
            return true;
        });

        deduped.sort((a, b) => {
            if (a.in_play && !b.in_play) return -1;
            if (!a.in_play && b.in_play) return 1;
            return new Date(a.open_date).getTime() - new Date(b.open_date).getTime();
        });

        return { success: true, data: deduped };
    } catch (error: any) {
        console.error('Promo team events fetch failed:', error);
        return { success: true, data: [] };
    }
}

/**
 * Toggle event visibility in the sportsbook.
 */
export async function toggleEvent(eventId: string, isVisible: boolean) {
    try {
        await connectMongo();
        await SportEvent.findOneAndUpdate({ event_id: eventId }, { isVisible });
        revalidatePath('/dashboard/sports/events');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to toggle event' };
    }
}

// ─── Popular Events (Top Events) ─────────────────────────────────────────────

/**
 * Get all top/popular event IDs.
 */
export async function getTopEvents() {
    try {
        await connectMongo();
        const events = await TopEvent.find().lean();
        return { success: true, data: JSON.parse(JSON.stringify(events)) };
    } catch (error) {
        return { success: false, error: 'Failed to fetch top events' };
    }
}

/**
 * Toggle popular status for an event.
 * If isPopular=true, adds to TopEvent collection; if false, removes it.
 */
export async function togglePopularEvent(eventId: string, isPopular: boolean, eventName?: string) {
    try {
        await connectMongo();
        if (isPopular) {
            await TopEvent.findOneAndUpdate(
                { event_id: eventId },
                { event_id: eventId, event_name: eventName || '' },
                { upsert: true, new: true }
            );
        } else {
            await TopEvent.findOneAndDelete({ event_id: eventId });
        }
        revalidatePath('/dashboard/sports/events');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to toggle popular event' };
    }
}

// ─── Home Page Events ─────────────────────────────────────────────────────────

/**
 * Get all events pinned to the home page.
 */
export async function getHomeEvents() {
    try {
        await connectMongo();
        const events = await HomeEvent.find().lean();
        return { success: true, data: JSON.parse(JSON.stringify(events)) };
    } catch (error) {
        return { success: false, error: 'Failed to fetch home events' };
    }
}

/**
 * Toggle whether an event appears in the home page sports section.
 */
export async function toggleHomeEvent(eventId: string, isHome: boolean, eventName?: string) {
    try {
        await connectMongo();
        if (isHome) {
            await HomeEvent.findOneAndUpdate(
                { event_id: eventId },
                { event_id: eventId, event_name: eventName || '' },
                { upsert: true, new: true }
            );
        } else {
            await HomeEvent.findOneAndDelete({ event_id: eventId });
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to toggle home event' };
    }
}

// ─── Bet Limits (PostgreSQL) ──────────────────────────────────────────────────

export async function getBetLimits() {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'BET_LIMITS' }
        });
        return { success: true, data: config?.value ? JSON.parse(config.value) : {} };
    } catch (error) {
        return { success: false, error: 'Failed to fetch limits' };
    }
}

export async function updateBetLimits(limits: any) {
    try {
        await prisma.systemConfig.upsert({
            where: { key: 'BET_LIMITS' },
            update: { value: JSON.stringify(limits) },
            create: { key: 'BET_LIMITS', value: JSON.stringify(limits) }
        });
        revalidatePath('/dashboard/sports/limits');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update limits' };
    }
}

// ─── Risk Management ──────────────────────────────────────────────────────────

export async function getMarketLiability() {
    try {
        await connectMongo();
        const liability = await Bet.aggregate([
            { $match: { status: 'PENDING' } },
            {
                $group: {
                    _id: { eventId: '$eventId', marketId: '$marketId' },
                    eventName: { $first: '$eventName' },
                    marketName: { $first: '$marketName' },
                    marketTotalStake: { $sum: '$stake' },
                    selections: {
                        $push: {
                            selectionName: '$selectionName',
                            totalStake: '$stake',
                            totalPayout: '$potentialWin',
                            betCount: 1
                        }
                    }
                }
            },
            { $unwind: '$selections' },
            {
                $group: {
                    _id: { eventId: '$_id.eventId', marketId: '$_id.marketId', selectionName: '$selections.selectionName' },
                    eventName: { $first: '$eventName' },
                    marketName: { $first: '$marketName' },
                    marketTotalStake: { $first: '$marketTotalStake' },
                    selectionTotalPayout: { $sum: '$selections.totalPayout' },
                    selectionTotalStake: { $sum: '$selections.totalStake' },
                    betCount: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: { eventId: '$_id.eventId', marketId: '$_id.marketId' },
                    eventName: { $first: '$eventName' },
                    marketName: { $first: '$marketName' },
                    marketTotalStake: { $first: '$marketTotalStake' },
                    selections: {
                        $push: {
                            selectionName: '$_id.selectionName',
                            totalStake: '$selectionTotalStake',
                            totalPayout: '$selectionTotalPayout',
                            betCount: '$betCount'
                        }
                    },
                    maxPayout: { $max: '$selectionTotalPayout' }
                }
            },
            {
                $project: {
                    eventName: 1,
                    marketName: 1,
                    marketTotalStake: 1,
                    worstCaseLiability: { $subtract: ['$maxPayout', '$marketTotalStake'] },
                    selections: 1
                }
            },
            { $sort: { worstCaseLiability: -1 } }
        ]);

        return { success: true, data: JSON.parse(JSON.stringify(liability)) };
    } catch (error) {
        console.error('Liability fetch failed:', error);
        return { success: false, error: 'Failed to fetch liability' };
    }
}

export async function getHighRiskBets() {
    try {
        await connectMongo();
        const bets = await Bet.find({
            status: 'PENDING',
            potentialWin: { $gt: 10000 }
        })
            .sort({ potentialWin: -1 })
            .limit(20)
            .lean();

        return { success: true, data: JSON.parse(JSON.stringify(bets)) };
    } catch (error) {
        return { success: false, error: 'Failed to fetch high risk bets' };
    }
}

export async function getHighRiskUsers() {
    try {
        const users = await prisma.user.findMany({
            where: { exposure: { gt: 10000 } },
            orderBy: { exposure: 'desc' },
            take: 20
        });
        return { success: true, data: users };
    } catch (error) {
        return { success: false, error: 'Failed' };
    }
}
