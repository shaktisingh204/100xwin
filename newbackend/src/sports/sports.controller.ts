import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SportsService } from './sports.service';

import { WebhookPayloadDto } from './dto/webhook.dto';
import { SecurityTokenGuard } from '../auth/security-token.guard';
import { UseGuards } from '@nestjs/common';
import { MyZoshGetTournamentsRequest, MyZoshGetMatchesRequest } from './sports.types';

@Controller('sports')
export class SportsController {
    constructor(private readonly sportsService: SportsService) { }

    @Public()
    @Get('sync-data')
    async syncData() {
        try {
            // await this.sportsService.refreshToken(); // Removed auto refresh here as we have dedicated endpoint
            await this.sportsService.syncAll();
            return { status: 200, message: 'Sync started and completed' };
        } catch (error) {
            return {
                status: {
                    code: 500,
                    message: error.message || 'Internal Server Error'
                }
            };
        }
    }

    @Public()
    @Get('clear-data')
    async clearSportsData() {
        return this.sportsService.clearSportsData();
    }

    @Public()
    @Get('force-token-refresh')
    async forceTokenRefresh() {
        try {
            return {
                status: {
                    code: 200,
                    message: 'Token refresh disabled (provider changed)'
                },
                data: {}
            };
        } catch (error) {
            return {
                status: {
                    code: 500,
                    message: error.message || 'Internal Server Error'
                }
            };
        }
    }

    // import-all-markets removed


    @Get('import-exchange-markets')
    async importExchangeMarkets(
        @Query('match_id') match_id: string,
        @Query('access_token') access_token?: string,
        @Query('sport_id') sport_id?: string,
        @Query('tournament_id') tournament_id?: string
    ) {
        try {
            // Pass undefined for missing params so service logic handles them
            return await this.sportsService.importExchangeMarkets(access_token, sport_id || '', tournament_id || '', match_id);
        } catch (error) {
            return {
                status: { code: 500, message: error.message }
            };
        }
    }

    @Get('import-session-markets')
    async importSessionMarkets(
        @Query('match_id') match_id: string,
        @Query('access_token') access_token?: string,
        @Query('sport_id') sport_id?: string,
        @Query('tournament_id') tournament_id?: string
    ) {
        try {
            return await this.sportsService.importSessionMarkets(
                access_token,
                sport_id || '',
                tournament_id || '',
                match_id
            );
        } catch (error) {
            return {
                status: { code: 500, message: error.message }
            };
        }
    }

    // import-markets manual trigger removed


    @Public()
    @Get('sync-market')
    async syncMarketsEndpoint() {
        return this.sportsService.syncMarkets();
    }

    @Public()
    @Get('sidebar')
    async getSidebar() {
        try {
            const data = await this.sportsService.getSidebar();
            return {
                success: true,
                msg: "success",
                status: 200,
                data: {
                    t1: data
                }
            };
        } catch (error) {
            return {
                success: false,
                msg: error.message,
                status: 500
            };
        }
    }

    @Public()
    @Get('match-details/:sportId/:matchId')
    async getMatchDetails(
        @Param('sportId') sportId: string,
        @Param('matchId') matchId: string,
        @Query('userId') userId?: string
    ) {
        try {
            const data = await this.sportsService.getMatchDetailsData(sportId, matchId, userId ? Number(userId) : undefined);
            return {
                success: true,
                msg: "success",
                status: 200,
                data: Array.isArray(data) ? data : (data ? [data] : [])
            };
        } catch (error) {
            return {
                success: false,
                msg: error.message,
                status: 500
            };
        }
    }

    @Public()
    @Post('webhook/status')
    async handleMarketStatus(@Body() payload: WebhookPayloadDto) {
        return this.sportsService.handleMarketStatusUpdate(payload);
    }

    @Public()
    @Post('webhook/result')
    async handleBetResult(@Body() payload: WebhookPayloadDto) {
        return this.sportsService.handleBetResultUpdate(payload);
    }

    @Post('get_tournaments')
    async getTournaments(@Body() body: MyZoshGetTournamentsRequest) {
        try {
            return await this.sportsService.getTournamentsFromApi(body.access_token, body.sport_id, body.source_id);
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.status?.message || error.message;
            return {
                status: {
                    code: status,
                    message: message
                },
                data: {}
            };
        }
    }

    @Post('get_matches')
    async getMatches(@Body() body: MyZoshGetMatchesRequest) {
        try {
            return await this.sportsService.getMatchesFromApi(body.access_token, body.sport_id, body.tournament_id, body.source_id);
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.status?.message || error.message;
            return {
                status: {
                    code: status,
                    message: message
                },
                data: {}
            };
        }
    }

    @Public()
    @Get('competitions')
    async getCompetitions(@Query('sportId') sportId?: string) {
        return this.sportsService.getCompetitions(sportId ? Number(sportId) : undefined);
    }

    @Public()
    @Get('tournament/:id/events')
    async getTournamentEvents(@Param('id') id: string) {
        return this.sportsService.getTournamentEvents(id);
    }


    @Public()
    @Get('list')
    async getSports() {
        return this.sportsService.getSports();
    }

    @Public()
    @Get('live')
    async getLiveEvents(@Query('sportId') sportId?: string) {
        return this.sportsService.getLiveEvents(sportId ? Number(sportId) : undefined);
    }

    @Public()
    @Get('upcoming')
    async getUpcomingEvents(@Query('sportId') sportId?: string) {
        return this.sportsService.getUpcomingEvents(sportId ? Number(sportId) : undefined);
    }

    /** Combined live + upcoming — halves frontend round trips */
    @Public()
    @Get('all-events')
    async getAllEvents(@Query('sportId') sportId?: string) {
        return this.sportsService.getAllEvents(sportId ? Number(sportId) : undefined);
    }

    @Public()
    @Get('events/:sportId')
    async getEvents(@Param('sportId') sportId: string) {
        return this.sportsService.getEvents(Number(sportId));
    }

    @Public()
    @Get('scorecard/:matchId')
    async getScorecard(@Param('matchId') matchId: string) {
        return this.sportsService.getScorecard(matchId);
    }



    @Public()
    @Get('db/match/:matchId')
    async getMatchFromDB(@Param('matchId') matchId: string) {
        return this.sportsService.getMatchWithMarketsFromDB(matchId);
    }

    @Public()
    @Get('tv-url/:sportId/:matchId')
    async getTvUrl(@Param('sportId') sportId: string, @Param('matchId') matchId: string) {
        const url = await this.sportsService.getTvUrl(sportId, matchId);
        return { url };
    }

    // Proxies TV/score HTML — strips CSP frame-ancestors so iframes work on any domain
    @Public()
    @Get('stream-proxy')
    async streamProxy(@Query('url') targetUrl: string, @Res() res: any) {
        if (!targetUrl) return res.status(400).json({ message: 'url query param required' });

        const result = await this.sportsService.proxyStream(targetUrl);
        if (!result) {
            // Return blank HTML so the iframe shows nothing instead of an error message
            res.set('Content-Type', 'text/html');
            return res.status(200).send('<!DOCTYPE html><html><body></body></html>');
        }

        res.set('Content-Type', result.contentType);
        res.set('Cache-Control', 'no-store');
        res.set('X-Frame-Options', 'ALLOWALL');
        return res.send(result.content);
    }

    @Public()
    @Get('score-url/:sportId/:matchId')
    async getScoreUrl(@Param('sportId') sportId: string, @Param('matchId') matchId: string) {
        const url = await this.sportsService.getScoreUrl(sportId, matchId);
        return { url };
    }

    @Public()
    @Get('scorecard-tv/:sportId/:matchId')
    async getScorecardAndTvData(@Param('sportId') sportId: string, @Param('matchId') matchId: string) {
        return this.sportsService.getScorecardAndTvData(sportId, matchId);
    }

    @Public()
    @Get('top-events')
    async getTopEvents() {
        return this.sportsService.getTopEvents();
    }

    @Public()
    @Get('home-events')
    async getHomeEvents() {
        return this.sportsService.getHomeEvents();
    }

    @Public()
    @Get('team-icons')
    async getTeamIcons() {
        return this.sportsService.getTeamIcons();
    }

    @Public()
    @Get('market-status/:matchId')
    async getMarketStatus(@Param('matchId') matchId: string) {
        return this.sportsService.getMatchStatus(matchId);
    }

    @Public()
    @Post('import-market/:matchId')
    async importMarket(@Param('matchId') matchId: string) {
        return this.sportsService.ensureMarketImported(matchId);
    }

    @Public()
    @Post('check-odds')
    async checkOdds(
        @Body() body: { bets: { marketId: string; selectionId: string; odds: number }[] }
    ) {
        try {
            const results = await this.sportsService.checkOdds(body.bets || []);
            return { success: true, results };
        } catch (error) {
            return { success: false, results: [], error: error.message };
        }
    }

    @Post('bet/place')
    async placeBet(
        @Body() body: {
            userId: number; // Added userId
            matchId: string;
            marketId: string;
            selectionId: string;
            selectionName: string;
            marketName: string;
            eventName: string;
            rate: number;
            amount: number;
            type: 'back' | 'lay';
            marketType: string;
        }
    ) {
        return this.sportsService.placeBet(
            body.userId,
            body.matchId,
            body.marketId,
            body.selectionId,
            body.selectionName,
            body.marketName,
            body.eventName,
            body.rate,
            body.amount,
            body.type,
            body.marketType
        );
    }

    @Get('bets/:userId')
    async getUserBets(@Param('userId') userId: string) {
        return this.sportsService.getUserBets(Number(userId));
    }

    // --- Admin Visibility Toggles ---

    @Post('toggle/sport/:id')
    // @UseGuards(RolesGuard) // Add Role guards later if strictly needed, mostly admin access anyway
    async toggleSport(@Param('id') id: string, @Body() body: { isVisible: boolean }) {
        return this.sportsService.toggleSportVisibility(id, body.isVisible);
    }

    @Post('toggle/competition/:id')
    async toggleCompetition(@Param('id') id: string, @Body() body: { isVisible: boolean }) {
        return this.sportsService.toggleCompetitionVisibility(id, body.isVisible);
    }

    @Post('toggle/event/:id')
    async toggleEvent(@Param('id') id: string, @Body() body: { isVisible: boolean }) {
        return this.sportsService.toggleEventVisibility(id, body.isVisible);
    }

    @Post('toggle/popular/:id')
    async togglePopularEvent(@Param('id') id: string, @Body() body: { isPopular: boolean; eventName?: string; sportId?: number }) {
        return this.sportsService.toggleEventPopular(id, body.isPopular, body.eventName, body.sportId);
    }

    @Post('limits/sport/:id')
    // @UseGuards(RolesGuard)
    async updateSportLimits(@Param('id') id: string, @Body() body: { minBet: number; maxBet: number }) {
        return this.sportsService.updateSportLimits(id, body.minBet, body.maxBet);
    }
}
