import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVipApplicationDto, ReviewVipApplicationDto } from './dto/vip.dto';

@Injectable()
export class VipService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── USER: Submit VIP application ───────────────────────────────────────
    async applyForVip(
        userId: number,
        dto: CreateVipApplicationDto,
        meta: { ipAddress?: string; userAgent?: string },
    ) {
        // Check if user already has an application
        const existing = await this.prisma.vipApplication.findUnique({
            where: { userId },
        });

        if (existing) {
            if (['PENDING', 'UNDER_REVIEW'].includes(existing.status)) {
                throw new ConflictException(
                    'You already have a pending VIP application. Our team will contact you soon.',
                );
            }
            if (existing.status === 'APPROVED') {
                throw new ConflictException('You are already a VIP member.');
            }
            // REJECTED — allow re-apply by updating the record
            return this.prisma.vipApplication.update({
                where: { userId },
                data: {
                    status: 'PENDING',
                    message: dto.message ?? null,
                    currentPlatform: dto.currentPlatform ?? null,
                    platformUsername: dto.platformUsername ?? null,
                    monthlyVolume: dto.monthlyVolume ?? null,
                    reviewedBy: null,
                    reviewNotes: null,
                    reviewedAt: null,
                    ipAddress: meta.ipAddress ?? null,
                    userAgent: meta.userAgent ?? null,
                },
                select: { id: true, status: true, createdAt: true },
            });
        }

        return this.prisma.vipApplication.create({
            data: {
                userId,
                message: dto.message ?? null,
                currentPlatform: dto.currentPlatform ?? null,
                platformUsername: dto.platformUsername ?? null,
                monthlyVolume: dto.monthlyVolume ?? null,
                ipAddress: meta.ipAddress ?? null,
                userAgent: meta.userAgent ?? null,
            },
            select: { id: true, status: true, createdAt: true },
        });
    }

    // ─── USER: Get own application status ───────────────────────────────────
    async getMyApplication(userId: number) {
        const app = await this.prisma.vipApplication.findUnique({
            where: { userId },
            select: {
                id: true,
                status: true,
                message: true,
                currentPlatform: true,
                monthlyVolume: true,
                reviewNotes: true,
                reviewedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return app ?? null;
    }

    // ─── ADMIN: List all applications ───────────────────────────────────────
    async listApplications(status?: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = status ? { status: status as any } : {};

        const [applications, total] = await this.prisma.$transaction([
            this.prisma.vipApplication.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                            createdAt: true,
                            balance: true,
                        },
                    },
                },
            }),
            this.prisma.vipApplication.count({ where }),
        ]);

        return { applications, total, page, limit, pages: Math.ceil(total / limit) };
    }

    // ─── ADMIN: Get single application ──────────────────────────────────────
    async getApplication(id: number) {
        const app = await this.prisma.vipApplication.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        phoneNumber: true,
                        balance: true,
                        createdAt: true,
                        kycStatus: true,
                    },
                },
            },
        });
        if (!app) throw new NotFoundException('VIP application not found');
        return app;
    }

    // ─── ADMIN: Review (approve/reject/under-review) ─────────────────────────
    async reviewApplication(id: number, adminId: number, dto: ReviewVipApplicationDto) {
        const app = await this.prisma.vipApplication.findUnique({ where: { id } });
        if (!app) throw new NotFoundException('VIP application not found');

        if (app.status === 'APPROVED' && dto.status === 'APPROVED') {
            throw new BadRequestException('Application is already approved.');
        }

        return this.prisma.vipApplication.update({
            where: { id },
            data: {
                status: dto.status as any,
                reviewedBy: adminId,
                reviewNotes: dto.reviewNotes ?? null,
                reviewedAt: new Date(),
            },
        });
    }

    // ─── ADMIN: Dashboard stats ──────────────────────────────────────────────
    async getStats() {
        const [total, pending, underReview, approved, rejected, transfer] =
            await this.prisma.$transaction([
                this.prisma.vipApplication.count(),
                this.prisma.vipApplication.count({ where: { status: 'PENDING' } }),
                this.prisma.vipApplication.count({ where: { status: 'UNDER_REVIEW' } }),
                this.prisma.vipApplication.count({ where: { status: 'APPROVED' } }),
                this.prisma.vipApplication.count({ where: { status: 'REJECTED' } }),
                this.prisma.vipApplication.count({ where: { status: 'TRANSFER_REQUESTED' } }),
            ]);

        return { total, pending, underReview, approved, rejected, transfer };
    }
}
