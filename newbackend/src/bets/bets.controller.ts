import { Controller, Post, Get, Body, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { BetsService } from './bets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust path if needed

import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { PlaceBetDto } from './dto/place-bet.dto';
import { ExecuteCashoutDto } from './dto/execute-cashout.dto';

@Controller('bets')
export class BetsController {
    constructor(private readonly betsService: BetsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async placeBet(@Request() req, @Body() betData: PlaceBetDto) {
        return this.betsService.placeBet(req.user.userId, betData);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-bets')
    async getMyBets(@Request() req) {
        return this.betsService.getUserBets(req.user.userId);
    }

    @Get('user/:userId')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getUserBets(@Param('userId', ParseIntPipe) userId: number) {
        return this.betsService.getUserBets(userId);
    }

    // --- Admin Endpoints ---

    @Post('all')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getAllBets(@Body() body: { page: number; limit: number; filters?: any }) {
        return this.betsService.getAllBets(body.page || 1, body.limit || 20, body.filters);
    }

    @Post(':id/cancel')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async cancelBet(@Request() req, @Param('id') id: string) {
        // Typically adminId comes from req.user set by guard
        const adminId = req.user?.id || 0;
        return this.betsService.cancelBet(id, adminId);
    }

    @Post('settle')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async settleMarket(@Request() req, @Body() body: { marketId: string; winningSelectionId: string }) {
        const adminId = req.user?.userId || 0; // Ensure consistent property access (userId vs id) based on JWT strategy
        return this.betsService.settleMarket(body.marketId, body.winningSelectionId, adminId);
    }

    // ── Cash Out (user-facing) ───────────────────────────────────────────────

    /**
     * GET /bets/:id/cashout-offer
     * Returns the current cash out offer value for a PENDING bet.
     * Read-only — does NOT settle anything.
     * The response includes status: 'AVAILABLE' | 'SUSPENDED' | 'UNAVAILABLE'
     */
    @UseGuards(JwtAuthGuard)
    @Get(':id/cashout-offer')
    async getCashoutOffer(@Request() req, @Param('id') id: string) {
        return this.betsService.getCashoutOffer(id, req.user.userId);
    }

    /**
     * POST /bets/:id/cashout
     * Executes full or partial cash out. Body params:
     *   fraction          (number 0-1, default 1) — partial cash out fraction
     *   clientExpectedValue (number) — what the UI showed; server uses for 2% tolerance check
     *   fullRefund        (boolean) — true = pre-match 100% stake refund
     */
    @UseGuards(JwtAuthGuard)
    @Post(':id/cashout')
    async executeCashout(
        @Request() req,
        @Param('id') id: string,
        @Body() body: ExecuteCashoutDto,
    ) {
        return this.betsService.executeCashout(
            id,
            req.user.userId,
            body.fraction ?? 1,
            body.clientExpectedValue,
            body.fullRefund ?? false,
        );
    }
    // ────────────────────────────────────────────────────────────────────────
}
