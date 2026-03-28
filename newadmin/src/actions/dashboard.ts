'use server'

import { prisma } from '@/lib/db';
import connectMongo from '@/lib/mongo';
import { Bet } from '@/models/MongoModels';

// ─── Main Dashboard Stats (all from Prisma / PostgreSQL) ────────────────────

const completedDepositStatuses = ['APPROVED', 'COMPLETED'];

export async function getDashboardStats() {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            activeUsers,
            newTodayUsers,
            newWeekUsers,

            // Deposits can land as APPROVED (gateway) or COMPLETED (manual/admin)
            totalDeposits,
            todayDeposits,

            // Withdrawals: admin approves → status = 'APPROVED'
            totalWithdrawals,
            todayWithdrawals,
            pendingWithdrawals,
            pendingWithdrawalsAmount,

            // Recent transactions
            recentTransactions,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { isBanned: false } }),
            prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
            prisma.user.count({ where: { createdAt: { gte: weekStart } } }),

            prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: { in: completedDepositStatuses } },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.transaction.aggregate({
                where: {
                    type: 'DEPOSIT',
                    status: { in: completedDepositStatuses },
                    createdAt: { gte: todayStart },
                },
                _sum: { amount: true },
            }),

            prisma.transaction.aggregate({
                where: { type: 'WITHDRAWAL', status: 'APPROVED' },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.transaction.aggregate({
                where: { type: 'WITHDRAWAL', status: 'APPROVED', createdAt: { gte: todayStart } },
                _sum: { amount: true },
            }),
            prisma.transaction.count({
                where: { type: 'WITHDRAWAL', status: 'PENDING' },
            }),
            prisma.transaction.aggregate({
                where: { type: 'WITHDRAWAL', status: 'PENDING' },
                _sum: { amount: true },
            }),

            prisma.transaction.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { username: true, email: true } } },
            }),
        ]);

        const depositsTotal = totalDeposits._sum.amount || 0;
        const withdrawalsTotal = totalWithdrawals._sum.amount || 0;
        const ggr = depositsTotal - withdrawalsTotal;

        return {
            success: true,
            data: {
                // User stats
                totalUsers,
                activeUsers,
                newTodayUsers,
                newWeekUsers,

                // Financial
                ggr,
                totalDeposits: depositsTotal,
                todayDeposits: todayDeposits._sum.amount || 0,
                totalWithdrawals: withdrawalsTotal,
                todayWithdrawals: todayWithdrawals._sum.amount || 0,
                pendingWithdrawals,
                pendingWithdrawalsAmount: pendingWithdrawalsAmount._sum.amount || 0,
                depositCount: totalDeposits._count,
                withdrawalCount: totalWithdrawals._count,

                // Transactions
                recentTransactions: JSON.parse(JSON.stringify(recentTransactions)),
            }
        };
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return {
            success: false,
            data: {
                totalUsers: 0, activeUsers: 0, newTodayUsers: 0, newWeekUsers: 0,
                ggr: 0, totalDeposits: 0, todayDeposits: 0,
                totalWithdrawals: 0, todayWithdrawals: 0,
                pendingWithdrawals: 0, pendingWithdrawalsAmount: 0,
                depositCount: 0, withdrawalCount: 0,
                recentTransactions: [],
            }
        };
    }
}

// ─── Bet Stats (from MongoDB) ─────────────────────────────────────────────────

export async function getBetStats() {
    try {
        await connectMongo();
        const [totalBets, pendingBets, wonBets, lostBets, betVolume] = await Promise.all([
            Bet.countDocuments(),
            Bet.countDocuments({ status: 'PENDING' }),
            Bet.countDocuments({ status: 'WON' }),
            Bet.countDocuments({ status: 'LOST' }),
            Bet.aggregate([
                { $match: { status: { $in: ['PENDING', 'WON', 'LOST', 'SETTLED'] } } },
                { $group: { _id: null, total: { $sum: '$stake' } } }
            ]),
        ]);
        return {
            success: true,
            data: {
                totalBets, pendingBets, wonBets, lostBets,
                betVolume: betVolume[0]?.total || 0,
            }
        };
    } catch {
        return {
            success: false,
            data: { totalBets: 0, pendingBets: 0, wonBets: 0, lostBets: 0, betVolume: 0 }
        };
    }
}

// ─── Weekly Revenue Chart ─────────────────────────────────────────────────────

export async function getWeeklyRevenueData() {
    try {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const start = new Date();
            start.setDate(start.getDate() - i);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);

            const [dep, wd] = await Promise.all([
                prisma.transaction.aggregate({
                    where: {
                        type: 'DEPOSIT',
                        status: { in: completedDepositStatuses },
                        createdAt: { gte: start, lte: end },
                    },
                    _sum: { amount: true }
                }),
                prisma.transaction.aggregate({
                    where: { type: 'WITHDRAWAL', status: 'APPROVED', createdAt: { gte: start, lte: end } },
                    _sum: { amount: true }
                }),
            ]);

            data.push({
                date: start.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
                deposits: dep._sum.amount || 0,
                withdrawals: wd._sum.amount || 0,
                ggr: (dep._sum.amount || 0) - (wd._sum.amount || 0),
            });
        }
        return data;
    } catch {
        return [];
    }
}
