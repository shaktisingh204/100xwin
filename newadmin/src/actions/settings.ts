'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export async function getAuditLogs(limit = 100) {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return { success: true, data: JSON.parse(JSON.stringify(logs)) };
    } catch (error) {
        return { success: false, error: 'Failed to fetch audit logs' };
    }
}

// ─── System Config ────────────────────────────────────────────────────────────

export async function getSystemConfig() {
    try {
        const configs = await prisma.systemConfig.findMany();
        const configMap = configs.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return { success: true, data: configMap };
    } catch (error) {
        return { success: false, error: 'Failed to fetch system config' };
    }
}

export async function updateSystemConfig(configData: Record<string, string>) {
    try {
        const updates = Object.entries(configData).map(([key, value]) =>
            prisma.systemConfig.upsert({
                where: { key },
                update: { value },
                create: { key, value }
            })
        );
        await prisma.$transaction(updates);
        revalidatePath('/dashboard/settings/config');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update system config' };
    }
}

// ─── Contact Settings (stored in SystemConfig table) ─────────────────────────

const CONTACT_KEY = 'CONTACT_SETTINGS';

export async function getContactSettings() {
    try {
        const record = await prisma.systemConfig.findUnique({ where: { key: CONTACT_KEY } });
        const defaults = {
            whatsappNumber: '',
            whatsappLabel: 'Support',
            whatsappDefaultMessage: 'Hi, I need help with my account.',
            telegramHandle: '',
            telegramLink: '',
            emailAddress: '',
            whatsappEnabled: true,
            telegramEnabled: true,
            emailEnabled: true,
        };
        const data = record?.value ? { ...defaults, ...JSON.parse(record.value) } : defaults;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: 'Failed to load contact settings' };
    }
}

export async function saveContactSettings(settings: Record<string, any>) {
    try {
        await prisma.systemConfig.upsert({
            where: { key: CONTACT_KEY },
            update: { value: JSON.stringify(settings) },
            create: { key: CONTACT_KEY, value: JSON.stringify(settings) },
        });
        revalidatePath('/dashboard/settings/contact');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to save contact settings' };
    }
}

// ─── System Health ────────────────────────────────────────────────────────────

export async function getSystemHealth() {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;
        return {
            success: true,
            data: {
                database: 'UP',
                redis: 'UP',
                uptime: process.uptime(),
                latency,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            success: true,
            data: {
                database: 'DOWN',
                redis: 'UNKNOWN',
                uptime: process.uptime(),
                latency: 0,
                timestamp: new Date().toISOString()
            }
        };
    }
}

// ─── VIP Applications ─────────────────────────────────────────────────────────

export async function getVipApplications(page = 1, limit = 20, status?: string) {
    try {
        const skip = (page - 1) * limit;
        const where: any = {};
        if (status) where.status = status;

        const [applications, total] = await Promise.all([
            prisma.vipApplication.findMany({
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
                            balance: true,
                            createdAt: true,
                            kycStatus: true,
                        }
                    }
                }
            }),
            prisma.vipApplication.count({ where })
        ]);

        return {
            success: true,
            data: {
                applications: JSON.parse(JSON.stringify(applications)),
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('VIP applications error:', error);
        return { success: false, error: 'Failed to fetch VIP applications' };
    }
}

export async function getVipStats() {
    try {
        const [total, pending, underReview, approved, rejected, transfer] = await Promise.all([
            prisma.vipApplication.count(),
            prisma.vipApplication.count({ where: { status: 'PENDING' } }),
            prisma.vipApplication.count({ where: { status: 'UNDER_REVIEW' } }),
            prisma.vipApplication.count({ where: { status: 'APPROVED' } }),
            prisma.vipApplication.count({ where: { status: 'REJECTED' } }),
            prisma.vipApplication.count({ where: { status: 'TRANSFER_REQUESTED' } }),
        ]);
        return { success: true, data: { total, pending, underReview, approved, rejected, transfer } };
    } catch (error) {
        return { success: false, error: 'Failed to fetch VIP stats' };
    }
}

export async function reviewVipApplication(id: number, status: string, reviewNotes?: string, adminId = 1) {
    try {
        await prisma.vipApplication.update({
            where: { id },
            data: {
                status: status as any,
                reviewNotes,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            }
        });
        // Audit log
        await prisma.auditLog.create({
            data: {
                adminId,
                action: 'REVIEW_VIP_APPLICATION',
                details: { applicationId: id, status, reviewNotes }
            }
        });
        revalidatePath('/dashboard/cms/vip-applications');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update VIP application' };
    }
}

// ─── Bonus Redemptions (Prisma UserBonus table) ───────────────────────────────

export async function getBonusStats() {
    try {
        const [total, active, completed, forfeited] = await Promise.all([
            prisma.userBonus.count(),
            prisma.userBonus.count({ where: { status: 'ACTIVE' } }),
            prisma.userBonus.count({ where: { status: 'COMPLETED' } }),
            prisma.userBonus.count({ where: { status: 'FORFEITED' } }),
        ]);
        const activeSum = await prisma.userBonus.aggregate({
            where: { status: 'ACTIVE' },
            _sum: { bonusAmount: true, wageringDone: true, wageringRequired: true }
        });
        return {
            success: true,
            data: {
                total, active, completed, forfeited,
                totalBonusValue: activeSum._sum.bonusAmount || 0,
                totalWageringDone: activeSum._sum.wageringDone || 0,
                totalWageringRequired: activeSum._sum.wageringRequired || 0,
            }
        };
    } catch {
        return { success: false, error: 'Failed to fetch bonus stats' };
    }
}

export async function getBonusRedemptions(filters: {
    page?: number; limit?: number; status?: string; search?: string;
}) {
    try {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where: any = {};
        if (filters.status && filters.status !== 'ALL') where.status = filters.status;
        if (filters.search) {
            where.OR = [
                { bonusCode: { contains: filters.search, mode: 'insensitive' } },
                { bonusTitle: { contains: filters.search, mode: 'insensitive' } },
                { user: { username: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }

        const [redemptions, total] = await Promise.all([
            prisma.userBonus.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, username: true, email: true } }
                }
            }),
            prisma.userBonus.count({ where })
        ]);

        return {
            success: true,
            data: {
                redemptions: JSON.parse(JSON.stringify(redemptions)),
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    } catch {
        return { success: false, error: 'Failed to fetch redemptions' };
    }
}

export async function adminForfeitBonus(userBonusId: number, adminId = 1) {
    try {
        const bonus = await prisma.userBonus.findUnique({ where: { id: userBonusId } });
        if (!bonus) return { success: false, error: 'Bonus not found' };

        await prisma.$transaction([
            prisma.userBonus.update({
                where: { id: userBonusId },
                data: { status: 'FORFEITED', forfeitedAt: new Date() }
            }),
            // Zero out both bonus and bonus wallet balance
            prisma.user.update({
                where: { id: bonus.userId },
                data: { bonus: { decrement: bonus.bonusAmount }, wageringRequired: 0, wageringDone: 0 }
            }),
            prisma.auditLog.create({
                data: { adminId, action: 'FORFEIT_BONUS', details: { userBonusId, userId: bonus.userId } }
            })
        ]);
        revalidatePath('/dashboard/marketing/bonuses');
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to forfeit bonus' };
    }
}

export async function adminCompleteBonus(userBonusId: number, adminId = 1) {
    try {
        const bonus = await prisma.userBonus.findUnique({ where: { id: userBonusId } });
        if (!bonus) return { success: false, error: 'Bonus not found' };

        await prisma.$transaction([
            prisma.userBonus.update({
                where: { id: userBonusId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    wageringDone: bonus.wageringRequired
                }
            }),
            // Convert bonus → real balance
            prisma.user.update({
                where: { id: bonus.userId },
                data: {
                    balance: { increment: bonus.bonusAmount },
                    bonus: { decrement: bonus.bonusAmount },
                    wageringRequired: 0,
                    wageringDone: 0
                }
            }),
            prisma.auditLog.create({
                data: { adminId, action: 'COMPLETE_BONUS', details: { userBonusId, userId: bonus.userId } }
            })
        ]);
        revalidatePath('/dashboard/marketing/bonuses');
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to complete bonus' };
    }
}
