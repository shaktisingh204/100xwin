import { Controller, Post, Delete, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SettlementService } from './settlement.service';
import { SettledMarket, SettledMarketDocument } from './schemas/settled-market.schema';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('settlement')
export class SettlementController {
    constructor(
        private readonly settlementService: SettlementService,
        @InjectModel(SettledMarket.name) private settledMarketModel: Model<SettledMarketDocument>
    ) { }

    /**
     * Admin endpoint to manually trigger the settlement cycle immediately.
     * POST /settlement/trigger
     */
    @Post('trigger')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async triggerSettlement(@Request() req) {
        return this.settlementService.triggerManually();
    }

    /**
     * Admin endpoint to manually settle a single bet as WON / LOST / VOID.
     * POST /settlement/manual-settle-bet
     * Body: { betId: string; outcome: 'WON' | 'LOST' | 'VOID'; note?: string }
     */
    @Post('manual-settle-bet')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async manualSettleBet(@Body() dto: { betId: string; outcome: 'WON' | 'LOST' | 'VOID'; note?: string }) {
        if (!dto.betId) throw new BadRequestException('betId is required');
        if (!['WON', 'LOST', 'VOID'].includes(dto.outcome)) {
            throw new BadRequestException('outcome must be WON, LOST, or VOID');
        }
        return this.settlementService.manualSettleBet(dto.betId, dto.outcome, dto.note);
    }

    /**
     * One-time cleanup: removes poisoned SettledMarket records (settledBetCount=0) so they get retried.
     * DELETE /settlement/cleanup-zero-records
     */
    @Delete('cleanup-zero-records')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async cleanupZeroRecords() {
        const result = await this.settledMarketModel.deleteMany({ settledBetCount: 0 });
        return {
            message: `Deleted ${result.deletedCount} bad SettledMarket records. Markets will be retried on next cron cycle.`,
            deletedCount: result.deletedCount
        };
    }
}
