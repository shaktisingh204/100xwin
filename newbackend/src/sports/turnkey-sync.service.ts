import {
    Injectable,
    Logger,
    OnModuleInit,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosRequestConfig } from 'axios';
import Redis from 'ioredis';
import { EventsGateway } from '../events.gateway';
import { Sport, SportDocument } from './schemas/sport.schema';
import { Competition, CompetitionDocument } from './schemas/competition.schema';
import { Event, EventDocument } from './schemas/event.schema';
import { Market, MarketDocument } from './schemas/market.schema';

// ─── Feed URLs (tried in parallel – first success wins) ────────────────────
const FEED_URLS: string[] = (
    process.env.SPORTS_FEED_URLS ||
    'https://zeero.bet'
)
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''));

const API_KEY =
    process.env.SPORTS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

// Request timeout per individual URL (ms) – matches Rust 1.4 s
const URL_TIMEOUT_MS = 1400;

// ─── Authoritative sports list (matches Rust ADMIN_SPORTS) ─────────────────
const ADMIN_SPORTS = [
    { eid: 4, ename: 'Cricket', active: true, tab: true, isdefault: true, oid: 1 },
    { eid: 1, ename: 'Football', active: true, tab: true, isdefault: false, oid: 2 },
    { eid: 2, ename: 'Tennis', active: true, tab: true, isdefault: false, oid: 3 },
    { eid: 10, ename: 'Horse Racing', active: true, tab: true, isdefault: false, oid: 6 },
    { eid: 66, ename: 'Kabaddi', active: true, tab: true, isdefault: false, oid: 24 },
    { eid: 40, ename: 'Politics', active: true, tab: true, isdefault: false, oid: 20 },
    { eid: 8, ename: 'Table Tennis', active: false, tab: true, isdefault: false, oid: 7 },
    { eid: 15, ename: 'Basketball', active: true, tab: true, isdefault: false, oid: 8 },
    { eid: 6, ename: 'Boxing', active: true, tab: true, isdefault: false, oid: 9 },
    { eid: 18, ename: 'Volleyball', active: true, tab: true, isdefault: false, oid: 12 },
    { eid: 22, ename: 'Badminton', active: true, tab: true, isdefault: false, oid: 13 },
];

@Injectable()
export class TurnkeySyncService implements OnModuleInit {
    private readonly logger = new Logger(TurnkeySyncService.name);
    private redisClient: Redis | null = null;

    // Track which gmids are currently suspended to avoid re-emitting every 2s
    private suspendedGmids = new Set<string>();

    constructor(
        @InjectModel(Sport.name) private readonly sportModel: Model<SportDocument>,
        @InjectModel(Competition.name) private readonly competitionModel: Model<CompetitionDocument>,
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        @InjectModel(Market.name) private readonly marketModel: Model<MarketDocument>,
        @Inject(forwardRef(() => EventsGateway))
        private readonly eventsGateway: EventsGateway,
    ) { }

    // ─── Module init: boot sequence (same order as Rust) ──────────────────────
    async onModuleInit() {
        this.logger.log(`TurnkeySyncService booting — feeding from ${FEED_URLS.length} URLs in parallel`);
        this.logger.log(`Feed URLs: ${FEED_URLS.join(' | ')}`);

        // Boot sequence: sports → events → odds (matches Rust startup)
        try {
            await this.runSportsCron();
        } catch (e) {
            this.logger.error(`Boot sports cron failed: ${e.message}`);
        }

        try {
            await this.runEventsCron();
        } catch (e) {
            this.logger.error(`Boot events cron failed: ${e.message}`);
        }

        // Small delay so gateway is fully initialised
        setTimeout(() => {
            this.startLiveOddsSyncLoop();
            this.startPendingOddsSyncLoop();
        }, 3000);

        // Schedule recurring crons after boot
        // Events: every 60s
        setInterval(() => {
            this.runEventsCron().catch((e) =>
                this.logger.error(`Events cron error: ${e.message}`),
            );
        }, 60_000);

        // Sports: every 24h
        setInterval(() => {
            this.runSportsCron().catch((e) =>
                this.logger.error(`Sports cron error: ${e.message}`),
            );
        }, 86_400_000);
    }

    // ─── Redis accessor ────────────────────────────────────────────────────────
    private getRedis(): Redis {
        if (!this.redisClient) {
            const host = process.env.REDIS_HOST || '127.0.0.1';
            const port = parseInt(process.env.REDIS_PORT || '6379', 10);
            const password = process.env.REDIS_PASSWORD || undefined;
            const db = parseInt(process.env.REDIS_DB || '0', 10);
            this.redisClient = new Redis({ host, port, password, db, lazyConnect: true });
            this.redisClient.on('error', (e) =>
                this.logger.warn(`Redis error: ${e.message}`),
            );
        }
        return this.redisClient;
    }

    // ─── Core: fetch from all URLs in parallel (Promise.any — first win) ──────
    /**
     * Fires the same endpoint against all 3 feed URLs simultaneously.
     * Returns the first successful JSON response.
     * Throws if all URLs fail or timeout.
     */
    private async fetchFromAnyUrl(endpoint: string): Promise<any> {
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const headers = {
            'x-turnkeyxgaming-key': API_KEY,
            Accept: 'application/json',
        };
        const config: AxiosRequestConfig = { headers, timeout: URL_TIMEOUT_MS };

        const requests = FEED_URLS.map((base) =>
            axios
                .get(`${base}${path}`, config)
                .then((res) => {
                    if (res.status >= 200 && res.status < 300) return res.data;
                    throw new Error(`HTTP ${res.status} from ${base}`);
                }),
        );

        // Promise.any: resolves with first success, rejects only if ALL fail
        return Promise.any(requests);
    }

    // ─── Sports Cron ───────────────────────────────────────────────────────────
    async runSportsCron() {
        this.logger.log('[SportsCron] Seeding sports...');
        const redis = this.getRedis();
        let count = 0;

        for (const sport of ADMIN_SPORTS) {
            await this.sportModel.updateOne(
                { sport_id: String(sport.eid) },
                {
                    $set: {
                        sport_name: sport.ename,
                        isVisible: sport.active,
                        tab: sport.tab,
                        isdefault: sport.isdefault,
                        oid: sport.oid,
                    },
                },
                { upsert: true },
            );
            count++;
        }

        // Cache in Redis for 24h (matches Rust)
        const sportsJson = ADMIN_SPORTS.map((s) => ({
            eid: s.eid,
            id: s.eid,
            ename: s.ename,
            name: s.ename,
            active: s.active,
            tab: s.tab,
            isdefault: s.isdefault,
            oid: s.oid,
        }));
        await redis.setex('sports:all', 86400, JSON.stringify(sportsJson));
        this.logger.log(`[SportsCron] Seeded ${count} sports, cached in Redis.`);
    }

    // ─── Events Cron ───────────────────────────────────────────────────────────
    async runEventsCron() {
        this.logger.log('[EventsCron] Syncing matches per sport...');
        const redis = this.getRedis();
        const activeSports = ADMIN_SPORTS.filter((s) => s.tab);
        let successCount = 0;
        let failCount = 0;
        let mongoUpsertCount = 0;

        for (const sport of activeSports) {
            try {
                const res = await this.fetchFromAnyUrl(
                    `/api/v1/sports/matches?sportsid=${sport.eid}`,
                );

                const allEvents = res?.data;
                if (!allEvents) {
                    failCount++;
                    continue;
                }

                // Normalise: data can be array or object of arrays (same as Rust)
                let eventsArray: any[] = [];
                if (Array.isArray(allEvents)) {
                    eventsArray = allEvents;
                } else if (typeof allEvents === 'object') {
                    eventsArray = Object.values(allEvents).flat();
                }

                // Filter – same rules as Rust
                const validMatches = eventsArray
                    .flatMap((item: any) => (Array.isArray(item) ? item : [item]))
                    .filter((m: any) => {
                        const cname = String(m?.cname ?? '').toLowerCase();
                        const cnameNum = typeof m?.cname === 'number' ? m.cname : -1;
                        return (
                            cnameNum !== 0 &&
                            !cname.includes('virtual') &&
                            !cname.includes(' xi ') &&
                            !cname.includes('t5 ') &&
                            !cname.includes('t10')
                        );
                    });

                if (validMatches.length === 0) {
                    // Hide all events for dead sport
                    await this.eventModel.updateMany(
                        { sport_id: String(sport.eid) },
                        { $set: { isVisible: false, match_status: 'Completed' } },
                    );
                    successCount++;
                    continue;
                }

                // Cache in Redis (1h TTL)
                await redis.setex(
                    `allevents:${sport.eid}`,
                    3600,
                    JSON.stringify(validMatches),
                );

                const syncedEventIds: string[] = [];

                for (const event of validMatches) {
                    const eventId = String(
                        event?.gmid ?? event?.eid ?? '',
                    );
                    if (!eventId) continue;
                    syncedEventIds.push(eventId);

                    const eventName = String(event?.ename ?? 'Unknown');
                    const competitionId = String(event?.cid ?? '0');
                    const competitionName = String(event?.cname ?? 'Unknown');
                    const openDate = String(event?.stime ?? '');
                    const inplay = !!(event?.iplay ?? event?.inplay ?? false);

                    // ── Auto-hide logic ────────────────────────────────────────
                    // If the match started > 5h ago and is NOT live → mark Completed + hide.
                    // Live matches are always shown regardless of time.
                    const startMs = openDate ? new Date(openDate).getTime() : 0;
                    const hoursSinceStart = startMs > 0 ? (Date.now() - startMs) / 3_600_000 : 0;
                    const isExpired = !inplay && hoursSinceStart > 5;
                    const matchStatus = inplay ? 'Live' : (isExpired ? 'Completed' : 'Pending');
                    const isVisible = !isExpired; // hide expired non-live matches

                    // Team parsing
                    let homeTeam = eventName;
                    let awayTeam = '';
                    const parts = eventName.split(' v ');
                    if (parts.length === 2) {
                        homeTeam = parts[0];
                        awayTeam = parts[1];
                    }

                    // Upsert competition
                    if (competitionId !== '0') {
                        await this.competitionModel.updateOne(
                            { competition_id: competitionId },
                            {
                                $set: {
                                    competition_name: competitionName,
                                    sport_id: String(sport.eid),
                                    isVisible: true,
                                },
                            },
                            { upsert: true },
                        );
                    }

                    // Upsert event
                    await this.eventModel.updateOne(
                        { event_id: eventId },
                        {
                            $set: {
                                event_name: eventName,
                                competition_id: competitionId,
                                competition_name: competitionName,
                                sport_id: String(sport.eid),
                                open_date: openDate,
                                match_status: matchStatus,
                                isVisible,
                                in_play: inplay,
                                home_team: homeTeam,
                                away_team: awayTeam,
                            },
                        },
                        { upsert: true },
                    );
                    mongoUpsertCount++;
                }

                // Hide stale events for this sport
                if (syncedEventIds.length > 0) {
                    await this.eventModel.updateMany(
                        {
                            sport_id: String(sport.eid),
                            event_id: { $nin: syncedEventIds },
                        },
                        { $set: { isVisible: false, match_status: 'Completed' } },
                    );
                }

                successCount++;
            } catch (e) {
                this.logger.error(
                    `[EventsCron] All URLs failed for sport ${sport.eid} (${sport.ename}): ${e.message}`,
                );
                failCount++;
            }

            // Be polite between sports – matches Rust 1s delay
            await new Promise((r) => setTimeout(r, 1000));
        }

        this.logger.log(
            `[EventsCron] Done — ✅ ${successCount} sports synced, ❌ ${failCount} failed, ${mongoUpsertCount} Mongo upserts`,
        );
    }

    // ─── Odds Sync Loops ──────────────────────────────────────────────────────
    private isLiveOddsSyncRunning = false;
    private isPendingOddsSyncRunning = false;

    private async startLiveOddsSyncLoop() {
        if (this.isLiveOddsSyncRunning) return;
        this.isLiveOddsSyncRunning = true;
        this.logger.log('[LiveOddsSync] Continuous live odds sync loop started (fast sync).');

        while (true) {
            const start = Date.now();
            try {
                await this.executeOddsSyncCycle(true); // true = live matches only
            } catch (e) {
                this.logger.error(`[LiveOddsSync] Cycle error: ${e.message}`);
            }
            const elapsed = Date.now() - start;
            const wait = Math.max(0, 800 - elapsed); // 800ms for live matches
            await new Promise((r) => setTimeout(r, wait));
        }
    }

    private async startPendingOddsSyncLoop() {
        if (this.isPendingOddsSyncRunning) return;
        this.isPendingOddsSyncRunning = true;
        this.logger.log('[PendingOddsSync] Continuous pending odds sync loop started.');

        while (true) {
            const start = Date.now();
            try {
                await this.executeOddsSyncCycle(false); // false = pending matches only
            } catch (e) {
                this.logger.error(`[PendingOddsSync] Cycle error: ${e.message}`);
            }
            const elapsed = Date.now() - start;
            const wait = Math.max(0, 2500 - elapsed); // 2.5s for pending matches
            await new Promise((r) => setTimeout(r, wait));
        }
    }

    private async executeOddsSyncCycle(isLive: boolean) {
        const redis = this.getRedis();
        const activeSports = ADMIN_SPORTS.filter((s) => s.tab);

        // Collect all gmids from Redis cache (same as Rust)
        const gmidToSportId = new Map<string, number>();

        for (const sport of activeSports) {
            try {
                const cached = await redis.get(`allevents:${sport.eid}`);
                if (!cached) continue;
                const matches: any[] = JSON.parse(cached);
                for (const m of matches) {
                    if (!m) continue;
                    
                    const matchIsLive = !!(m?.inplay ?? m?.iplay ?? false);
                    if (matchIsLive !== isLive) continue; // Filter by live vs pending

                    const gmid =
                        m?.gmid != null
                            ? String(m.gmid)
                            : null;
                    if (gmid) gmidToSportId.set(gmid, sport.eid);
                }
            } catch { /* ignore */ }
        }

        if (gmidToSportId.size === 0) return;

        const allGmids = [...gmidToSportId.keys()];

        // Chunk into groups of 10 (matches Rust chunk(10))
        const chunks: string[][] = [];
        for (let i = 0; i < allGmids.length; i += 10) {
            chunks.push(allGmids.slice(i, i + 10));
        }

        // Fire all chunks in parallel
        const chunkPromises = chunks.map((chunk) => {
            const sportId = gmidToSportId.get(chunk[0])!;
            return this.processOddsChunk(chunk, sportId);
        });

        const results = await Promise.allSettled(chunkPromises);

        let successCount = 0;
        let failCount = 0;
        for (const r of results) {
            if (r.status === 'fulfilled') successCount++;
            else failCount++;
        }

        const total = chunks.length;
        if (failCount > 0) {
            this.logger.warn(
                `[${isLive ? 'LiveOddsSync' : 'PendingOddsSync'}] ${total} chunks | ✅ ${successCount} | ❌ ${failCount} failed`,
            );
        }
    }

    private async processOddsChunk(gmids: string[], sportId: number): Promise<void> {
        const redis = this.getRedis();
        const gmidStr = gmids.join('%2C');

        try {
            const res = await this.fetchFromAnyUrl(
                `/api/v1/sports/odds?gmid=${gmidStr}&sportsid=${sportId}`,
            );

            // Response shape: { data: { odds: { "<gmid>": [ ...markets ] } } }
            const oddsMap: Record<string, any[]> | null =
                res?.data?.odds ?? null;

            if (!oddsMap || Object.keys(oddsMap).length === 0) {
                // Empty response – don't suspend, just skip
                return;
            }

            const bulkOps: any[] = [];

            // Emit per-match and write to Redis + Mongo
            for (const [gmid, marketsRaw] of Object.entries(oddsMap)) {
                const markets: any[] = Array.isArray(marketsRaw) ? marketsRaw : [];
                if (markets.length === 0) continue;

                // If this gmid was previously suspended, unsuspend it
                if (this.suspendedGmids.has(gmid)) {
                    this.suspendedGmids.delete(gmid);
                    this.logger.log(`[OddsSyncResumed] Unsuspending markets for gmid ${gmid}`);
                }

                // ── Redis: store raw markets (TTL 3s, matches Rust) ──────────
                await redis.setex(`odds:${gmid}`, 3, JSON.stringify(markets));

                // ── Build socket payload + bulk ops ──────────────────────────
                const socketMarkets: any[] = [];

                for (const market of markets) {
                    const mname: string = market?.mname ?? '';
                    const mid = market?.mid != null
                        ? String(market.mid)
                        : `${gmid}_${mname}`;
                    if (!mid) continue;

                    const isSuspended = market?.status === 'SUSPENDED';

                    // Build runner array for socket (same shape as SportsService)
                    const runners: any[] = (market?.section ?? []).flatMap(
                        (sel: any, idx: number) => {
                            const selId = sel?.sid ?? sel?.selectionId ?? sel?.id ?? idx;
                            const odds: any[] = Array.isArray(sel?.odds) ? sel.odds : [];
                            return odds.map((o: any) => ({
                                ri: selId,
                                ib: o?.otype === 'back',
                                rt: o?.odds,
                                bv: o?.size,
                                nat: sel?.nat,
                            }));
                        },
                    );

                    socketMarkets.push({
                        bmi: mid,
                        mid,
                        eid: gmid,
                        mname,
                        gtype: market?.gtype,
                        ms: isSuspended ? 4 : 1,   // 4=suspended, 1=active
                        rt: runners,
                        section: market?.section,
                    });

                    // Mongo bulk upsert
                    const setDoc: Record<string, any> = {
                        event_id: gmid,
                        market_name: mname,
                        is_active: market?.status === 'OPEN',
                        status: market?.status,
                        gtype: market?.gtype,
                        rc: market?.rc,
                        visible: market?.visible,
                        pid: market?.pid,
                        max: market?.max,
                        min: market?.min,
                        iplay: market?.iplay,
                        runners_data: market?.section,
                        marketOdds: market?.section,
                    };

                    bulkOps.push({
                        updateOne: {
                            filter: { market_id: mid },
                            update: { $set: setDoc },
                            upsert: true,
                        },
                    });
                }

                // Emit via socket gateway
                if (socketMarkets.length > 0 && this.eventsGateway?.server) {
                    this.eventsGateway.emitOddsUpdate(gmid, socketMarkets);
                }
            }

            // Mongo bulk write
            if (bulkOps.length > 0) {
                await this.marketModel.bulkWrite(bulkOps, { ordered: false });
            }

            // Mark formerly-suspended gmids in this chunk as resumed
            for (const gmid of gmids) {
                if (this.suspendedGmids.has(gmid)) {
                    this.suspendedGmids.delete(gmid);
                }
            }
        } catch (e) {
            // All 3 URLs failed for this chunk — suspend affected markets
            this.logger.error(
                `[OddsSyncFailed] All URLs failed for gmids [${gmids.join(',')}]: ${e.message}`,
            );
            await this.suspendMarkets(gmids);
        }
    }

    /**
     * Emits market suspension (ms: 4) for all markets of the given gmids via socket.
     * Only emits once per gmid until it recovers, to avoid flooding.
     */
    private async suspendMarkets(gmids: string[]) {
        if (!this.eventsGateway?.server) return;

        for (const gmid of gmids) {
            if (this.suspendedGmids.has(gmid)) continue; // Already suspended

            this.suspendedGmids.add(gmid);
            this.logger.warn(`[OddsSync] Suspending all markets for gmid ${gmid} (all feeds failed)`);

            // Fetch markets from Mongo for this event to know which market IDs to suspend
            try {
                const markets = await this.marketModel
                    .find({ event_id: gmid })
                    .select('market_id market_name gtype')
                    .lean();

                const suspendPayload = markets.map((m: any) => ({
                    bmi: m.market_id,
                    mid: m.market_id,
                    eid: gmid,
                    mname: m.market_name,
                    gtype: m.gtype,
                    ms: 4,    // 4 = suspended
                    rt: [],
                }));

                if (suspendPayload.length > 0) {
                    this.eventsGateway.emitOddsUpdate(gmid, suspendPayload);
                }
            } catch (e) {
                this.logger.error(
                    `[OddsSync] Failed to suspend markets for gmid ${gmid}: ${e.message}`,
                );
            }
        }
    }
}
