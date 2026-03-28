import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly transactionsService: TransactionsService,
    ) { }

    @Get('wallet')
    async getWallet(@Req() req: any) {
        return this.usersService.getWallet(req.user.userId);
    }

    @Get('transactions')
    async getTransactions(@Req() req: any) {
        return this.transactionsService.getUserTransactions(req.user.userId);
    }

    @Patch('wallet-preference')
    async setWalletPreference(@Req() req: any, @Body() body: { wallet: 'fiat' | 'crypto' }) {
        const wallet = body.wallet === 'crypto' ? 'crypto' : 'fiat';
        await this.usersService.update(req.user.userId, { activeWallet: wallet } as any);
        return { activeWallet: wallet };
    }

    @Patch('username')
    async updateUsername(@Req() req: any, @Body() body: { username: string }) {
        return this.usersService.updateUsername(req.user.userId, body.username);
    }

    @Patch('change-password')
    async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
        return this.usersService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
    }

    @Get('casino-transactions')
    async getCasinoTransactions(
        @Req() req: any,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20'
    ) {
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        return this.usersService.getCasinoTransactions(req.user.userId, p, l);
    }

    // Admin Endpoints

    @Get('list')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getAllUsers(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('search') search: string,
        @Query('role') role: string
    ) {
        const p = parseInt(page) || 1;
        const l = parseInt(limit) || 20;
        return this.usersService.findAll(p, l, search, role);
    }

    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getUser(@Param('id') id: string) {
        return this.usersService.findOneById(parseInt(id));
    }

    @Post('create')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async createUser(@Body() userData: any) {
        return this.usersService.create(userData);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async updateUser(@Param('id') id: string, @Body() userData: any) {
        return this.usersService.update(parseInt(id), userData);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER)
    async deleteUser(@Param('id') id: string) {
        return this.usersService.remove(parseInt(id));
    }

    // Manager Assignment
    @Get('managers')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async getManagers() {
        return this.usersService.getManagers();
    }

    @Post('assign-manager')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async assignManager(@Body() body: { userId: number; managerId: number }) {
        return this.usersService.assignManager(body.userId, body.managerId);
    }

    @Post('add-funds')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async addFunds(@Req() req, @Body() body: { userId: number; amount: number; type: 'credit' | 'debit' }) {
        return this.usersService.addFunds(body.userId, body.amount, body.type, req.user.userId);
    }

    // KYC & RG Endpoints
    @Post('kyc/document')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async uploadKycDocument(@Body() body: { userId: number; type: string; url: string }) {
        return this.usersService.uploadKycDocument(body.userId, body.type, body.url);
    }

    @Patch('kyc/status')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async updateKycStatus(@Body() body: { userId: number; status: 'VERIFIED' | 'REJECTED' | 'PENDING'; reason?: string }) {
        return this.usersService.updateKycStatus(body.userId, body.status, body.reason);
    }

    @Patch('rg/limits')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async setRGLimits(@Body() body: { userId: number; depositLimit?: number; lossLimit?: number; selfExclusionUntil?: string }) {
        const limits: any = {};
        if (body.depositLimit !== undefined) limits.depositLimit = body.depositLimit;
        if (body.lossLimit !== undefined) limits.lossLimit = body.lossLimit;
        if (body.selfExclusionUntil) limits.selfExclusionUntil = new Date(body.selfExclusionUntil);

        return this.usersService.setResponsibleGamblingLimits(body.userId, limits);
    }

    @Post('bulk-action')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN)
    async bulkAction(@Body() body: { userIds: number[]; action: 'BAN' | 'VERIFY' | 'BONUS' | 'DELETE'; data?: any }) {
        return this.usersService.bulkAction(body.userIds, body.action, body.data);
    }
}
