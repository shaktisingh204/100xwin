import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';

import { Bet, BetDocument } from '../bets/schemas/bet.schema';
import { Event, EventDocument } from '../sports/schemas/event.schema';
import { Market, MarketDocument } from '../sports/schemas/market.schema';
import { Competition, CompetitionDocument } from '../sports/schemas/competition.schema';
import { SettledMarket, SettledMarketDocument } from './schemas/settled-market.schema';
import { PrismaService } from '../prisma.service';
import { MatchCashbackRefundService } from '../match-cashback/services/match-cashback-refund.service';

interface ExternalMarketResult {
    _id: string;
    gmid: number;
    gtype: string; // "MATCH" or "FANCY"
    mname: string;
    marketName: string;
    status: string; // "PENDING" or "SETTLE"
    winnerId: number | null;
    winnerName: string | null;
    sportsid: number;
    ename: string;
    stime: string;
}

@Injectable()
export class SettlementService {
    private readonly logger = new Logger(SettlementService.name);
    private isSettling = false;

    private readonly DIAMOND_API_URL = (process.env.SPORTS_BASE_URL || 'https://zeero.bet/').replace(/\/$/, '') + '/';
    private readonly DIAMOND_API_KEY = process.env.SPORTS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService,
        private readonly matchCashbackRefundService: MatchCashbackRefundService,
        @InjectModel(Bet.name) private betModel: Model<BetDocument>,
        @InjectModel(Event.name) private eventModel: Model<EventDocument>,
        @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
        @InjectModel(Competition.name) private competitionModel: Model<CompetitionDocument>,
        @InjectModel(SettledMarket.name) private settledMarketModel: Model<SettledMarketDocument>,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) { }

    // Run every 2 minutes
    @Cron('*/2 * * * *')
    async autoSettleCron() {
        if (this.isSettling) {
            this.logger.warn('Auto-settlement already running. Skipping this cycle.');
            return;
        }
        this.isSettling = true;
        this.logger.log('=== Auto-Settlement Cron Started ===');
        try {
            await this.runSettlementCycle();
        } catch (err) {
            this.logger.error(`Auto-settlement cron error: ${err.message}`, err.stack);
        } finally {
            this.isSettling = false;
            this.logger.log('=== Auto-Settlement Cron Finished ===');
        }
    }

    // Public method to manually trigger (for admin REST endpoint)
    async triggerManually(): Promise<{ message: string; settled: number }> {
        this.logger.log('Manual settlement trigger called.');
        const settled = await this.runSettlementCycle();
        return { message: 'Settlement cycle complete', settled };
    }

    /**
     * Manual admin override to settle a single bet.
     * outcome: 'WON' | 'LOST' | 'VOID'
     */
    async manualSettleBet(betId: string, outcome: 'WON' | 'LOST' | 'VOID', adminNote = 'Manual admin settlement'): Promise<{ message: string }> {
        const bet = await this.betModel.findById(betId);
        if (!bet) throw new Error(`Bet ${betId} not found`);
        if (bet.status !== 'PENDING') throw new Error(`Bet ${betId} is already ${bet.status}, cannot re-settle`);

        await this.prisma.$transaction(async (prisma) => {
            const updateData: any = {
                exposure: { decrement: bet.stake }, // always release exposure
            };

            if (outcome === 'WON') {
                updateData.balance = { increment: bet.potentialWin };
            } else if (outcome === 'VOID') {
                // Refund original stake
                updateData.balance = { increment: bet.stake };
            }
            // LOST → no balance change, just release exposure

            await prisma.user.update({ where: { id: bet.userId }, data: updateData });

            const txType = outcome === 'WON' ? 'BET_WIN' : outcome === 'VOID' ? 'BET_REFUND' : 'BET_LOSS';
            const txAmount = outcome === 'WON' ? bet.potentialWin : outcome === 'VOID' ? bet.stake : bet.stake;
            await prisma.transaction.create({
                data: {
                    userId: bet.userId,
                    amount: txAmount,
                    type: txType,
                    status: 'COMPLETED',
                    remarks: `${adminNote} — ${outcome}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            bet.status = outcome;
            bet.settledReason = adminNote;
            bet.settledAt = new Date();
            await bet.save();

            await this.redis.srem(`active_bets:${bet.userId}`, bet._id.toString());
        });

        this.logger.log(`Manual settle: Bet ${betId} → ${outcome} by admin (${adminNote})`);
        return { message: `Bet ${betId} settled as ${outcome}` };
    }

    private async runSettlementCycle(): Promise<number> {
        // 1. Find all pending bets — we only need unique eventIds
        const pendingBets = await this.betModel.find({ status: 'PENDING' }).select('eventId marketId').lean();
        if (pendingBets.length === 0) {
            this.logger.log('No pending bets found. Nothing to settle.');
            return 0;
        }

        const uniqueEventIds = [...new Set(pendingBets.map(b => b.eventId))];
        this.logger.log(`Found ${pendingBets.length} pending bets across ${uniqueEventIds.length} unique events.`);

        // 2. For each unique event, resolve sport_id using up to 4 fallback layers
        let totalSettled = 0;

        for (const eventId of uniqueEventIds) {
            try {
                const gmid = parseInt(eventId);
                let sportsid: number | null = null;

                const event = await this.eventModel.findOne({ event_id: eventId })
                    .select('sport_id competition_id').lean();

                // Layer 1: event.sport_id
                if (event && (event as any).sport_id) {
                    sportsid = parseInt((event as any).sport_id);
                    this.logger.log(`Event ${eventId}: sport_id=${sportsid} (from event)`);
                }

                // Layer 2: competition.sport_id
                if (!sportsid && event && (event as any).competition_id) {
                    const comp = await this.competitionModel.findOne(
                        { competition_id: (event as any).competition_id }
                    ).select('sport_id').lean();
                    if (comp && (comp as any).sport_id) {
                        sportsid = parseInt((comp as any).sport_id);
                        this.logger.log(`Event ${eventId}: sport_id=${sportsid} (from competition)`);
                    }
                }

                // Layer 3: market.gscode for this event
                if (!sportsid) {
                    const mkt = await this.marketModel.findOne({ event_id: eventId })
                        .select('gscode').lean();
                    if (mkt && (mkt as any).gscode) {
                        sportsid = (mkt as any).gscode;
                        this.logger.log(`Event ${eventId}: sport_id=${sportsid} (from market gscode)`);
                    }
                }

                if (sportsid) {
                    const count = await this.processEventResults(gmid, sportsid);
                    totalSettled += count;
                } else {
                    // Layer 4: brute-force common sport IDs
                    this.logger.warn(`Event ${eventId}: sport_id unknown — trying fallback sport IDs [4,1,2,5,6]`);
                    const count = await this.processEventWithFallbackSports(gmid);
                    totalSettled += count;
                }
            } catch (err) {
                this.logger.error(`Error processing event ${eventId}: ${err.message}`);
            }
        }

        return totalSettled;
    }

    /**
     * When sport_id is unknown, try common sport IDs in order until the API returns results.
     * Cricket=4, Football=1, Tennis=2, Horse Racing=4005, Kabaddi=9, Basketball=7522
     */
    private async processEventWithFallbackSports(gmid: number): Promise<number> {
        // Since the new drop-in proxy abstracts sportsid away, we no longer need fallback iterations.
        return this.processEventResults(gmid);
    }

    private async processEventResults(gmid: number, sportsid?: number): Promise<number> {
        // Fetch market results from external API
        let markets: ExternalMarketResult[];
        try {
            const response = await firstValueFrom(
                this.httpService.get<any>(
                    `${this.DIAMOND_API_URL}api/v1/result?gmid=${gmid}`,
                    {
                        headers: {
                            'x-turnkeyxgaming-key': this.DIAMOND_API_KEY,
                            'Accept': 'application/json'
                        },
                        timeout: 10000
                    }
                )
            );

            // Flexible parser: Proxy Array vs Turnkey Wrapper
            if (Array.isArray(response.data)) {
                markets = response.data;
            } else if (response.data?.data?.markets && Array.isArray(response.data.data.markets)) {
                markets = response.data.data.markets;
            } else if (response.data?.markets && Array.isArray(response.data.markets)) {
                markets = response.data.markets;
            } else {
                return 0; // Payload unreadable or empty
            }
        } catch (err) {
            this.logger.error(`Failed to fetch results for gmid=${gmid}: ${err.message}`);
            return 0;
        }

        // Filter only SETTLED markets with a valid winnerId
        const settledMarkets = markets.filter(m => m.status === 'SETTLE' && m.winnerId !== null && m.winnerId !== undefined);
        this.logger.log(`gmid=${gmid}: ${markets.length} total markets, ${settledMarkets.length} settled.`);

        let totalSettledBets = 0;

        for (const market of settledMarkets) {
            try {
                // Skip if already processed AND it had bets settled (don't skip if settledBetCount=0)
                const alreadyDone = await this.settledMarketModel.findOne({
                    externalMarketId: market._id,
                    settledBetCount: { $gt: 0 }  // Only skip if bets were actually settled
                });
                if (alreadyDone) continue;

                let settledCount = 0;
                if (market.gtype === 'MATCH') {
                    settledCount = await this.settleMatchOdds(market);
                    // After match odds settled, check for any active promo deal and issue refunds
                    if (settledCount > 0) {
                        await this.issueMatchPromoRefunds(market.gmid.toString());
                    }
                } else if (market.gtype === 'FANCY') {
                    settledCount = await this.settleFancy(market);
                }

                // Only permanently record as done if bets were settled
                if (settledCount > 0) {
                    await this.settledMarketModel.findOneAndUpdate(
                        { externalMarketId: market._id },
                        {
                            $set: {
                                gmid: market.gmid,
                                marketName: market.marketName,
                                gtype: market.gtype,
                                winnerId: market.winnerId,
                                settledBetCount: settledCount,
                                settledAt: new Date()
                            }
                        },
                        { upsert: true }
                    );
                    this.logger.log(`✅ Settled market "${market.marketName}" (${market.gtype}) — ${settledCount} bets`);
                } else {
                    this.logger.warn(`⚠️ Market "${market.marketName}" (${market.gtype}) SETTLE but 0 bets matched. Will retry next cycle.`);
                }

                totalSettledBets += settledCount;
            } catch (err) {
                this.logger.error(`Error settling market ${market._id} ("${market.marketName}"): ${err.message}`);
            }
        }

        return totalSettledBets;
    }

    /**
     * MATCH_ODDS settlement:
     * winnerId from the external API is the selection ID (numeric).
     * Our bets store selectionId as the selection name text (e.g., "India", "England").
     * We match by finding the runner in our market whose selectionId text matches the winner.
     */
    private async settleMatchOdds(market: ExternalMarketResult): Promise<number> {
        const gmidStr = market.gmid.toString();

        // Find our market by event_id (gmid) and gtype match
        const ourMarket = await this.marketModel.findOne({
            event_id: gmidStr,
            $or: [
                { gtype: 'match' },
                { gtype: 'MATCH' },
                { market_name: { $regex: 'MATCH_ODDS', $options: 'i' } }
            ]
        }).lean();

        // Find pending bets for this event
        const pendingBets = await this.betModel.find({
            eventId: gmidStr,
            status: 'PENDING'
        });

        if (pendingBets.length === 0) return 0;

        // Determine winning selection name
        // The external API's winnerName may be null; we use winnerId to match against runner data
        let winningSelectionName: string | null = market.winnerName || null;

        // Try to find winner name from our market's runners_data using winnerId
        if (!winningSelectionName && ourMarket?.runners_data) {
            const runners = Array.isArray(ourMarket.runners_data) ? ourMarket.runners_data : [];
            const winnerRunner = runners.find((r: any) => {
                const rid = r.id || r.rid || r.selectionId || r.sid;
                return String(rid) === String(market.winnerId);
            });
            if (winnerRunner) {
                winningSelectionName = winnerRunner.nat || winnerRunner.name || winnerRunner.selectionName;
            }
        }

        let settledCount = 0;

        for (const bet of pendingBets) {
            try {
                // Determine win/loss
                // selectionId is stored as the runner name text in our system
                let userWins = false;
                const isBack = bet.betType !== 'lay';

                if (winningSelectionName) {
                    const betSel = (bet.selectionId || '').toLowerCase().trim();
                    const winningSel = winningSelectionName.toLowerCase().trim();
                    const selectionMatches = betSel === winningSel ||
                        betSel.includes(winningSel) ||
                        winningSel.includes(betSel);
                    userWins = isBack ? selectionMatches : !selectionMatches;
                } else {
                    // Fallback: compare winnerId as string to selectionId
                    const selectionMatches = String(bet.selectionId) === String(market.winnerId);
                    userWins = isBack ? selectionMatches : !selectionMatches;
                }

                const resultText = userWins ? 'WON ✅' : 'LOST ❌';
                const settledReason = `MATCH ODDS — ${market.ename}. ` +
                    `Winner: ${winningSelectionName || market.winnerId}. ` +
                    `Your selection: ${bet.selectionName} (${isBack ? 'Back' : 'Lay'}). ` +
                    `Result: ${resultText}`;

                await this.processBetSettlement(bet, userWins, settledReason, market.sportsid);
                settledCount++;
            } catch (err) {
                this.logger.error(`Error settling bet ${bet._id}: ${err.message}`);
            }
        }

        return settledCount;
    }

    /**
     * FANCY / SESSION settlement:
     * winnerId = actual numeric result (e.g., 30 means "30 runs scored in that over")
     * Our bets:
     *   - Back (YES): "I think runs will be MORE THAN the line". odd = session line.
     *     WIN condition: result (winnerId) >= line (bet.odds)
     *   - Lay (NO):  "I think runs will be LESS THAN the line".
     *     WIN condition: result (winnerId) < line (bet.odds)
     *
     * Matching: We match bets to this FANCY market by fuzzy-matching marketName.
     */
    private async settleFancy(market: ExternalMarketResult): Promise<number> {
        const gmidStr = market.gmid.toString();
        const result = market.winnerId as number;

        // market.marketName = nat (the runner name, e.g. "37 OVER RUN WP")
        // market.mname    = market type category (e.g. "Normal", "NORMAL", "oddeven")
        // These come directly from Diamond API result — same values as what was posted at bet time.
        const extName = this.normalizeMarketName(market.marketName); // e.g. "37 over run wp"
        const extMname = (market.mname || '').toLowerCase().trim();

        this.logger.log(
            `FANCY settle: mname="${market.mname}" marketName="${market.marketName}" ` +
            `gtype="${market.gtype}" → normalized: "${extName}" | result=${result}`
        );

        // Find all pending bets for this event
        const pendingBets = await this.betModel.find({
            eventId: gmidStr,
            status: 'PENDING'
        });

        if (pendingBets.length === 0) return 0;

        let settledCount = 0;

        for (const bet of pendingBets) {
            try {
                // bet.selectionName = nat value saved at bet placement time (e.g. "37 over run WP")
                // bet.marketName    = market category (mname) at bet placement (e.g. "Normal")
                //
                // Matching strategy (priority order):
                //   1. EXACT:  normalize(bet.selectionName) === normalize(market.marketName)
                //               This works because both use nat field from the same Diamond API source.
                //   2. FUZZY:  isFuzzyMatch(betSelName, extName) — fallback for partial/variant names
                //               Guard 3b ensures "WP" never matches "bol" etc.

                const betSelName = this.normalizeMarketName(bet.selectionName || '');
                const betMktName = this.normalizeMarketName(bet.marketName || '');

                // Primary: exact normalized match on selectionName (nat === nat)
                const exactMatch = betSelName === extName;

                // Secondary: exact match on marketName (in case some bets store nat in marketName)
                const exactMktMatch = betMktName === extName;

                // Tertiary: fuzzy match (with 6-guard protection)
                const fuzzySelMatch = !exactMatch && this.isFuzzyMatch(betSelName, extName);
                const fuzzyMktMatch = !exactMktMatch && this.isFuzzyMatch(betMktName, extName);

                const matched = exactMatch || exactMktMatch || fuzzySelMatch || fuzzyMktMatch;

                this.logger.debug(
                    `  Bet ${bet._id}: mname="${bet.marketName}" nat/sel="${bet.selectionName}" ` +
                    `→ exact=${exactMatch} exactMkt=${exactMktMatch} fuzzy=${fuzzySelMatch}|${fuzzyMktMatch}`
                );

                if (!matched) continue;

                const isBack = bet.betType !== 'lay';
                const sessionLine = bet.odds;

                let userWins: boolean;
                if (isBack) {
                    // YES (Back): wins if actual result >= session line
                    userWins = result >= sessionLine;
                } else {
                    // NO (Lay): wins if actual result < session line
                    userWins = result < sessionLine;
                }

                const matchMethod = exactMatch ? 'exact' : (exactMktMatch ? 'exact-mkt' : 'fuzzy');
                const resultText = userWins ? 'WON ✅' : 'LOST ❌';
                const betLabel = bet.selectionName || bet.marketName || market.marketName;
                const settledReason =
                    `${betLabel} [${market.mname}/${market.gtype}]. ` +
                    `Actual result: ${result}. ` +
                    `Your ${isBack ? 'YES (Back)' : 'NO (Lay)'} at session line ${sessionLine}. ` +
                    `Win condition: result ${isBack ? '>=' : '<'} ${sessionLine}. ` +
                    `Result: ${resultText}`;

                await this.processBetSettlement(bet, userWins, settledReason, market.sportsid);
                settledCount++;
                this.logger.log(
                    `  → Bet ${bet._id} settled: ${resultText} ` +
                    `(result=${result}, line=${sessionLine}, matched via ${matchMethod})`
                );
            } catch (err) {
                this.logger.error(`Error settling fancy bet ${bet._id}: ${err.message}`);
            }
        }

        return settledCount;
    }

    /**
     * Core settlement transaction:
     * - Updates bet status, reason, settledAt
     * - If WON: credits user balance and creates BET_WIN transaction
     * - Reduces user exposure (stake was held)
     * - Hierarchical Agent Distribution (Kuber System)
     * - Removes from Redis active_bets
     */
    private async processBetSettlement(bet: BetDocument, userWins: boolean, settledReason: string, sportId: number = 4): Promise<void> {
        const status = userWins ? 'WON' : 'LOST';
        const payout = userWins ? bet.potentialWin : 0;

        // System Profit: If user loses 100, systemProfit = 100. If user wins 50, systemProfit = -50.
        const netUserProfit = userWins ? (payout - bet.stake) : -bet.stake;
        const systemProfit = -netUserProfit;

        await this.prisma.$transaction(async (prisma) => {
            // 1. Update user balance + exposure
            const updateData: any = {
                exposure: { decrement: bet.stake } // Always release exposure
            };
            if (userWins) {
                updateData.balance = { increment: payout };
            }

            await prisma.user.update({
                where: { id: bet.userId },
                data: updateData
            });

            // 2. Create transaction record
            if (userWins) {
                await prisma.transaction.create({
                    data: {
                        userId: bet.userId,
                        amount: payout,
                        type: 'BET_WIN',
                        status: 'COMPLETED',
                        remarks: `Won: ${settledReason}`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            } else {
                await prisma.transaction.create({
                    data: {
                        userId: bet.userId,
                        amount: bet.stake,
                        type: 'BET_LOSS',
                        status: 'COMPLETED',
                        remarks: `Lost: ${settledReason}`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            }

            // 3. Update bet in MongoDB
            bet.status = status;
            bet.settledReason = settledReason;
            bet.settledAt = new Date();
            await bet.save();

            // 4. Distribute hierarchical agent profit
            await this.distributeAgentProfit(prisma, bet, systemProfit, sportId);

            // 5. Remove from Redis active bets
            await this.redis.srem(`active_bets:${bet.userId}`, bet._id.toString());
        });
    }

    /**
     * Match-Based Promo Refund:
     * After MATCH_ODDS settlement, check if there's an active promo deal for this event.
     * If yes, refund (stake × refundPercentage%) to ALL users who LOST a MATCH bet on this event.
     * This is match-based — both teams are covered (no teamName filtering).
     */
    private async issueMatchPromoRefunds(eventId: string): Promise<void> {
        try {
            const summary = await this.matchCashbackRefundService.processLossCashbackForMatch(eventId);
            if (!summary.promotionIds?.length) return;

            this.logger.log(
                `Match cashback processed for ${eventId}: ${summary.refundedBetCount} refunds, total ${summary.totalRefundAmount}`,
            );
        } catch (err) {
            this.logger.error(`PromoRefund error for eventId=${eventId}: ${err.message}`, err.stack);
        }
    }

    private getPartnershipPercentage(user: any, sportId: number): number {
        if (!user || !user.partnershipSettings) return 0;
        try {
            const settings = Array.isArray(user.partnershipSettings) ? user.partnershipSettings : [];
            const sportSetting = settings.find((s: any) => String(s.sport_id) === String(sportId));
            return sportSetting ? parseFloat(sportSetting.partnership) : 0;
        } catch (e) {
            return 0;
        }
    }

    private async distributeAgentProfit(prisma: any, bet: BetDocument, systemProfit: number, sportId: number) {
        if (systemProfit === 0) return;

        // Fetch User with full upline
        const user = await prisma.user.findUnique({
            where: { id: bet.userId },
            include: {
                agent: true,
                master: true,
                manager: true
            }
        });
        if (!user) return;

        // Calculate hierarchical shares
        const agentPct = this.getPartnershipPercentage(user.agent, sportId);
        const masterPct = this.getPartnershipPercentage(user.master, sportId);
        const managerPct = this.getPartnershipPercentage(user.manager, sportId);

        // Kuber logic cascades: Agent gets X%, Master gets (Y - X)%, Manager gets (Z - Y)%
        const agentShare = agentPct;
        const masterShare = Math.max(0, masterPct - agentPct);
        const managerShare = Math.max(0, managerPct - masterPct);

        const distributions = [
            { agentTarget: user.agent, sharePct: agentShare, role: 'AGENT' },
            { agentTarget: user.master, sharePct: masterShare, role: 'MASTER' },
            { agentTarget: user.manager, sharePct: managerShare, role: 'MANAGER' }
        ];

        for (const dist of distributions) {
            if (dist.agentTarget && dist.sharePct > 0) {
                const profitCut = (systemProfit * dist.sharePct) / 100;
                // Credit payout to the same wallet used to place the bet
                const winWallet = (bet as any).walletType === 'crypto' ? 'cryptoBalance' : 'balance';

                await prisma.user.update({
                    where: { id: dist.agentTarget.id },
                    data: { [winWallet]: { increment: profitCut } }
                });

                await prisma.transaction.create({
                    data: {
                        userId: dist.agentTarget.id,
                        amount: Math.abs(profitCut),
                        type: profitCut >= 0 ? 'AGENT_COMMISSION_WIN' : 'AGENT_COMMISSION_LOSS',
                        status: 'COMPLETED',
                        remarks: `Hierarchical Share (${dist.sharePct}%) from Bet ${bet._id} (${bet.eventName}). User ${user.username} ${systemProfit > 0 ? 'Lost' : 'Won'}.`,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            }
        }
    }


    /**
     * Port of frontend's getMarketNameFromGtype:
     *   - match/match1 → runners joined with " vs " (e.g. "India vs England")
     *   - all other types (fancy, session, oddeven, etc.) → nat (the runner's nat value)
     *
     * This is the SINGLE SOURCE OF TRUTH for market name generation.
     * Used when placing bets, posting results to Diamond API, and settlement matching.
     */
    static getMarketNameFromGtype(opts: {
        mname: string;
        gtype: string;
        nat?: string;
        section?: Array<{ nat?: string }>;
    }): { mname: string; gtype: string; marketName: string } | null {
        const { mname, gtype, nat, section } = opts;
        if (!mname || !gtype) return null;

        const lowerGtype = gtype.toLowerCase();

        if (lowerGtype === 'match' || lowerGtype === 'match1') {
            const sections = Array.isArray(section) ? section : [];
            const runnerNames = sections.map(s => s?.nat?.trim()).filter(Boolean) as string[];
            if (runnerNames.length === 0) return null;
            const marketName = runnerNames.length > 1 ? runnerNames.join(' vs ') : runnerNames[0];
            return { mname, gtype, marketName };
        }

        // All other types: fancy, session, oddeven, khado, meter, etc.
        if (!nat || typeof nat !== 'string') return null;
        return { mname, gtype, marketName: nat.trim() };
    }

    /**
     * Normalizes a market name for fuzzy matching:
     * Removes match-specific suffixes like "(AUS W VS IND W)ADV", extra spaces, lowercases.
     * Also normalizes English digits and plurals to maximize token overlap.
     */
    private normalizeMarketName(name: string): string {
        return name
            .replace(/\(.*?\)/g, '')   // Remove parenthesized parts like "(AUS W VS IND W)"
            .replace(/ADV$/i, '')      // Remove trailing ADV
            .toLowerCase()
            .replace(/\btwo\b/g, '2')
            .replace(/\bthree\b/g, '3')
            .replace(/\bfour\b/g, '4') // Note: 'four' also means 4 runs, but they both map to '4'
            .replace(/\bfive\b/g, '5')
            .replace(/\bsix\b/g, '6')  // Maps both the number 6 and a 6-run hit
            .replace(/\bboundaries\b/g, 'boundary')
            .replace(/\bruns\b/g, 'run')
            .replace(/\s+/g, ' ')     // Collapse whitespace
            .trim();
    }

    /**
     * Fuzzy matches two normalized fancy market names.
     * 6-layer guard system — each gate fails fast:
     *
     * Guard 1 — SESSION TYPE  : boundaries/bhav ≠ runs ≠ wickets (never mix)
     * Guard 2 — OVER NUMBER   : first numeric token must match (e.g. 3 ≠ 1.3)
     * Guard 3 — TEAM SIDE     : IND/NZ/AUS/ENG etc. must agree if both present
     * Guard 3b— SUFFIX TOKEN  : Any qualifying suffix word (team code, variant like WP/bol/MI) must match exactly
     * Guard 4 — SCOPE/INNINGS : total/match/powerplay/1st-innings/2nd-innings must align
     * Guard 5 — WORD OVERLAP  : ≥ 80% token overlap after all gates pass
     */
    private isFuzzyMatch(a: string, b: string): boolean {
        if (!a || !b) return false;
        if (a === b) return true;

        // ── Guard 1: Session-type gate ─────────────────────────────────────────────
        const SESSION_TYPES: { type: string; keywords: string[] }[] = [
            { type: 'boundaries', keywords: ['boundaries', 'boundary', 'bhav', 'fours', 'sixes', 'six', 'four', 'two boundaries', 'no. of fours', 'no. of sixes'] },
            { type: 'runs', keywords: ['run', 'runs', 'score', 'total run'] },
            { type: 'wickets', keywords: ['wicket', 'wkt', 'fall of', 'fall of wicket'] },
        ];

        const getSessionType = (name: string): string | null => {
            for (const { type, keywords } of SESSION_TYPES) {
                if (keywords.some(k => name.includes(k))) return type;
            }
            return null;
        };

        const typeA = getSessionType(a);
        const typeB = getSessionType(b);
        if (typeA && typeB && typeA !== typeB) return false;

        // ── Guard 2: Over / session number must match ──────────────────────────────
        // Extract the OVER number specifically (e.g. "5 over 2 boundaries" → "5", "15.3 over" → "15.3")
        const numA = this.extractOverNumber(a);
        const numB = this.extractOverNumber(b);
        // If both have a number, they MUST match exactly. If one has a number and the other doesn't, reject.
        if (numA !== numB) return false;

        // ── Guard 3: Team side gate ────────────────────────────────────────────────
        // If EITHER name references a team, the OTHER MUST reference the exact same team.
        const TEAM_TOKENS = ['ind', 'nz', 'aus', 'eng', 'pak', 'sa', 'sl', 'wi', 'ban', 'afg', 'zim', 'rsa', 'ire', 'mi', 'csk', 'rcb', 'kkr', 'dc', 'srh', 'pbks', 'rr', 'gt', 'lsg'];
        const extractTeams = (name: string): Set<string> => {
            const found = new Set<string>();
            const words = name.split(' ');
            words.forEach((w, i) => {
                if (TEAM_TOKENS.includes(w)) {
                    const next = words[i + 1];
                    found.add(next === 'w' ? `${w} w` : w);
                }
            });
            return found;
        };

        const teamsA = extractTeams(a);
        const teamsB = extractTeams(b);

        // If at least one string has a team, we must strictly validate
        if (teamsA.size > 0 || teamsB.size > 0) {
            // If one has a team but the other doesn't, it's a mismatch (e.g. "15 over run ind" vs "15 over run nz")
            if (teamsA.size === 0 || teamsB.size === 0) return false;

            // They must share at least one team token
            const commonTeams = [...teamsA].filter(t => teamsB.has(t));
            if (commonTeams.length === 0) return false;
        }


        // Guard 3b: Unknown suffix guard
        // Fancy market names end with a variant/team suffix NOT in TEAM_TOKENS
        // (e.g. "WP", "bol", "bat", "chd", "wp"). If both names have such a suffix
        // they MUST be identical. Fixes: "35 over run WP" wrongly matching "35 over run bol".
        const STRUCTURAL_WORDS = new Set([
            'run', 'runs', 'over', 'overs', 'boundary', 'boundaries', 'wicket', 'wickets',
            'wkt', 'bhav', 'match', 'total', 'score', 'ball', 'innings', 'powerplay',
            'yes', 'no', 'session', 'fancy', 'normal',
        ]);
        const lastWordA = a.split(' ').filter(w => w.length > 0).pop() || '';
        const lastWordB = b.split(' ').filter(w => w.length > 0).pop() || '';
        const isNumericToken = (w: string) => /^\d+(\.\d+)?$/.test(w);
        const isStructural = (w: string) => isNumericToken(w) || STRUCTURAL_WORDS.has(w) || TEAM_TOKENS.includes(w);
        const aHasSuffix = !isStructural(lastWordA);
        const bHasSuffix = !isStructural(lastWordB);
        // Mismatch: one has a qualifier suffix and the other doesn't
        if (aHasSuffix !== bHasSuffix) return false;
        // Both have qualifier suffixes: they must be identical
        if (aHasSuffix && lastWordA !== lastWordB) return false;

        // ── Guard 4: Scope / innings gate ─────────────────────────────────────────
        // "Total match", "1st innings", "2nd innings", "powerplay" etc. are distinct
        // scopes that can never match an over-by-over session with same number.
        const SCOPE_PATTERNS = [
            { scope: 'total_match', patterns: ['total match', 'match total', 'full match', 'complete match'] },
            { scope: '1st_innings', patterns: ['1st innings', 'first innings', 'inning 1', '1 innings'] },
            { scope: '2nd_innings', patterns: ['2nd innings', 'second innings', 'inning 2', '2 innings'] },
            { scope: 'powerplay', patterns: ['powerplay', 'power play', 'pp run', 'pp over'] },
            { scope: 'death_overs', patterns: ['death over', 'last 5', 'final over'] },
        ];

        const getScope = (name: string): string | null => {
            for (const { scope, patterns } of SCOPE_PATTERNS) {
                if (patterns.some(p => name.includes(p))) return scope;
            }
            return null; // over-by-over (default — no special scope)
        };

        const scopeA = getScope(a);
        const scopeB = getScope(b);
        // If both have explicit (and different) scopes → reject
        if (scopeA && scopeB && scopeA !== scopeB) return false;
        // If one has a special scope and the other doesn't (default) → reject
        if ((scopeA && !scopeB) || (!scopeA && scopeB)) return false;

        // ── Guard 5: Word-overlap ≥ 70% ───────────────────────────────────────────
        if (a === b) return true;

        const wordsA = new Set(a.split(' ').filter(w => w.length > 0));
        const wordsB = new Set(b.split(' ').filter(w => w.length > 0));
        if (wordsA.size === 0 || wordsB.size === 0) return false;

        let overlap = 0;
        wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
        const minWords = Math.min(wordsA.size, wordsB.size);
        return overlap / minWords >= 0.80;
    }

    /**
     * Extracts the OVER number from a fancy string.
     * Looks for a number immediately preceding "over" or "overs".
     */
    private extractOverNumber(name: string): string | null {
        // Try to find [number] followed by 'over' or 'overs'
        let match = name.match(/(\d+\.?\d*)\s*overs?/i);
        if (match) return match[1];

        // Try to find 'over' followed by [number]
        match = name.match(/overs?\s+(\d+\.?\d*)/i);
        if (match) return match[1];

        // Fallback: first number anywhere
        match = name.match(/(\d+\.?\d*)/);
        return match ? match[1] : null;
    }
}
