import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralService {
    constructor(private prisma: PrismaService) { }

    async generateReferralCode(): Promise<string> {
        const code = randomBytes(4).toString('hex').toUpperCase(); // 8 char unique code
        // Check if exists
        const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
        if (existing) return this.generateReferralCode(); // Retry
        return code;
    }

    async validateReferralCode(code: string) {
        const user = await this.prisma.user.findUnique({
            where: { referralCode: code },
        });
        return user;
    }

    async createReferralCodeForUser(userId: number): Promise<string> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user.referralCode) return user.referralCode;

        const code = await this.generateReferralCode();
        await this.prisma.user.update({
            where: { id: userId },
            data: { referralCode: code },
        });
        return code;
    }

    async applyReferral(userId: number, code: string) {
        const referrer = await this.validateReferralCode(code);
        if (!referrer) throw new BadRequestException('Invalid referral code');

        if (referrer.id === userId) throw new BadRequestException('Cannot refer yourself');

        // Link user
        await this.prisma.user.update({
            where: { id: userId },
            data: { referrerId: referrer.id },
        });

        // Check for SIGNUP rewards
        await this.checkAndAward(userId, 'SIGNUP', 0);
    }

    async checkAndAward(userId: number, eventType: string, amount: number) {
        // Find user and their referrer
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { referrer: true },
        });

        if (!user || !user.referrerId) return;

        // For flat-trigger events (SIGNUP, DEPOSIT_FIRST), don't filter by conditionValue.
        // For volume-based events, filter where conditionValue <= amount.
        const isVolumeEvent = ['DEPOSIT_RECURRING', 'BET_VOLUME'].includes(eventType);
        const rules = await this.prisma.referralReward.findMany({
            where: {
                conditionType: eventType,
                isActive: true,
                ...(isVolumeEvent ? { conditionValue: { lte: amount } } : {}),
            },
        });

        for (const rule of rules) {
            // Check if reward already given for this user/rule if it's a one-time thing (like SIGNUP or FIRST_DEPOSIT)
            if (['SIGNUP', 'DEPOSIT_FIRST'].includes(rule.conditionType)) {
                const existing = await this.prisma.referralHistory.findFirst({
                    where: {
                        referredUserId: userId,
                        rewardId: rule.id,
                    },
                });
                if (existing) continue;
            }

            // Calculate Reward
            let rewardAmount = 0;
            if (rule.rewardType === 'FIXED') {
                rewardAmount = rule.rewardAmount;
            } else if (rule.rewardType === 'PERCENTAGE') {
                rewardAmount = (amount * rule.rewardAmount) / 100;
            }

            if (rewardAmount > 0) {
                // Give reward to referrer
                await this.prisma.$transaction([
                    this.prisma.user.update({
                        where: { id: user.referrerId },
                        data: {
                            balance: { increment: rewardAmount },
                            fiatBonus: { increment: rewardAmount }, // Referral bonus credited to fiat bonus wallet
                        } as any,
                    }),
                    this.prisma.referralHistory.create({
                        data: {
                            referrerId: user.referrerId,
                            referredUserId: userId,
                            rewardId: rule.id,
                            amount: rewardAmount,
                            status: 'COMPLETED',
                        },
                    }),
                ]);
                console.log(`Awarded ${rewardAmount} to user ${user.referrerId} for ${eventType} of user ${userId}`);
            }
        }
    }

    async getReferralStats(userId: number) {
        const totalInvited = await this.prisma.user.count({
            where: { referrerId: userId },
        });

        const completedEarnings = await this.prisma.referralHistory.aggregate({
            where: { referrerId: userId, status: 'COMPLETED' },
            _sum: { amount: true },
        });

        const pendingEarnings = await this.prisma.referralHistory.aggregate({
            where: { referrerId: userId, status: 'PENDING' },
            _sum: { amount: true },
        });

        // Get recent referred users with their individual earnings
        const recentReferredUsers = await this.prisma.user.findMany({
            where: { referrerId: userId },
            select: {
                id: true,
                username: true,
                createdAt: true,
                referralHistoryReceived: {
                    where: { referrerId: userId },
                    select: {
                        amount: true,
                        status: true,
                        createdAt: true,
                        reward: { select: { name: true, conditionType: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const recentReferrals = recentReferredUsers.map(u => ({
            id: u.id,
            username: u.username,
            createdAt: u.createdAt,
            totalEarned: u.referralHistoryReceived
                .filter(h => h.status === 'COMPLETED')
                .reduce((sum, h) => sum + h.amount, 0),
            lastActivity: u.referralHistoryReceived[0]?.createdAt || u.createdAt,
            rewardType: u.referralHistoryReceived[0]?.reward?.conditionType || 'SIGNUP',
        }));

        // Recent rewards / history for the earnings table
        const recentHistory = await this.prisma.referralHistory.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                referredUser: { select: { username: true } },
                reward: { select: { name: true, conditionType: true } },
            },
        });

        const referralCode = (await this.prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true },
        }))?.referralCode;

        return {
            referralCode,
            totalInvited,
            totalEarnings: completedEarnings._sum.amount || 0,
            pendingEarnings: pendingEarnings._sum.amount || 0,
            recentReferrals,
            recentHistory: recentHistory.map(h => ({
                id: h.id,
                refereeUsername: h.referredUser?.username || 'Unknown',
                eventType: h.reward?.conditionType || 'SIGNUP',
                rewardName: h.reward?.name || 'Referral Bonus',
                amount: h.amount,
                status: h.status,
                createdAt: h.createdAt,
            })),
        };
    }

    // Admin Methods return full tree or paginated
    async getAdminReferralUsers(page = 1, limit = 20, search = '') {
        const skip = (page - 1) * limit;
        const where: any = {
            referrerId: { not: null } // Only show users who were referred? Or show all who HAVE referred?
            // Requirement: "View user referral tree". Usually means showing users and their referrers.
            // Let's show all users who have a referrer, or are a referrer.
            // Actually, a list of users with their referrer is good.
        };

        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { referralCode: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                include: {
                    referrer: {
                        select: { id: true, username: true, referralCode: true }
                    },
                    _count: {
                        select: { referrals: true }
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.user.count({ where })
        ]);

        // We also need total earnings for each user from referrals. 
        // This might be expensive to aggregate for all. 
        // For now, let's just return basic info. Only fetch earnings if requested or critical.
        // Let's fetch earnings for these users (as referrers)
        const userIds = users.map(u => u.id);
        const earnings = await this.prisma.referralHistory.groupBy({
            by: ['referrerId'],
            where: {
                referrerId: { in: userIds },
                status: 'COMPLETED'
            },
            _sum: { amount: true }
        });

        const earningsMap = new Map(earnings.map(e => [e.referrerId, e._sum.amount || 0]));

        const formatted = users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            referralCode: u.referralCode,
            referrer: u.referrer ? {
                id: u.referrer.id,
                username: u.referrer.username,
                code: u.referrer.referralCode
            } : null,
            totalInvited: u._count.referrals,
            totalEarned: earningsMap.get(u.id) || 0,
            createdAt: u.createdAt
        }));

        return {
            users: formatted,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getAdminReferralHistory(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [history, total] = await Promise.all([
            this.prisma.referralHistory.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    referrer: { select: { username: true, email: true } },
                    referredUser: { select: { username: true, email: true } },
                    reward: { select: { name: true, conditionType: true } }
                }
            }),
            this.prisma.referralHistory.count()
        ]);

        return {
            history: history.map(h => ({
                id: h.id,
                referrer: h.referrer?.username,
                referee: h.referredUser?.username,
                rewardName: h.reward?.name,
                condition: h.reward?.conditionType,
                amount: h.amount,
                status: h.status,
                createdAt: h.createdAt
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Admin Reward Management
    async createRewardRule(data: any) {
        try {
            // Only pass known fields to avoid Prisma strict-input errors
            const payload = {
                name: data.name,
                description: data.description || null,
                conditionType: data.conditionType,
                conditionValue: Number(data.conditionValue ?? 0),
                rewardType: data.rewardType,
                rewardAmount: Number(data.rewardAmount),
                isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
            };
            return await this.prisma.referralReward.create({ data: payload });
        } catch (err: any) {
            throw new BadRequestException(err?.message || 'Failed to create referral reward rule');
        }
    }

    async getRewardRules() {
        return this.prisma.referralReward.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllRewardRules() {
        return this.prisma.referralReward.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async toggleRewardRule(id: number) {
        const rule = await this.prisma.referralReward.findUnique({ where: { id } });
        if (!rule) throw new Error(`ReferralReward ${id} not found`);
        return this.prisma.referralReward.update({
            where: { id },
            data: { isActive: !rule.isActive },
        });
    }

    async deleteRewardRule(id: number) {
        return this.prisma.referralReward.delete({ where: { id } });
    }

    async getAffiliateGlobalStats() {
        // 1. Total Commission Paid
        const totalCommission = await this.prisma.referralHistory.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { amount: true }
        });

        // 2. Total Referred Users
        const totalReferrals = await this.prisma.user.count({
            where: { referrerId: { not: null } }
        });

        // 3. Top Affiliates (By Commission)
        const topAffiliatesGrouped = await this.prisma.referralHistory.groupBy({
            by: ['referrerId'],
            where: { status: 'COMPLETED' },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 10
        });

        // Fetch User details for these IDs
        const topAffiliates = await Promise.all(topAffiliatesGrouped.map(async (item) => {
            const user = await this.prisma.user.findUnique({
                where: { id: item.referrerId },
                select: { username: true, email: true, _count: { select: { referrals: true } } }
            });
            return {
                referrerId: item.referrerId,
                username: user?.username || 'Unknown',
                email: user?.email,
                totalCommission: item._sum.amount || 0,
                referralCount: user?._count.referrals || 0
            };
        }));

        return {
            totalCommission: totalCommission._sum.amount || 0,
            totalReferrals,
            topAffiliates
        };
    }
}
