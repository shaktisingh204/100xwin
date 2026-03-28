import { Controller, Post, Body, Get, Param, UseGuards, Request, BadRequestException, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
// Since I haven't seen the exact location of JwtAuthGuard, I'll assume standard location or check.
// I'll assume standard structure for now.

// Checking auth.module.ts location from file list: src/auth/auth.module.ts
// Usually Guard is exported from there or a separate file.
// Let me double check `auth` folder content in previous `list_dir`.
// It had `auth.service.ts`, `auth.controller.ts`, `auth.module.ts`.
// I'll check `auth.controller.ts` to see how they use guards.

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post('deposit')
    @UseGuards(JwtAuthGuard)
    async deposit(@Request() req, @Body() body: { amount: number; paymentMethod: string; utr: string; proof?: string; currency: string; type: string }) {
        const userId = req.user.id;
        const { amount, paymentMethod, utr, proof, currency, type } = body;

        if (!amount || amount <= 0) {
            throw new BadRequestException('Invalid amount');
        }
        if (!paymentMethod) {
            throw new BadRequestException('Payment method is required');
        }
        if (!utr) {
            throw new BadRequestException('Transaction ID / UTR is required');
        }

        return this.transactionsService.createDeposit(userId, amount, paymentMethod, utr, currency, type, proof);
    }

    @Post('withdraw')
    async withdraw(@Body() body: { userId: number; amount: number; paymentDetails: any }) {
        const { userId, amount, paymentDetails } = body;
        return this.transactionsService.createWithdrawal(userId, amount, paymentDetails);
    }

    @Get('my/:userId')
    async getMyTransactions(@Param('userId') userId: string) {
        return this.transactionsService.getUserTransactions(parseInt(userId));
    }

    @Get('user/:userId')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getUserTransactions(@Param('userId') userId: string) {
        return this.transactionsService.getUserTransactions(parseInt(userId));
    }

    @Get('all')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getAllTransactions(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('type') type: string,
        @Query('status') status: string,
        @Query('search') search: string
    ) {
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        return this.transactionsService.getAllTransactions(p, l, type, status, search);
    }

    @Post(':id/approve')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async approve(@Param('id') id: string, @Body() body: { adminId: number; remarks?: string }) {
        return this.transactionsService.approveTransaction(parseInt(id), body.adminId, body.remarks);
    }

    @Post(':id/reject')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async reject(@Param('id') id: string, @Body() body: { adminId: number; remarks?: string }) {
        return this.transactionsService.rejectTransaction(parseInt(id), body.adminId, body.remarks);
    }
}
