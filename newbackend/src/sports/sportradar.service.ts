import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
// No @nestjs/schedule — all scheduling done with setInterval in onModuleInit
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { BetfairSport, BetfairSportDocument } from './schemas/betfair-sport.schema';
import { BetfairEvent, BetfairEventDocument } from './schemas/betfair-event.schema';
import { BetfairMarket, BetfairMarketDocument } from './schemas/betfair-market.schema';
import { EventsGateway } from '../events.gateway';
import { SportsGateway } from './sports.gateway';

// ── Sportradar API response typings ───────────────────────────────────────────

export interface SportradarSport {
  sportName: string;  // "Cricket"
  sportId: string;    // "sr:sport:21"
  status: string;     // "ACTIVE"
  partnerId: string;
}

interface SportradarAllSportsResponse {
  success: boolean;
  message: string;
  status: string;
  errorDescription: string;
  sports: SportradarSport[];
}

export interface SportradarRunner {
  runnerId: string;       // "1" | "2" | "3"
  runnerName: string;     // "CD Junior FC"
  status: string;         // "Active"
  backPrices: { price: number; size: number }[];
  layPrices:  { price: number; size: number }[];
  sort: string;
  clothNumber: string;
  stallDraw: string;
  runnerIcon: string;
  jockeyName: string;
  trainerName: string;
  runnerAge: string;
}

export interface SportradarMatchOdds {
  marketId: string;       // "1"
  marketName: string;     // "1x2"
  marketType: string;     // "MATCH_ODDS"
  marketTime: number;
  status: string;         // "Active"
  runners: SportradarRunner[];
  limits: {
    minBetValue: number;
    maxBetValue: number;
    oddsLimit: number;
    currency: string;
  };
  category: string;
}

export interface SportradarEvent {
  awayScore: number;
  homeScore: number;
  openDate: number;       // epoch ms
  providerName: string;
  sportId: string;        // "sr:sport:1"
  sportName: string;      // "Soccer"
  competitionId: string;  // "sr:tournament:27070"
  competitionName: string;
  eventId: string;        // "sr:match:67698056"
  eventName: string;      // "CD Junior FC vs. Deportivo Cali"
  marketId: string;
  status: string;         // "UPCOMING" | "LIVE" | "CLOSED"
  eventStatus: string;
  winnerBlocked: boolean;
  markets: {
    matchOddsProvider: string;
    matchOddsBaseUrl: string;
    matchOddsTopic: string;
    matchOdds: SportradarMatchOdds[];
    bookmakers: any[];
    fancyMarkets: any[];
    premiumProvider: string;
    premiumBaseUrl: string;
    premiumTopic: string;   // WebSocket topic
    premiumSportId: string;
    premiumCompetitionId: string;
    premiumEventId: string;
    premiumMarkets: any[];
  };
  isFavourite: boolean;
  country: string;
  venue: string;
  premiumEnabled: boolean;
  catId: string;          // "LIVE" | "TODAY" | "UPCOMING"
  catName: string;
  thumbnail: string;
  team1Image: string;
  team2Image: string;
  co: boolean;
  sc: string;
}

export interface SportradarEventsCatalogueResponse {
  success: boolean;
  message: string;
  status: string;
  errorDescription: string;
  sports: SportradarEvent[];
  eventsCount: number;
}

// ── Sort order map — well-known sports come first ─────────────────────────────
const SORT_ORDER: Record<string, number> = {
  'sr:sport:21':  1,  // Cricket
  'sr:sport:1':   2,  // Soccer
  'sr:sport:5':   3,  // Tennis
  'sr:sport:2':   4,  // Basketball
  'sr:sport:12':  5,  // Rugby
  'sr:sport:4':   6,  // Ice Hockey
  'sr:sport:3':   7,  // Baseball
  'sr:sport:16':  8,  // American Football
  'sr:sport:138': 9,  // Kabaddi
  'sr:sport:31':  10, // Badminton
  'sr:sport:20':  11, // Table Tennis
  'sr:sport:23':  12, // Volleyball
  'sr:sport:29':  13, // Futsal
  'sr:sport:19':  14, // Snooker
  'sr:sport:22':  15, // Darts
  'sr:sport:117': 16, // MMA
};

const PAGE_SIZE = 100;         // events per page (API default)
const SPORTS_CACHE_TTL_SECONDS = 180; // 3 minutes TTL to retain data while syncing
const EVENTS_REDIS_TTL   = 180;
const SPORTS_REDIS_TTL   = 180;
const UPCOMING_REDIS_TTL = 180;
const INPLAY_REDIS_TTL   = 2;    // live matches must drop fast if streams fail
const API_CACHE_TTL      = 222;  // 222ms  — per-request Redis read-through TTL

/**
 * Rate budget (per host, IP-whitelisted — no proxy):
 *   300 req/s per host × 2 hosts = 600 req/s raw capacity
 *   Self-limit to 300 req/s total:
 *     • 100/s  — live-odds polling  (liveOddsTick, highest priority)
 *     • 50/s   — background syncs  (inplay 30s, upcoming 2min, sports 10min)
 *     • ~150/s — spare / passthrough
 *
 * Flow: user → backend → Redis hit (2 s TTL) → return
 *                       ↘ Redis miss → Promise.any(host1, host2) → save 2 s → return
 */

@Injectable()
export class SportradarService implements OnModuleInit {
  // Both API hosts — whitelisted, no proxy needed
  private readonly API_HOSTS: readonly string[] = [
    (process.env.SPORTRADAR_HOST_PRIMARY   ?? 'http://62.72.41.209:8087').replace(/\/$/,''),
    (process.env.SPORTRADAR_HOST_SECONDARY ?? 'http://local.turnkeyxgaming.com:8087').replace(/\/$/,''),
  ];
  private readonly API_PATH = '/api/v1/sportsradar';

  private readonly API_KEY =
    process.env.SPORTRADAR_API_KEY || '67f1a9c2d4e8b1a3c9f05673';

  // ── Backup mode: pull data from primary's /api/sportradar-proxy ─────────────
  // When enabled, every periodic sync bypasses the Sportradar upstream and
  // mirrors the primary's Redis (same keys, same TTLs) into ours.
  private readonly PROXY_URL = (process.env.SPORTRADAR_PROXY_URL ?? '').replace(/\/$/, '');
  private readonly PROXY_TOKEN = process.env.SPORTRADAR_PROXY_TOKEN ?? '';
  private readonly proxyEnabled =
    process.env.SPORTRADAR_PROXY_ENABLED === 'true' && this.PROXY_URL.length > 0;

  private readonly SPORTS_REDIS_KEY = 'sportradar:sports';

  // Throttled logs for proxy-mode syncs — one line per minute per tag
  private proxyLogTimestamps = new Map<string, number>();
  private logProxySync(tag: string, count: number): void {
    const now = Date.now();
    const last = this.proxyLogTimestamps.get(tag) ?? 0;
    if (now - last < 60_000) return;
    this.proxyLogTimestamps.set(tag, now);
    console.log(`[sportradar-proxy] ${tag} mirrored ${count} records from primary`);
  }

  private redisClient: Redis | null = null;

  private isSyncingEvents = false;

  private liveSnapshot = new Map<string, string>();
  private liveOddsLoopHandle: ReturnType<typeof setInterval> | null = null;
  private callsThisTick = 0;
  // Rate budget: 300/s live + 150/s background + ~150/s spare = 600/s self-limit
  private static readonly MAX_LIVE_CALLS_PER_TICK = 150;  // 150 calls × 2 ticks/s = 300/s peak
  private static readonly MAX_BG_CALLS_PER_SECOND = 150;

  /**
   * Throttled parallel fetch: fires `fetchers` concurrently but caps at `rps` per second.
   * Used by background syncs to stay within the 150/s background budget.
   */
  private async throttledParallel<T>(
    items: Array<() => Promise<T>>,
    rps: number = SportradarService.MAX_BG_CALLS_PER_SECOND,
  ): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    for (let i = 0; i < items.length; i += rps) {
      const chunk = items.slice(i, i + rps);
      const chunkResults = await Promise.allSettled(chunk.map((fn) => fn()));
      results.push(...chunkResults);
      // If more chunks remain, wait 0.22 s (222ms) before the next batch to achieve 222ms syncing
      if (i + rps < items.length) {
        await new Promise((r) => setTimeout(r, 222));
      }
    }
    return results;
  }

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(BetfairSport.name)
    private readonly betfairSportModel: Model<BetfairSportDocument>,
    @InjectModel(BetfairEvent.name)
    private readonly betfairEventModel: Model<BetfairEventDocument>,
    @InjectModel(BetfairMarket.name)
    private readonly betfairMarketModel: Model<BetfairMarketDocument>,
    @Inject(forwardRef(() => EventsGateway))
    private readonly gateway: EventsGateway,
    private readonly sportsGateway: SportsGateway,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  async onModuleInit() {
    if (this.proxyEnabled) {
      console.log(
        `[sportradar] proxy mode ENABLED → ${this.PROXY_URL} ` +
          `(token ${this.PROXY_TOKEN ? `set, len=${this.PROXY_TOKEN.length}` : 'MISSING — every call will 401'})`,
      );
    } else {
      console.log(
        `[sportradar] proxy mode DISABLED — polling Sportradar upstream directly ` +
          `(SPORTRADAR_PROXY_ENABLED=${process.env.SPORTRADAR_PROXY_ENABLED ?? 'unset'}, ` +
          `URL=${this.PROXY_URL || 'unset'})`,
      );
    }

    // Step 1: Seed sports if collection is empty
    try {
      const count = await this.betfairSportModel.countDocuments({});
      if (count === 0) {
        await this.seedSportsFromApi();
      }
    } catch (e) {
      // sports init check failed
    }

    // Step 2: Sync events for all active sports (non-blocking startup)
    this.syncAllSportsEvents().catch(() => {});

    // Step 3: Start real-time live odds loop
    this.startLiveOddsLoop();

    // Step 4: Background refresh loops (replaces @Cron)
    this.startBackgroundLoops();
  }

  /**
   * Replaces @Cron decorators with plain setInterval loops.
   * - Sports seed:  every 3.3 min (tripled speed)
   * - Events sync:  every 1 min (tripled speed)  (guarded by isSyncingEvents)
   * - Inplay sync:  every 30 s
   */
  private startBackgroundLoops(): void {
    setInterval(
      () => this.seedSportsFromApi().catch(() => {}),
      200_000,
    );
    setInterval(() => {
      if (this.isSyncingEvents) return;
      Promise.allSettled([
        this.syncAllSportsEvents(),
        this.syncAllInplayEvents(),
        this.syncAllUpcomingEvents(),
      ]).catch(() => {});
    }, 222);
  }

  // ── Real-time live odds loop ───────────────────────────────────────────────
  /**
   * Polls list-market for every currently-live event every TICK_MS.
   * Utilises up to MAX_CALLS_PER_SECOND of the 250/s API budget.
   * Only emits socket-data when runner prices actually change.
   */
  private readonly LIVE_ODDS_TICK_MS = 222;   // 222ms — 1.5x faster odds

  private startLiveOddsLoop(): void {
    if (this.liveOddsLoopHandle) return;
    this.liveOddsLoopHandle = setInterval(
      () => this.liveOddsTick().catch(() => {}),
      this.LIVE_ODDS_TICK_MS,
    );
    // Live odds loop started
  }

  private async liveOddsTick(): Promise<void> {
    const redis = this.getRedis();

    let liveEvents: any[] = [];
    try {
      const raw = await redis.get('sportradar:inplay:all');
      if (raw) liveEvents = JSON.parse(raw);
    } catch { return; }

    if (liveEvents.length === 0) return;

    // Reset per-tick counter
    this.callsThisTick = 0;

    // Parallel fetch, cap at MAX_LIVE_CALLS_PER_TICK (150) inflight at once
    const chunks = this.chunkArray(liveEvents, SportradarService.MAX_LIVE_CALLS_PER_TICK);

    for (const chunk of chunks) {
      if (this.callsThisTick >= SportradarService.MAX_LIVE_CALLS_PER_TICK) break;

      await Promise.allSettled(
        chunk.map(async (ev: any) => {
          const eventId = ev.eventId;
          const sportId = ev.sportId;
          if (!eventId || !sportId) return;
      if (this.callsThisTick >= SportradarService.MAX_LIVE_CALLS_PER_TICK) return;

          this.callsThisTick++;

          try {
            const data = await this.fetchListMarket(sportId, eventId);
            if (!data?.success || !data?.event) return;

            // Build comparable hash
            const newHash = this.buildLiveEventHash(data.event);
            const prevHash = this.liveSnapshot.get(eventId);

            if (newHash === prevHash) return; // unchanged — skip
            this.liveSnapshot.set(eventId, newHash);

            // Keep the live market snapshot ultra-short so stale odds expire almost immediately.
            await redis
              .set(`sportradar:market:${eventId}`, JSON.stringify(data), 'EX', INPLAY_REDIS_TTL)
              .catch(() => {});

            // Emit to frontend
            this.emitSportradarOdds(eventId, data.event);
          } catch {
            // Silently ignore individual event errors
          }
        }),
      );
    }
  }

  /**
   * Builds a compact string fingerprint of the live event snapshot.
   * Includes event status, score, and every market group rendered on the
   * match-detail page so sockets fire when any visible detail changes.
   */
  private buildLiveEventHash(rawEvent: any): string {
    return JSON.stringify({
      eventId: rawEvent?.eventId ?? '',
      eventName: rawEvent?.eventName ?? '',
      competitionName: rawEvent?.competitionName ?? '',
      openDate: rawEvent?.openDate ?? '',
      status: rawEvent?.status ?? '',
      eventStatus: rawEvent?.eventStatus ?? '',
      catId: rawEvent?.catId ?? '',
      homeScore: rawEvent?.homeScore ?? '',
      awayScore: rawEvent?.awayScore ?? '',
      country: rawEvent?.country ?? '',
      venue: rawEvent?.venue ?? '',
      winnerBlocked: !!rawEvent?.winnerBlocked,
      isFavourite: !!rawEvent?.isFavourite,
      premiumEnabled: !!rawEvent?.premiumEnabled,
      thumbnail: rawEvent?.thumbnail ?? '',
      team1Image: rawEvent?.team1Image ?? '',
      team2Image: rawEvent?.team2Image ?? '',
      markets: rawEvent?.markets ?? {},
    });
  }

  /**
   * Emits a sportradar_odds socket-data packet.
   * Format mirrors the existing `odds` messageType so frontend BetContext
   * processes it transparently.
   */
  private emitSportradarOdds(eventId: string, rawEvent?: any): void {
    if (!this.gateway?.server && !this.sportsGateway?.server) return;

    const matchOdds: any[] = rawEvent?.markets?.matchOdds ?? [];

    // Build socket-compatible market array
    const markets = matchOdds.map((m) => ({
      bmi: `${eventId}:${m.marketId}`,
      mid: `${eventId}:${m.marketId}`,
      eid: eventId,
      mname: m.marketName,
      mtype: m.marketType,
      ms: m.status === 'Active' ? 1 : 4,  // 4 = suspended
      rt: (m.runners ?? []).flatMap((r: any) => [
        // Back runners
        ...(r.backPrices ?? []).map((p: any) => ({
          ri: r.runnerId,
          ib: true,
          rt: p.price,
          bv: p.size,
          nat: r.runnerName,
        })),
        // Lay runners
        ...(r.layPrices ?? []).map((p: any) => ({
          ri: r.runnerId,
          ib: false,
          rt: p.price,
          bv: p.size,
          nat: r.runnerName,
        })),
      ]),
      // Include SR-native runner data for match detail page
      runners: m.runners,
    }));

    const basePayload = {
      messageType: 'sportradar_odds',
      eventId,
      data: markets,
      // Pass live scores if available
      score: rawEvent ? { home: rawEvent.homeScore, away: rawEvent.awayScore } : undefined,
    };

    const matchPayload = {
      ...basePayload,
      event: rawEvent,
    };

    if (this.sportsGateway?.server) {
      this.sportsGateway.emitMatchData(eventId, matchPayload);
      this.sportsGateway.emitLobbyData(basePayload);
    }

    if (this.gateway?.server) {
      // Targeted: only clients in this match room
      this.gateway.server.to(`match:${eventId}`).emit('socket-data', matchPayload);
      // Global: legacy shared socket consumers
      this.gateway.server.emit('socket-data', basePayload);
    }
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }

  // ── Scheduled syncs ───────────────────────────────────────────────────────


  // ── Redis helpers ─────────────────────────────────────────────────────────────

  private getRedis(): Redis {
    if (!this.redisClient) {
      const host = process.env.REDIS_HOST || '127.0.0.1';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD || undefined;
      const db = parseInt(process.env.REDIS_DB || '0', 10);
      this.redisClient = new Redis({ host, port, password, db });
      this.redisClient.on('error', () => {});
    }
    return this.redisClient;
  }

  private eventsRedisKey(sportId: string): string {
    return `sportradar:events:${sportId}`;
  }

  // ── Proxy helper (backup mode) ────────────────────────────────────────────
  /**
   * GET from the primary's /api/sportradar-proxy/<path>. Response shape:
   *   { key: string, data: <original cached JSON> }
   * Returns the `data` field. 404 → null (primary hasn't warmed the key yet).
   */
  private async fetchFromProxy<T = any>(path: string): Promise<T | null> {
    const url = `${this.PROXY_URL}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const res = await firstValueFrom(
        this.httpService.get<{ key: string; data: T }>(url, {
          headers: { 'x-api-token': this.PROXY_TOKEN },
          timeout: 8_000,
        }),
      );
      return (res.data?.data ?? null) as T | null;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) {
        console.warn(`[sportradar-proxy] 404 not warm: ${path}`);
        return null;
      }
      const body = e?.response?.data;
      const bodyPreview =
        typeof body === 'string' ? body.slice(0, 200) : body ? JSON.stringify(body).slice(0, 200) : '';
      console.error(
        `[sportradar-proxy] ERROR ${path} — status=${status ?? 'no-response'} ` +
          `code=${e?.code ?? ''} msg=${e?.message ?? ''} body=${bodyPreview}`,
      );
      throw e;
    }
  }

  // ── Core API helper — dual-host race + 2s Redis cache ────────────────────────

  /**
   * GET from Sportradar: Redis hit (2s TTL) → miss → Promise.race both hosts.
   */
  private async apiGet<T>(
    path: string,
    params: Record<string, string | number> = {},
    options?: { bypassCache?: boolean },
  ): Promise<T> {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();

    const cacheKey = `sr:cache:${path}:${qs}`;
    const redis    = this.getRedis();

    // 1. Redis read-through (2s TTL)
    if (!options?.bypassCache) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached) as T;
      } catch { /* fall through */ }
    }

    // 2. Fire both hosts in parallel — whichever responds first wins (Promise.any).
    //    Promise.any (unlike Promise.race) only resolves on the first FULFILLMENT,
    //    so a fast rejection from one host never kills the call.
    const fetchers = this.API_HOSTS.map((host) =>
      firstValueFrom(
        this.httpService.get<T>(`${host}${this.API_PATH}/${path}${qs ? '?' + qs : ''}`, {
          headers: { 'x-betnex-key': this.API_KEY },
          timeout: 8_000,
        }),
      ).then((res) => res.data),
    );

    const data = await Promise.any(fetchers);

    // 3. Cache result in Redis (500ms TTL) so the next request is instant
    if (!options?.bypassCache) {
      redis.set(cacheKey, JSON.stringify(data), 'PX', API_CACHE_TTL).catch(() => {});
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPORTS — allsports
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Fetches all active sports from `/api/v1/sportsradar/allsports`.
   * IP-whitelisted — must be called server-side only.
   */
  async fetchAllSportsFromApi(): Promise<SportradarSport[]> {
    const body = await this.apiGet<SportradarAllSportsResponse>('allsports');

    if (!body.success || !Array.isArray(body.sports)) {
      throw new Error(`Sportradar allsports error: ${body.message || body.status}`);
    }

    return body.sports;
  }

  /**
   * Seeds all ACTIVE Sportradar sports into the betfair_sports collection.
   * Existing records are updated; new ones are inserted.
   */
  async seedSportsFromApi(): Promise<{ success: boolean; seeded: number; message: string }> {
    if (this.proxyEnabled) {
      try {
        const mapped = await this.fetchFromProxy<any[]>('/sports');
        if (!mapped) {
          return { success: true, seeded: 0, message: 'Primary sports cache not warm yet' };
        }
        await this.getRedis()
          .set(this.SPORTS_REDIS_KEY, JSON.stringify(mapped), 'EX', SPORTS_REDIS_TTL)
          .catch(() => {});
        const n = Array.isArray(mapped) ? mapped.length : 0;
        this.logProxySync('sports', n);
        return {
          success: true,
          seeded: n,
          message: `Mirrored ${n} sports from primary proxy`,
        };
      } catch (e: any) {
        return { success: false, seeded: 0, message: e?.message ?? 'proxy fetch failed' };
      }
    }

    try {
      const sports = await this.fetchAllSportsFromApi();
      const active = sports.filter((s) => s.status === 'ACTIVE');

      const ops = active.map((s, idx) => ({
        updateOne: {
          filter: { sportId: s.sportId },
          update: {
            $set: {
              name: s.sportName,
              sortOrder: SORT_ORDER[s.sportId] ?? 50 + idx,
              isActive: true,
              isTab: true,
            },
            $setOnInsert: {
              isDefault: s.sportId === 'sr:sport:21', // Cricket default
            },
          },
          upsert: true,
        },
      }));

      const result = await this.betfairSportModel.bulkWrite(ops, { ordered: false });

      // Bust Redis cache
      await this.getRedis().del(this.SPORTS_REDIS_KEY).catch(() => {});

      return {
        success: true,
        seeded: active.length,
        message: `${active.length} sports seeded (${result.upsertedCount} new, ${result.modifiedCount} updated)`,
      };
    } catch (e) {
      return { success: false, seeded: 0, message: e.message };
    }
  }

  /** Returns cached sports list. Shape matches existing /sports/list endpoint. */
  async getSportsFromCache(): Promise<any[]> {
    const redis = this.getRedis();

    try {
      const cached = await redis.get(this.SPORTS_REDIS_KEY);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    try {
      const sports = await this.betfairSportModel
        .find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      const mapped = sports.map((s: any) => ({
        sport_id: s.sportId,
        sport_name: s.name,
        isVisible: true,
        tab: s.isTab !== false,
        isdefault: !!s.isDefault,
        sortOrder: s.sortOrder ?? 0,
      }));

      await redis
        .set(this.SPORTS_REDIS_KEY, JSON.stringify(mapped), 'EX', SPORTS_REDIS_TTL)
        .catch(() => {});

      return mapped;
    } catch (e) {
      return [];
    }
  }

  /** Raw list from Sportradar API — no caching. Admin debug/preview only. */
  async getRawSportsFromApi(): Promise<{ success: boolean; sports: SportradarSport[]; count: number }> {
    try {
      const sports = await this.fetchAllSportsFromApi();
      return { success: true, sports, count: sports.length };
    } catch (e) {
      return { success: false, sports: [], count: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENTS — events-catalogue (paginated)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Fetches ONE page of events-catalogue for a sport.
   * `GET /api/v1/sportsradar/events-catalogue?sportId={id}&pageNo={n}`
   */
  async fetchEventsPage(sportId: string, pageNo: number = 1): Promise<SportradarEventsCatalogueResponse> {
    return this.apiGet<SportradarEventsCatalogueResponse>('events-catalogue', {
      sportId,
      pageNo,
    });
  }

  /**
   * Fetches ALL pages of events for a sport and returns the merged list.
   * Stops when all pages are fetched or on error.
   */
  async fetchAllEventsForSport(sportId: string): Promise<SportradarEvent[]> {
    const firstPage = await this.fetchEventsPage(sportId, 1);

    if (!firstPage.success || !Array.isArray(firstPage.sports)) {
      throw new Error(`events-catalogue error for ${sportId}: ${firstPage.message}`);
    }

    const allEvents: SportradarEvent[] = [...firstPage.sports];
    const totalEvents = firstPage.eventsCount;
    const totalPages = Math.ceil(totalEvents / PAGE_SIZE);

    // Fetch remaining pages sequentially to respect server rate limits
    for (let page = 2; page <= totalPages; page++) {
      try {
        const resp = await this.fetchEventsPage(sportId, page);
        if (resp.success && Array.isArray(resp.sports)) {
          allEvents.push(...resp.sports);
        }
        // Small delay between pages to be polite
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        break;
      }
    }

    return allEvents;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INPLAY EVENTS — /api/v1/sportsradar/inplay-events
  // Real scores (homeScore/awayScore), status: IN_PLAY, 30s refresh
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Fetches one page of in-play events for a sport.
   * `GET /api/v1/sportsradar/inplay-events?sportId={id}&pageNo={n}`
   * Returns full event objects with real homeScore/awayScore + status: IN_PLAY.
   */
  async fetchInplayEventsPage(sportId: string, pageNo: number = 1): Promise<any> {
    return this.apiGet<any>('inplay-events', { sportId, pageNo });
  }

  /**
   * Fetches ALL inplay events for a sport (handles pagination).
   */
  async fetchAllInplayEventsForSport(sportId: string): Promise<SportradarEvent[]> {
    try {
      const first = await this.fetchInplayEventsPage(sportId, 1);
      if (!first.success || !Array.isArray(first.sports)) return [];

      const all: SportradarEvent[] = [...first.sports];
      const total = first.eventsCount ?? first.sports.length;
      const pages = Math.ceil(total / PAGE_SIZE);

      for (let p = 2; p <= pages; p++) {
        try {
          const resp = await this.fetchInplayEventsPage(sportId, p);
          if (resp.success && Array.isArray(resp.sports)) all.push(...resp.sports);
          await new Promise((r) => setTimeout(r, 150));
        } catch { break; }
      }

      return all;
    } catch (e) {
      return [];
    }
  }

  /**
   * Syncs inplay events for ALL active sports and writes to Redis.
   * Redis key: sportradar:inplay:{sportId}  (TTL 30s)
   * Also writes merged sportradar:inplay:all  (all sports flat, TTL 30s)
   */
  async syncAllInplayEvents(): Promise<void> {
    if (this.proxyEnabled) {
      try {
        const redis = this.getRedis();
        const allInplay = (await this.fetchFromProxy<SportradarEvent[]>('/inplay')) ?? [];

        const sportIds = Object.keys(SORT_ORDER);
        const bySport = new Map<string, SportradarEvent[]>();
        for (const ev of allInplay) {
          const arr = bySport.get(ev.sportId) || [];
          arr.push(ev);
          bySport.set(ev.sportId, arr);
        }

        const pipeline = redis.pipeline();
        sportIds.forEach((sportId) => {
          const events = bySport.get(sportId) || [];
          pipeline.set(
            `sportradar:inplay:${sportId}`,
            JSON.stringify(events),
            'EX',
            INPLAY_REDIS_TTL,
          );
          for (const ev of events) {
            pipeline.set(`sportradar:event:${ev.eventId}`, JSON.stringify(ev), 'EX', INPLAY_REDIS_TTL);
            pipeline.set(`sportradar:odds:${ev.eventId}`, JSON.stringify(ev.markets), 'EX', INPLAY_REDIS_TTL);
          }
        });
        pipeline.set('sportradar:inplay:all', JSON.stringify(allInplay), 'EX', INPLAY_REDIS_TTL);
        await pipeline.exec().catch(() => {});
        this.logProxySync('inplay', allInplay.length);
      } catch {
        /* ignore proxy errors, next tick retries */
      }
      return;
    }

    // Use SORT_ORDER keys — always sr:sport:X format, never old numeric IDs
    const sportIds = Object.keys(SORT_ORDER);

    const redis = this.getRedis();
    const allInplay: SportradarEvent[] = [];

    // Throttled fetch: max MAX_BG_CALLS_PER_SECOND sports per second
    // Each sport fetch itself may hit both hosts via Promise.any in apiGet.
    const results = await this.throttledParallel(
      sportIds.map((id) => () => this.fetchAllInplayEventsForSport(id)),
    );

    // Collect all inplay events first
    sportIds.forEach((sportId, i) => {
      const events = results[i].status === 'fulfilled' ? results[i].value : [] as SportradarEvent[];
      allInplay.push(...events);
    });

    // Merge admin-set fields (thumbnail, team1Image, team2Image) from MongoDB
    if (allInplay.length > 0) {
      const inplayIds = allInplay.map((ev) => ev.eventId);
      const adminDocs = await this.betfairEventModel
        .find({ eventId: { $in: inplayIds } }, { eventId: 1, thumbnail: 1, team1Image: 1, team2Image: 1 })
        .lean();
      const adminMap = new Map(adminDocs.map((d: any) => [d.eventId, d]));
      for (const ev of allInplay) {
        const admin = adminMap.get(ev.eventId);
        if (admin) {
          (ev as any).thumbnail = admin.thumbnail || '';
          (ev as any).team1Image = admin.team1Image || '';
          (ev as any).team2Image = admin.team2Image || '';
        }
      }
    }

    // Group back by sport for per-sport caching
    const bySport = new Map<string, SportradarEvent[]>();
    for (const ev of allInplay) {
      const arr = bySport.get(ev.sportId) || [];
      arr.push(ev);
      bySport.set(ev.sportId, arr);
    }

    const pipeline = redis.pipeline();

    sportIds.forEach((sportId) => {
      const events = bySport.get(sportId) || [];

      // Per-sport inplay cache
      pipeline.set(
        `sportradar:inplay:${sportId}`,
        JSON.stringify(events),
        'EX',
        INPLAY_REDIS_TTL,
      );

      // Per-event inplay keys (overwrite with latest score)
      for (const ev of events) {
        pipeline.set(`sportradar:event:${ev.eventId}`, JSON.stringify(ev), 'EX', INPLAY_REDIS_TTL);
        pipeline.set(`sportradar:odds:${ev.eventId}`, JSON.stringify(ev.markets), 'EX', INPLAY_REDIS_TTL);
      }
    });

    // All-sports flat inplay array
    pipeline.set('sportradar:inplay:all', JSON.stringify(allInplay), 'EX', INPLAY_REDIS_TTL);

    await pipeline.exec().catch(() => {}); /* pipeline error */

  }

  /**
   * Returns inplay events for a sport from Redis.
   * Falls back to empty array (inplay data is ephemeral).
   */
  async getInplayEventsBySport(sportId: string): Promise<SportradarEvent[]> {
    const redis = this.getRedis();
    try {
      const cached = await redis.get(`sportradar:inplay:${sportId}`);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [];
  }

  /**
   * Returns ALL inplay events (all sports) from the flat Redis cache.
   */
  async getAllInplayEvents(): Promise<SportradarEvent[]> {
    const redis = this.getRedis();
    try {
      const cached = await redis.get('sportradar:inplay:all');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPCOMING EVENTS — /api/v1/sportsradar/upcoming-events
  // status: UPCOMING, Redis TTL 2 min
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Fetches one page of upcoming events for a sport.
   * `GET /api/v1/sportsradar/upcoming-events?sportId={id}&pageNo={n}`
   */
  async fetchUpcomingEventsPage(sportId: string, pageNo: number = 1): Promise<any> {
    return this.apiGet<any>('upcoming-events', { sportId, pageNo });
  }

  /**
   * Fetches ALL upcoming events for a sport (handles pagination).
   */
  async fetchAllUpcomingEventsForSport(sportId: string): Promise<SportradarEvent[]> {
    try {
      const first = await this.fetchUpcomingEventsPage(sportId, 1);
      if (!first.success || !Array.isArray(first.sports)) return [];

      const all: SportradarEvent[] = [...first.sports];
      const total = first.eventsCount ?? first.sports.length;
      const pages = Math.ceil(total / PAGE_SIZE);

      for (let p = 2; p <= pages; p++) {
        try {
          const resp = await this.fetchUpcomingEventsPage(sportId, p);
          if (resp.success && Array.isArray(resp.sports)) all.push(...resp.sports);
          await new Promise((r) => setTimeout(r, 150));
        } catch { break; }
      }

      return all;
    } catch (e) {
      return [];
    }
  }

  /**
   * Returns upcoming events for a sport — Redis cache (2min TTL), live fetch on miss.
   */
  async getUpcomingEventsBySport(sportId: string): Promise<SportradarEvent[]> {
    const redis = this.getRedis();
    const key = `sportradar:upcoming:${sportId}`;
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    // Cache miss — fetch live
    const events = await this.fetchAllUpcomingEventsForSport(sportId);

    // Merge admin-set fields from MongoDB
    if (events.length > 0) {
      const ids = events.map((ev) => ev.eventId);
      const adminDocs = await this.betfairEventModel
        .find({ eventId: { $in: ids } }, { eventId: 1, thumbnail: 1, team1Image: 1, team2Image: 1 })
        .lean();
      const adminMap = new Map(adminDocs.map((d: any) => [d.eventId, d]));
      for (const ev of events) {
        const admin = adminMap.get(ev.eventId);
        if (admin) {
          (ev as any).thumbnail = admin.thumbnail || '';
          (ev as any).team1Image = admin.team1Image || '';
          (ev as any).team2Image = admin.team2Image || '';
        }
      }
    }

    await redis.set(key, JSON.stringify(events), 'EX', UPCOMING_REDIS_TTL).catch(() => {});
    return events;
  }

  /**
   * Returns ALL upcoming events (all sports) from Redis pipeline.
   */
  async getAllUpcomingEvents(): Promise<SportradarEvent[]> {
    const redis = this.getRedis();
    const key = 'sportradar:upcoming:all';
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (_) {}

    // Fallback: combined key missing (startup, Redis eviction, or sports-sync
    // lock holding off the upcoming sync). Aggregate from per-sport keys so
    // freshly created matches still reach the admin within one sync tick.
    const sportIds = Object.keys(SORT_ORDER);
    const pipeline = redis.pipeline();
    sportIds.forEach((id) => pipeline.get(`sportradar:upcoming:${id}`));
    let results: any[] = [];
    try {
      results = (await pipeline.exec()) ?? [];
    } catch (_) {}

    const aggregated: SportradarEvent[] = [];
    for (const r of results) {
      const raw = r?.[1];
      if (!raw) continue;
      try {
        const arr = JSON.parse(raw) as SportradarEvent[];
        if (Array.isArray(arr)) aggregated.push(...arr);
      } catch (_) {}
    }

    if (aggregated.length > 0) {
      await redis
        .set(key, JSON.stringify(aggregated), 'EX', UPCOMING_REDIS_TTL)
        .catch(() => {});
    }
    return aggregated;
  }

  /**
   * Returns event counts per sport:
   *   upcoming count (from sportradar:upcoming:{sportId})
   *   inplay  count  (from sportradar:inplay:{sportId})
   *   total          (sum)
   *   sportId, sportName
   * Reads all sport caches in a single Redis pipeline.
   */
  async getEventsCount(): Promise<{
    sports: { sportId: string; sportName: string; upcoming: number; inplay: number; total: number }[];
    totalEvents: number;
    totalLive: number;
  }> {
    const redis = this.getRedis();
    const sportIds = Object.keys(SORT_ORDER);

    // Build pipeline: fetch upcoming+inplay key for every sport
    const pipeline = redis.pipeline();
    sportIds.forEach((id) => {
      pipeline.get(`sportradar:upcoming:${id}`);
      pipeline.get(`sportradar:inplay:${id}`);
    });

    let results: any[] = [];
    try {
      results = await pipeline.exec() ?? [];
    } catch (_) {}

    const sports: { sportId: string; sportName: string; upcoming: number; inplay: number; total: number }[] = [];
    let totalEvents = 0;
    let totalLive   = 0;

    sportIds.forEach((sportId, i) => {
      const upcomingRaw = results[i * 2]?.[1];
      const inplayRaw   = results[i * 2 + 1]?.[1];

      let upcomingCount = 0;
      let inplayCount   = 0;

      try { if (upcomingRaw) upcomingCount = JSON.parse(upcomingRaw).length; } catch (_) {}
      try { if (inplayRaw)   inplayCount   = JSON.parse(inplayRaw).length;   } catch (_) {}

      const total = upcomingCount + inplayCount;
      totalEvents += total;
      totalLive   += inplayCount;

      // Get sport name from any cached event
      let sportName = sportId;
      try {
        if (upcomingRaw) {
          const evs = JSON.parse(upcomingRaw) as SportradarEvent[];
          if (evs[0]?.sportName) sportName = evs[0].sportName;
        }
      } catch (_) {}

      sports.push({ sportId, sportName, upcoming: upcomingCount, inplay: inplayCount, total });
    });

    // Only return sports that have at least one event
    return {
      sports: sports.filter((s) => s.total > 0),
      totalEvents,
      totalLive,
    };
  }

  /**
   * Syncs upcoming events for ALL sports and writes to Redis.
   * Redis key: sportradar:upcoming:{sportId}  (TTL 2min)
   * Also writes sportradar:upcoming:all  (all sports flat, TTL 2min)
   */
  async syncAllUpcomingEvents(): Promise<void> {
    if (this.proxyEnabled) {
      try {
        const redis = this.getRedis();
        const allUpcoming = (await this.fetchFromProxy<SportradarEvent[]>('/upcoming')) ?? [];

        const sportIds = Object.keys(SORT_ORDER);
        const bySport = new Map<string, SportradarEvent[]>();
        for (const ev of allUpcoming) {
          const arr = bySport.get(ev.sportId) || [];
          arr.push(ev);
          bySport.set(ev.sportId, arr);
        }

        const pipeline = redis.pipeline();
        sportIds.forEach((sportId) => {
          const events = bySport.get(sportId) || [];
          pipeline.set(
            `sportradar:upcoming:${sportId}`,
            JSON.stringify(events),
            'EX',
            UPCOMING_REDIS_TTL,
          );
        });
        pipeline.set('sportradar:upcoming:all', JSON.stringify(allUpcoming), 'EX', UPCOMING_REDIS_TTL);
        await pipeline.exec().catch(() => {});
        this.logProxySync('upcoming', allUpcoming.length);
      } catch {
        /* ignore proxy errors, next tick retries */
      }
      return;
    }

    const sportIds = Object.keys(SORT_ORDER);
    const redis = this.getRedis();
    const allUpcoming: SportradarEvent[] = [];

    // Throttled fetch: respects 100/s background budget
    const results = await this.throttledParallel(
      sportIds.map((id) => () => this.fetchAllUpcomingEventsForSport(id)),
    );

    sportIds.forEach((sportId, i) => {
      const events = results[i].status === 'fulfilled' ? results[i].value : [] as SportradarEvent[];
      allUpcoming.push(...events);
    });

    // Merge admin-set fields (thumbnail, team1Image, team2Image) from MongoDB
    if (allUpcoming.length > 0) {
      const upcomingIds = allUpcoming.map((ev) => ev.eventId);
      const adminDocs = await this.betfairEventModel
        .find({ eventId: { $in: upcomingIds } }, { eventId: 1, thumbnail: 1, team1Image: 1, team2Image: 1 })
        .lean();
      const adminMap = new Map(adminDocs.map((d: any) => [d.eventId, d]));
      for (const ev of allUpcoming) {
        const admin = adminMap.get(ev.eventId);
        if (admin) {
          (ev as any).thumbnail = admin.thumbnail || '';
          (ev as any).team1Image = admin.team1Image || '';
          (ev as any).team2Image = admin.team2Image || '';
        }
      }
    }

    // Group by sport for per-sport caching
    const bySport = new Map<string, SportradarEvent[]>();
    for (const ev of allUpcoming) {
      const arr = bySport.get(ev.sportId) || [];
      arr.push(ev);
      bySport.set(ev.sportId, arr);
    }

    const pipeline = redis.pipeline();

    sportIds.forEach((sportId) => {
      const events = bySport.get(sportId) || [];
      pipeline.set(
        `sportradar:upcoming:${sportId}`,
        JSON.stringify(events),
        'EX',
        UPCOMING_REDIS_TTL,
      );
    });

    pipeline.set('sportradar:upcoming:all', JSON.stringify(allUpcoming), 'EX', UPCOMING_REDIS_TTL);

    await pipeline.exec().catch(() => {}); /* pipeline error */

  }

  private mapEvent(ev: SportradarEvent) {
    const iso = ev.openDate ? new Date(ev.openDate).toISOString() : '';
    const [homeTeam, awayTeam] = ev.eventName.split(' vs. ').map((s) => s.trim());

    return {
      eventId: ev.eventId,
      sportId: ev.sportId,
      competitionId: ev.competitionId,
      competitionName: ev.competitionName,
      countryCode: ev.country || '',
      eventName: ev.eventName,
      homeTeam: homeTeam || '',
      awayTeam: awayTeam || '',
      marketStartTime: iso,
      inplay: ev.status === 'LIVE' || ev.catId === 'LIVE',
      status: ev.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
      isVisible: true,
      primaryMarketId: ev.eventId + ':1', // composite: eventId + marketId "1"
      primaryMarketType: 'MATCH_ODDS',
    };
  }

  /**
   * Maps Sportradar matchOdds array → BetfairMarket documents.
   */
  private mapMarkets(ev: SportradarEvent): any[] {
    const iso = ev.openDate ? new Date(ev.openDate).toISOString() : '';

    return (ev.markets?.matchOdds ?? []).map((m) => {
      // The API uses marketId "1", "2"… — prefix with eventId to make globally unique
      const uniqueMarketId = `${ev.eventId}:${m.marketId}`;

      const runners = m.runners.map((r) => ({
        selectionId: Number(r.runnerId),
        runnerName: r.runnerName,
        handicap: 0,
        status: r.status === 'Active' ? 'ACTIVE' : 'SUSPENDED',
        lastPriceTraded: r.backPrices?.[0]?.price ?? 0,
        totalMatched: 0,
        availableToBack: r.backPrices ?? [],
        availableToLay:  r.layPrices ?? [],
      }));

      return {
        marketId: uniqueMarketId,
        eventId: ev.eventId,
        sportId: ev.sportId,
        competitionId: ev.competitionId,
        marketName: m.marketName,
        marketType: m.marketType,
        bettingType: 'ODDS',
        marketStartTime: iso,
        status: m.status === 'Active' ? 'OPEN' : 'SUSPENDED',
        inplay: ev.status === 'LIVE' || ev.catId === 'LIVE',
        stopBet: false,
        numberOfRunners: runners.length,
        numberOfActiveRunners: runners.filter((r) => r.status === 'ACTIVE').length,
        runners,
        isVisible: true,
        oddsUpdatedAt: new Date(),
      };
    });
  }

  /**
   * Fetches all events for a sport, upserts into MongoDB, and caches in Redis.
   * Returns summary stats.
   */
  async syncEventsForSport(sportId: string): Promise<{
    sportId: string;
    eventCount: number;
    marketCount: number;
    error?: string;
  }> {
    if (this.proxyEnabled) {
      try {
        const events = (await this.fetchFromProxy<SportradarEvent[]>(`/events/${sportId}`)) ?? [];
        if (events.length === 0) return { sportId, eventCount: 0, marketCount: 0 };

        const redis = this.getRedis();
        const pipeline = redis.pipeline();
        pipeline.set(
          this.eventsRedisKey(sportId),
          JSON.stringify(events),
          'EX',
          EVENTS_REDIS_TTL,
        );
        for (const ev of events) {
          const ttl =
            ev.status === 'LIVE' || (ev as any).status === 'IN_PLAY' || ev.eventStatus === 'LIVE'
              ? INPLAY_REDIS_TTL
              : UPCOMING_REDIS_TTL;
          pipeline.set(`sportradar:event:${ev.eventId}`, JSON.stringify(ev), 'EX', ttl);
          pipeline.set(`sportradar:odds:${ev.eventId}`, JSON.stringify(ev.markets), 'EX', ttl);
        }
        await pipeline.exec().catch(() => {});
        return { sportId, eventCount: events.length, marketCount: 0 };
      } catch (e: any) {
        return { sportId, eventCount: 0, marketCount: 0, error: e?.message ?? 'proxy fetch failed' };
      }
    }

    try {
      const events = await this.fetchAllEventsForSport(sportId);
      const redis = this.getRedis();

      if (events.length === 0) {
        return { sportId, eventCount: 0, marketCount: 0 };
      }

      // ── Merge admin-set fields from MongoDB into events before caching ────
      // Fields like thumbnail, team1Image, team2Image are set by admin and
      // stored in MongoDB — the Sportradar API doesn't know about them.
      const eventIds = events.map((ev) => ev.eventId);
      const adminDocs = await this.betfairEventModel
        .find({ eventId: { $in: eventIds } }, { eventId: 1, thumbnail: 1, team1Image: 1, team2Image: 1 })
        .lean();
      const adminMap = new Map(adminDocs.map((d: any) => [d.eventId, d]));

      for (const ev of events) {
        const admin = adminMap.get(ev.eventId);
        if (admin) {
          (ev as any).thumbnail = admin.thumbnail || '';
          (ev as any).team1Image = admin.team1Image || '';
          (ev as any).team2Image = admin.team2Image || '';
        }
      }

      // ── Cache FULL raw events in Redis ────────────────────────────────────
      //
      // Two layers:
      //  1. sportradar:events:{sportId}         → full array of ALL events for this sport
      //  2. sportradar:event:{eventId}           → full raw event (every field, every market,
      //                                            every runner, every price) for match-detail page
      //
      // We use a Redis pipeline so all SET commands are sent in a single round-trip.

      const pipeline = redis.pipeline();

      // 1. Sport-level list (full objects, not trimmed)
      pipeline.set(
        this.eventsRedisKey(sportId),
        JSON.stringify(events),
        'EX',
        EVENTS_REDIS_TTL,
      );

      // 2. Per-event keys — every field from the API response is preserved
      for (const ev of events) {
        const ttl = (ev.status === 'LIVE' || ev.status === 'IN_PLAY' || ev.eventStatus === 'LIVE') 
          ? INPLAY_REDIS_TTL 
          : UPCOMING_REDIS_TTL;

        pipeline.set(
          `sportradar:event:${ev.eventId}`,
          JSON.stringify(ev),
          'EX',
          ttl,
        );

        // 3. Per-event odds key — just the markets blob for quick odds lookups
        pipeline.set(
          `sportradar:odds:${ev.eventId}`,
          JSON.stringify(ev.markets),
          'EX',
          ttl,
        );
      }

      await pipeline.exec().catch(() => {}); /* pipeline error */

      // ── Upsert events into MongoDB ─────────────────────────────────────────
      const eventOps = events.map((ev) => ({
        updateOne: {
          filter: { eventId: ev.eventId },
          update: { $set: this.mapEvent(ev) },
          upsert: true,
        },
      }));

      await this.betfairEventModel.bulkWrite(eventOps, { ordered: false });

      // ── Upsert markets into MongoDB ────────────────────────────────────────
      const allMarkets = events.flatMap((ev) => this.mapMarkets(ev));
      let marketCount = 0;

      if (allMarkets.length > 0) {
        const marketOps = allMarkets.map((m) => ({
          updateOne: {
            filter: { marketId: m.marketId },
            update: { $set: m },
            upsert: true,
          },
        }));

        // Chunk into batches of 500 to avoid Mongo limits
        for (let i = 0; i < marketOps.length; i += 500) {
          const chunk = marketOps.slice(i, i + 500);
          await this.betfairMarketModel.bulkWrite(chunk, { ordered: false });
          marketCount += chunk.length;
        }
      }

      return { sportId, eventCount: events.length, marketCount };
    } catch (e) {
      return { sportId, eventCount: 0, marketCount: 0, error: e.message };
    }
  }

  /**
   * Syncs events for ALL active sports from the DB, sequentially.
   * Designed to run at startup and can be re-triggered by admin endpoint.
   */
  async syncAllSportsEvents(): Promise<{
    started: boolean;
    results?: any[];
    message: string;
  }> {
    if (this.isSyncingEvents) {
      return { started: false, message: 'Events sync already in progress' };
    }

    this.isSyncingEvents = true;

    try {
      // Use SORT_ORDER keys — always sr:sport:X format
      const activeSportIds = Object.keys(SORT_ORDER);

      const fetchers = activeSportIds.map((sportId) => () => this.syncEventsForSport(sportId));
      const parallelResults = await this.throttledParallel(fetchers);
      const results = parallelResults.map(r => 
        r.status === 'fulfilled' ? r.value : { sportId: 'unknown', eventCount: 0, marketCount: 0, error: 'Failed' }
      );

      const total = results.reduce((sum, r) => sum + r.eventCount, 0);
      const totalMarkets = results.reduce((sum, r) => sum + r.marketCount, 0);

      return {
        started: true,
        results,
        message: `Synced ${total} events and ${totalMarkets} markets across ${activeSportIds.length} sports`,
      };
    } finally {
      this.isSyncingEvents = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // READ — cached event queries
  /**
   * Returns the FULL raw events list for a sport.
   * Priority: Redis (3min TTL, full objects) → MongoDB slim fallback (triggers bg refresh)
   */
  async getEventsBySport(sportId: string): Promise<any[]> {
    const redis = this.getRedis();

    // 1. Redis — returns complete raw Sportradar event objects (all keys preserved)
    try {
      const cached = await redis.get(this.eventsRedisKey(sportId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}

    // 2. MongoDB fallback + trigger background re-sync
    this.syncEventsForSport(sportId).catch(() => {}); // background refresh

    try {
      const events = await this.betfairEventModel
        .find({ sportId, isVisible: true, status: { $ne: 'CLOSED' } })
        .sort({ inplay: -1, marketStartTime: 1 })
        .lean();

      // Return a compatible shape (full raw data not available from DB, returns what we have)
      return events.map((e: any) => ({
        eventId: e.eventId,
        eventName: e.eventName,
        sportId: e.sportId,
        sportName: '',
        competitionId: e.competitionId,
        competitionName: e.competitionName,
        openDate: new Date(e.marketStartTime).getTime(),
        status: e.inplay ? 'LIVE' : e.status,
        eventStatus: '',
        catId: e.inplay ? 'LIVE' : 'UPCOMING',
        catName: e.inplay ? 'LIVE' : 'UPCOMING',
        inplay: e.inplay,
        homeScore: 0,
        awayScore: 0,
        country: e.countryCode || '',
        venue: '',
        winnerBlocked: false,
        isFavourite: false,
        premiumEnabled: false,
        thumbnail: e.thumbnail || '',
        team1Image: e.team1Image || '',
        team2Image: e.team2Image || '',
        co: false,
        sc: '',
        markets: { matchOdds: [], bookmakers: [], fancyMarkets: [], premiumMarkets: [] },
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Returns the FULL raw event from Redis for a single eventId.
   * Redis key: sportradar:event:{eventId}
   * Used by match-detail page to get all markets, runners, prices in one call.
   */
  async getEventById(eventId: string): Promise<SportradarEvent | null> {
    const redis = this.getRedis();

    // 1. Direct event cache (written after each successful market fetch)
    try {
      const cached = await redis.get(`sportradar:event:${eventId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}

    // 2. Scan the flat upcoming:all and inplay:all caches (fast, single read each)
    for (const cacheKey of ['sportradar:upcoming:all', 'sportradar:inplay:all']) {
      try {
        const raw = await redis.get(cacheKey);
        if (raw) {
          const events: SportradarEvent[] = JSON.parse(raw);
          const found = events.find((e) => e.eventId === eventId);
          if (found) return found;
        }
      } catch (_) {}
    }

    // 3. Per-sport caches pipeline scan (handles cold-start when upcoming:all is empty)
    const sportIds = Object.keys(SORT_ORDER);
    const pipeline = redis.pipeline();
    sportIds.forEach((id) => {
      pipeline.get(`sportradar:upcoming:${id}`);
      pipeline.get(`sportradar:inplay:${id}`);
    });
    try {
      const results = await pipeline.exec() ?? [];
      for (let i = 0; i < sportIds.length; i++) {
        for (const offset of [0, 1]) {  // upcoming then inplay
          const raw = results[i * 2 + offset]?.[1] as string | null;
          if (raw) {
            const events: SportradarEvent[] = JSON.parse(raw);
            const found = events.find((e) => e.eventId === eventId);
            if (found) {
              return found;
            }
          }
        }
      }
    } catch (_) {}

    // 4. MongoDB fallback
    try {
      const ev = await this.betfairEventModel.findOne({ eventId }).lean() as any;
      return ev ?? null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Returns the FULL markets blob for an event from Redis.
   * Redis key: sportradar:odds:{eventId}
   * Contains: matchOdds (all runners + prices), bookmakers, fancyMarkets, premiumMarkets,
   *           premiumTopic (WebSocket), premiumBaseUrl, matchOddsBaseUrl, etc.
   */
  async getOddsByEventId(eventId: string): Promise<SportradarEvent['markets'] | null> {
    const redis = this.getRedis();

    try {
      const cached = await redis.get(`sportradar:odds:${eventId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}

    // Fallback: load full event and extract markets
    const ev = await this.getEventById(eventId);
    return ev?.markets ?? null;
  }

  /**
   * Returns combined events across ALL sports from Redis, grouped by sportId.
   * Uses a single pipeline for all sports — very fast.
   */
  async getAllEventsGrouped(): Promise<Record<string, any[]>> {
    const redis = this.getRedis();

    // Use SORT_ORDER keys — always sr:sport:X format
    const sportIds = Object.keys(SORT_ORDER);

    const pipeline = redis.pipeline();
    sportIds.forEach((id) => pipeline.get(this.eventsRedisKey(id)));
    const results = await pipeline.exec().catch(() => null);

    const grouped: Record<string, any[]> = {};

    sportIds.forEach((id, i) => {
      const raw = results?.[i]?.[1] as string | null;
      const events = raw ? JSON.parse(raw) : [];
      if (events.length > 0) grouped[id] = events; // omit empty sports
    });

    return grouped;
  }

  /**
   * Single raw page from Sportradar API — admin debug/preview only (no caching).
   */
  async getRawEventsPage(sportId: string, pageNo: number = 1): Promise<SportradarEventsCatalogueResponse> {
    try {
      return await this.fetchEventsPage(sportId, pageNo);
    } catch (e) {
      return {
        success: false,
        sports: [],
        eventsCount: 0,
        message: e.message,
        status: 'ERROR',
        errorDescription: e.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIST-MARKET  —  /api/v1/sportsradar/list-market?sportId=...&eventId=...
  // Full market detail for a single event.  Premium odds are in premiumMarkets[].
  // Redis TTL: 30s (fast refresh for live odds).
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Fetches the full market detail for a single event directly from the upstream API.
   * Returns the raw response body (event + all market arrays).
   */
  async fetchListMarket(
    sportId: string,
    eventId: string,
    options?: { bypassCache?: boolean },
  ): Promise<any> {
    if (this.proxyEnabled) {
      const data = await this.fetchFromProxy<any>(`/market/${eventId}`);
      return data ?? { success: false, message: 'Primary market cache not warm yet' };
    }
    return this.apiGet<any>('list-market', { sportId, eventId }, options);
  }

  /**
   * Returns full market detail for a single event.
   * Strategy:
   *   1. Redis market cache (30s TTL)
   *   2. Auto-resolve sportId via getEventById (scans event/upcoming/inplay/per-sport caches + MongoDB)
   *   3. Live upstream fetch
   *   4. On success: write sportradar:event:{eventId} for O(1) future lookups
   */
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // MARKET-RESULT  \u2014  /api/v1/sportsradar/market-result?sportId=...&eventId=...
  //
  // Returns settled markets with runner `result` field: 'won' | 'lost' | ''
  // marketStatus: 'SETTLED' | 'OPEN' | 'SUSPENDED'
  //
  // Used by:
  //   1. Settlement worker \u2014 fetch, iterate markets, match bets by srMarketFullId + srRunnerId
  //   2. Admin debug endpoint
  //   3. Frontend (via backend proxy) to show results on match page
  //
  // Redis key: sportradar:market-result:{eventId}  (TTL 1s \u2014 data changes ball-by-ball)
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  private static readonly MARKET_RESULT_TTL = SPORTS_CACHE_TTL_SECONDS;

  /**
   * Fetches market-result for an event.
   * Strategy:
   *   1. Redis cache (5s TTL) \u2014 fast path for repeated lookups
   *   2. Promise.any(host1, host2) \u2014 fastest host wins
   *   3. Cache result, return
   *
   * Response shape:
   * {
   *   success: true,
   *   event: {
   *     eventId, eventName,
   *     markets: {
   *       matchOdds: [{
   *         marketId,       // e.g. '878:sp:total=211.5|inningnr=1|maxovers=20'
   *         marketName,     // e.g. '1st innings - Iconic Super Knights total'
   *         marketType,     // 'MATCH_ODDS'
   *         marketStatus,   // 'OPEN' | 'SETTLED' | 'SUSPENDED'
   *         runners: [{
   *           runnerId,     // '12' (over) | '13' (under) | '4'/'5' (teams) etc.
   *           runnerName,   // 'over 211.5' | 'Brisbane Napoleons'
   *           runnerStatus, // 'Active' | 'Suspended'
   *           result,       // 'won' | 'lost' | ''
   *         }]
   *       }]
   *     }
   *   }
   * }
   */
  async getMarketResult(sportId: string, eventId: string): Promise<any> {
    const redis = this.getRedis();
    const cacheKey = `sportradar:market-result:${eventId}`;

    // 1. Redis hit
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch { /* fall through */ }

    // 1b. Proxy mode — pull the primary's cached market-result verbatim
    if (this.proxyEnabled) {
      const data = await this.fetchFromProxy<any>(`/market-result/${eventId}`);
      if (data?.success) {
        redis
          .set(cacheKey, JSON.stringify(data), 'EX', SportradarService.MARKET_RESULT_TTL)
          .catch(() => {});
      }
      return data ?? { success: false, message: 'Primary market-result not warm yet' };
    }

    // 2. Auto-resolve sportId if not provided
    if (!sportId) {
      try {
        const ev = await this.getEventById(eventId);
        if (ev?.sportId) sportId = ev.sportId;
      } catch { /* ignore */ }
    }

    if (!sportId) {
      return {
        success: false,
        message: `Cannot resolve sportId for ${eventId}. Trigger a sync first.`,
      };
    }

    // 3. Fetch from both hosts, take fastest response (Promise.any via apiGet)
    const data = await this.apiGet<any>('market-result', { sportId, eventId });

    // 4. Cache for 5s
    if (data?.success) {
      redis
        .set(cacheKey, JSON.stringify(data), 'EX', SportradarService.MARKET_RESULT_TTL)
        .catch(() => {});
    }

    return data;
  }

  /**
   * Returns the settled markets for an event \u2014 direct API call, no cache.
   * Use this in the settlement worker to always get fresh data.
   */
  async getRawMarketResult(sportId: string, eventId: string): Promise<{
    success: boolean;
    eventId: string;
    eventName: string;
    eventStatus: string;
    settledMarkets: Array<{
      marketId: string;
      marketName: string;
      marketStatus: string;
      runners: Array<{
        runnerId: string;
        runnerName: string;
        result: string; // 'won' | 'lost' | ''
      }>;
    }>;
  }> {
    try {
      const data = await this.getMarketResult(sportId, eventId);

      if (!data?.success || !data?.event) {
        return { success: false, eventId, eventName: '', eventStatus: '', settledMarkets: [] };
      }

      const eventStatus = String(data.event.eventStatus || data.event.status || '').trim();

      const matchOdds: any[] = data.event.markets?.matchOdds ?? [];

      // Return SETTLED and VOIDED markets
      const settledMarkets = matchOdds
        .filter((m) => m.marketStatus === 'SETTLED' || m.marketStatus === 'VOIDED')
        .map((m) => ({
          marketId: m.marketId,
          marketName: m.marketName,
          marketStatus: m.marketStatus,
          runners: (m.runners ?? []).map((r: any) => ({
            runnerId: String(r.runnerId),
            runnerName: r.runnerName,
            result: r.result ?? '', // 'won' | 'lost' | ''
          })),
        }));

      return {
        success: true,
        eventId: data.event.eventId,
        eventName: data.event.eventName,
        eventStatus,
        settledMarkets,
      };
    } catch (e) {
      return { success: false, eventId, eventName: '', eventStatus: '', settledMarkets: [] };
    }
  }

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  async getListMarket(
    sportId: string,
    eventId: string,
    options?: { fresh?: boolean },
  ): Promise<any> {
    const redis = this.getRedis();
    const redisKey = `sportradar:market:${eventId}`;
    const shouldBypassCache = !!options?.fresh;

    // 1. Redis market cache
    if (!shouldBypassCache) {
      try {
        const cached = await redis.get(redisKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (_) {}
    }

    // 2. Auto-resolve sportId if not provided
    if (!sportId) {
      const ev = await this.getEventById(eventId);
      if (ev?.sportId) {
        sportId = ev.sportId;
      }
    }

    if (!sportId) {
      return { success: false, message: `Cannot resolve sportId for event ${eventId}. Please trigger a sync.` };
    }

    // 3. Live fetch from upstream
    const data = await this.fetchListMarket(sportId, eventId, {
      bypassCache: shouldBypassCache,
    });

    if (data?.success && data?.event) {
      const pipeline = redis.pipeline();
      // Cache market response
      pipeline.set(redisKey, JSON.stringify(data), 'EX', INPLAY_REDIS_TTL);
      // Also cache the event itself for O(1) future lookups
      pipeline.set(
        `sportradar:event:${eventId}`,
        JSON.stringify(data.event),
        'EX',
        UPCOMING_REDIS_TTL,  // 1s, aligned with the rest of the sports cache
      );
      pipeline.exec().catch(() => {});
    }

    return data;
  }
}
