import {
    Controller, Get, Post, Patch, Body, Param, Query,
    UseGuards, Req, ParseIntPipe, DefaultValuePipe
} from '@nestjs/common';
import { VipService } from './vip.service';
import { CreateVipApplicationDto, ReviewVipApplicationDto } from './dto/vip.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('vip')
@UseGuards(JwtAuthGuard)
export class VipController {
    constructor(private readonly vipService: VipService) { }

    // ═══════════════════════════════════════════════════════════════════════
    //  USER ENDPOINTS  (any authenticated user)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * POST /api/vip/apply
     * User submits a VIP application or re-applies after rejection.
     * Rate limited by the fact that we store IP + userId unique check.
     */
    @Post('apply')
    async apply(@Req() req, @Body() dto: CreateVipApplicationDto) {
        const ipAddress =
            req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            'unknown';
        const userAgent = req.headers['user-agent'] ?? '';

        return this.vipService.applyForVip(req.user.userId, dto, { ipAddress, userAgent });
    }

    /**
     * GET /api/vip/my-application
     * Returns the authenticating user's current application (or null).
     */
    @Get('my-application')
    async myApplication(@Req() req) {
        return this.vipService.getMyApplication(req.user.userId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  ADMIN ENDPOINTS  (TECH_MASTER | SUPER_ADMIN | MANAGER)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/vip/admin/applications?status=PENDING&page=1&limit=20
     */
    @Get('admin/applications')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async listApplications(
        @Query('status') status?: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    ) {
        return this.vipService.listApplications(status, page, Math.min(limit, 100));
    }

    /**
     * GET /api/vip/admin/stats
     * Quick counts per status for admin dashboard widget.
     */
    @Get('admin/stats')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async stats() {
        return this.vipService.getStats();
    }

    /**
     * GET /api/vip/admin/applications/:id
     */
    @Get('admin/applications/:id')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async getApplication(@Param('id', ParseIntPipe) id: number) {
        return this.vipService.getApplication(id);
    }

    /**
     * PATCH /api/vip/admin/applications/:id/review
     * Body: { status: 'APPROVED'|'REJECTED'|'UNDER_REVIEW', reviewNotes?: string }
     */
    @Patch('admin/applications/:id/review')
    @UseGuards(RolesGuard)
    @Roles(Role.TECH_MASTER, Role.SUPER_ADMIN, Role.MANAGER)
    async review(
        @Param('id', ParseIntPipe) id: number,
        @Req() req,
        @Body() dto: ReviewVipApplicationDto,
    ) {
        return this.vipService.reviewApplication(id, req.user.userId, dto);
    }
}
