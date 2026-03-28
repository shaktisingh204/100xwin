'use server'

import connectMongo from '@/lib/mongo';
import { prisma } from '@/lib/db';
import { Bonus } from '@/models/MongoModels';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

type DepositCurrency = 'INR' | 'CRYPTO';
type BonusDocumentShape = {
    _id: string;
    title: string;
    percentage?: number | null;
    amount?: number | null;
    maxBonus?: number | null;
    currency?: string | null;
    validFrom?: Date | string | null;
    validUntil?: Date | string | null;
    usageLimit?: number | null;
    usageCount?: number | null;
    forFirstDepositOnly?: boolean | null;
    minDeposit?: number | null;
    applicableTo?: string | null;
    wageringRequirement?: number | null;
    depositWagerMultiplier?: number | null;
    expiryDays?: number | null;
};
type UserBonusRecord = {
    id: number;
    userId: number;
    bonusId: string;
    bonusCode: string;
    bonusTitle: string;
    bonusCurrency: string | null;
    applicableTo: string | null;
    bonusAmount: number;
    wageringRequired: number;
    wageringDone: number;
    status: string;
    expiresAt: Date | null;
};
type UserBonusTxClient = Prisma.TransactionClient & {
    userBonus: {
        findUnique(args: { where: { id: number } }): Promise<UserBonusRecord | null>;
        findMany(args: {
            where: {
                userId: number;
                status: string;
                expiresAt?: { lte: Date };
                applicableTo?: { in: string[] };
                bonusId?: string;
            };
        }): Promise<UserBonusRecord[]>;
        findFirst(args: {
            where: {
                userId: number;
                bonusId?: string;
                status?: string | { not: string };
                applicableTo?: { in: string[] };
            };
        }): Promise<UserBonusRecord | null>;
        create(args: { data: Record<string, unknown> }): Promise<unknown>;
        update(args: {
            where: { id: number };
            data: Record<string, unknown>;
        }): Promise<unknown>;
    };
};
type NotificationClient = typeof prisma & {
    notification: {
        create(args: {
            data: {
                userId: number;
                title: string;
                body: string;
            };
        }): Promise<unknown>;
    };
};

const withUserBonusTx = (tx: Prisma.TransactionClient) =>
    tx as unknown as UserBonusTxClient;
const prismaWithNotification = prisma as unknown as NotificationClient;

const roundCurrency = (value: number) =>
    parseFloat((Number(value || 0)).toFixed(2));

const normalizeDepositCurrency = (currency?: unknown): DepositCurrency =>
    currency === 'CRYPTO' ? 'CRYPTO' : 'INR';

const isBonusCurrencyEligible = (
    bonusCurrency?: string | null,
    depositCurrency?: DepositCurrency,
) => !bonusCurrency || bonusCurrency === 'BOTH' || bonusCurrency === depositCurrency;

const calculateBonusAmount = (
    bonus: BonusDocumentShape,
    depositAmount: number,
) => {
    let bonusAmount =
        Number(bonus?.percentage || 0) > 0
            ? (depositAmount * Number(bonus.percentage || 0)) / 100
            : Number(bonus?.amount || 0);

    const maxBonus = Number(bonus?.maxBonus || 0);
    if (maxBonus > 0) {
        bonusAmount = Math.min(bonusAmount, maxBonus);
    }

    return roundCurrency(bonusAmount);
};

const getBonusWalletField = (
    applicableTo?: string | null,
    isCrypto = false,
) => {
    if (isCrypto) return 'cryptoBonus';
    return applicableTo === 'SPORTS' ? 'sportsBonus' : 'casinoBonus';
};

const getBonusWalletLabel = (
    applicableTo?: string | null,
    isCrypto = false,
) => {
    if (isCrypto) return 'Crypto Bonus';
    return applicableTo === 'SPORTS' ? 'Sports Bonus' : 'Casino Bonus';
};

const getBonusConflictTypes = (applicableTo?: string | null) =>
    applicableTo === 'BOTH' ? ['CASINO', 'SPORTS', 'BOTH'] : [applicableTo || 'BOTH', 'BOTH'];

async function forfeitUserBonus(tx: Prisma.TransactionClient, userBonusId: number) {
    const bonusTx = withUserBonusTx(tx);
    const userBonus = await bonusTx.userBonus.findUnique({
        where: { id: userBonusId },
    });
    if (!userBonus || userBonus.status !== 'ACTIVE') return null;

    const applicableTo = userBonus.applicableTo || 'BOTH';
    const isCrypto = userBonus.bonusCurrency === 'CRYPTO';
    const bonusWalletField = getBonusWalletField(applicableTo, isCrypto);
    const wageringDone = Math.min(
        Number(userBonus.wageringDone || 0),
        Number(userBonus.wageringRequired || 0),
    );

    await bonusTx.userBonus.update({
        where: { id: userBonusId },
        data: {
            status: 'FORFEITED',
            forfeitedAt: new Date(),
        },
    });

    const userUpdate: Record<string, unknown> = {
        [bonusWalletField]: { decrement: Number(userBonus.bonusAmount || 0) },
        wageringRequired: { decrement: Number(userBonus.wageringRequired || 0) },
        wageringDone: { decrement: wageringDone },
    };

    if (applicableTo !== 'SPORTS') {
        userUpdate.casinoBonusWageringRequired = {
            decrement: Number(userBonus.wageringRequired || 0),
        };
        userUpdate.casinoBonusWageringDone = { decrement: wageringDone };
    }

    if (applicableTo === 'SPORTS') {
        userUpdate.sportsBonusWageringRequired = {
            decrement: Number(userBonus.wageringRequired || 0),
        };
        userUpdate.sportsBonusWageringDone = { decrement: wageringDone };
    }

    await tx.user.update({
        where: { id: userBonus.userId },
        data: userUpdate as Prisma.UserUpdateInput,
    });

    return userBonus;
}

async function expireOverdueUserBonuses(
    tx: Prisma.TransactionClient,
    userId: number,
) {
    const bonusTx = withUserBonusTx(tx);
    const expiredBonuses = await bonusTx.userBonus.findMany({
        where: {
            userId,
            status: 'ACTIVE',
            expiresAt: { lte: new Date() },
        },
    });

    for (const userBonus of expiredBonuses) {
        await forfeitUserBonus(tx, userBonus.id);
    }
}

async function applyEligibleDepositBonus(
    tx: Prisma.TransactionClient,
    transaction: {
        userId: number;
        amount: number;
        paymentDetails: Prisma.JsonValue | null;
    },
    approvedDepositCountBeforeThisDeposit: number,
) {
    const paymentDetails =
        transaction.paymentDetails &&
        typeof transaction.paymentDetails === 'object' &&
        !Array.isArray(transaction.paymentDetails)
            ? (transaction.paymentDetails as Record<string, unknown>)
            : {};

    const rawBonusCode =
        typeof paymentDetails.bonusCode === 'string'
            ? paymentDetails.bonusCode
            : '';
    const bonusCode = rawBonusCode.trim().toUpperCase();
    if (!bonusCode) return { applied: false };

    await connectMongo();
    const bonus = await Bonus.findOne({ code: bonusCode, isActive: true }).lean<BonusDocumentShape>();
    if (!bonus) return { applied: false };

    const now = new Date();
    const depositCurrency = normalizeDepositCurrency(paymentDetails.depositCurrency);
    if (bonus.validFrom && new Date(bonus.validFrom) > now) return { applied: false };
    if (bonus.validUntil && new Date(bonus.validUntil) < now) return { applied: false };
    if (Number(bonus.usageLimit || 0) > 0 && Number(bonus.usageCount || 0) >= Number(bonus.usageLimit || 0)) return { applied: false };
    if (!isBonusCurrencyEligible(bonus.currency, depositCurrency)) return { applied: false };
    if (bonus.forFirstDepositOnly && approvedDepositCountBeforeThisDeposit > 0) return { applied: false };
    if (transaction.amount < Number(bonus.minDeposit || 0)) return { applied: false };

    const applicableTo = bonus.applicableTo || 'BOTH';

    const bonusTx = withUserBonusTx(tx);
    const existingRedemption = await bonusTx.userBonus.findFirst({
        where: {
            userId: transaction.userId,
            bonusId: String(bonus._id),
            status: { not: 'FORFEITED' },
        },
    });
    if (existingRedemption) return { applied: false };

    await expireOverdueUserBonuses(tx, transaction.userId);

    const existingConflict = await bonusTx.userBonus.findFirst({
        where: {
            userId: transaction.userId,
            status: 'ACTIVE',
            applicableTo: { in: getBonusConflictTypes(applicableTo) },
        },
    });
    if (existingConflict) {
        await forfeitUserBonus(tx, existingConflict.id);
    }

    const bonusAmount = calculateBonusAmount(bonus, transaction.amount);
    if (bonusAmount <= 0) return { applied: false };

    const wageringRequirement = Number(bonus.wageringRequirement || 1);
    const wageringRequired = roundCurrency(bonusAmount * wageringRequirement);
    const depositWagerMultiplier = Number(bonus.depositWagerMultiplier ?? 1) || 1;
    const expiryDays = Number(bonus.expiryDays ?? 30) || 30;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const isCrypto = depositCurrency === 'CRYPTO';
    const bonusWalletField = getBonusWalletField(applicableTo, isCrypto);
    const walletLabel = getBonusWalletLabel(applicableTo, isCrypto);

    const userUpdate: Record<string, unknown> = {
        [bonusWalletField]: { increment: bonusAmount },
        wageringRequired: { increment: wageringRequired },
        depositWageringRequired: {
            increment: roundCurrency(transaction.amount * depositWagerMultiplier),
        },
    };

    if (!isCrypto) {
        if (applicableTo === 'SPORTS') {
            userUpdate.sportsBonusWageringRequired = { increment: wageringRequired };
        } else {
            userUpdate.casinoBonusWageringRequired = { increment: wageringRequired };
        }
    }

    await tx.user.update({
        where: { id: transaction.userId },
        data: userUpdate as Prisma.UserUpdateInput,
    });

    await bonusTx.userBonus.create({
        data: {
            userId: transaction.userId,
            bonusId: String(bonus._id),
            bonusCode,
            bonusTitle: bonus.title,
            bonusCurrency: bonus.currency || 'INR',
            applicableTo,
            depositAmount: transaction.amount,
            bonusAmount,
            wageringRequired,
            wageringDone: 0,
            status: 'ACTIVE',
            expiresAt,
        },
    });

    await tx.transaction.create({
        data: {
            userId: transaction.userId,
            amount: bonusAmount,
            type: 'BONUS',
            status: 'APPROVED',
            remarks: `${walletLabel}: ${bonus.title} (${bonusCode}) — ${wageringRequirement}x wagering, ${applicableTo} only`,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });

    await Bonus.findByIdAndUpdate(bonus._id, { $inc: { usageCount: 1 } });

    return {
        applied: true,
        bonusCode,
        bonusAmount,
        bonusTitle: bonus.title,
    };
}

export async function getTransactions(
    page = 1,
    limit = 10,
    search = '',
    status = '',
    type = '',
    reviewQueueOnly = false,
) {
    const skip = (page - 1) * limit;
    const where: Prisma.TransactionWhereInput = {};

    if (search) {
        where.OR = [
            { utr: { contains: search, mode: 'insensitive' } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
    }

    if (status && status !== 'ALL') {
        if (type === 'DEPOSIT' && status === 'COMPLETED') {
            where.status = { in: ['COMPLETED', 'APPROVED'] };
        } else {
            where.status = status;
        }
    }

    if (type && type !== 'ALL') {
        where.type = type;
    }

    if (reviewQueueOnly && type === 'DEPOSIT') {
        const existingAndClauses = Array.isArray(where.AND)
            ? where.AND
            : where.AND
                ? [where.AND]
                : [];
        where.AND = [
            ...existingAndClauses,
            {
                OR: [
                    { paymentMethod: { contains: 'manual', mode: 'insensitive' } },
                    { paymentDetails: { path: ['gateway'], equals: 'manual_upi' } },
                    { paymentDetails: { path: ['gateway'], equals: 'admin_manual' } },
                    { paymentDetails: { path: ['requiresAdminReview'], equals: true } },
                ],
            },
        ];
    }

    try {
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { username: true, email: true, phoneNumber: true } }
                }
            }),
            prisma.transaction.count({ where })
        ]);

        return {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        throw new Error('Failed to fetch transactions');
    }
}

export async function getTransactionStats() {
    try {
        const [deposits, withdrawals, pendingWithdrawals] = await Promise.all([
            prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: { in: ['APPROVED', 'COMPLETED'] } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { type: 'WITHDRAWAL', status: 'Approved' }, // Case sensitivity check needed
                _sum: { amount: true }
            }),
            prisma.transaction.count({
                where: { type: 'WITHDRAWAL', status: 'PENDING' }
            })
        ]);

        return {
            totalDeposits: deposits._sum.amount || 0,
            totalWithdrawals: withdrawals._sum.amount || 0,
            pendingWithdrawals,
            todayRevenue: 0 // Need date filter logic
        };
    } catch {
        return {
            totalDeposits: 0,
            totalWithdrawals: 0,
            pendingWithdrawals: 0,
            todayRevenue: 0
        };
    }
}

export async function approveWithdrawal(transactionId: number, adminId: number, remarks: string, txnId?: string) {
    try {
        // Fetch the transaction first so we can use amount + userId for the notification
        const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!txn) return { success: false, error: 'Transaction not found' };

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'APPROVED',
                adminId,
                remarks,
                ...(txnId ? { transactionId: txnId } : {}),
                updatedAt: new Date()
            }
        });

        // Create in-app notification for the user
        const amtStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(txn.amount);
        const notifBody = txnId
            ? `Your withdrawal of ${amtStr} has been approved. Transaction ID: ${txnId}`
            : `Your withdrawal of ${amtStr} has been approved and is being processed.`;

        await prismaWithNotification.notification.create({
            data: {
                userId: txn.userId,
                title: '✅ Withdrawal Approved',
                body: notifBody,
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                adminId,
                action: 'APPROVE_WITHDRAWAL',
                details: { transactionId, remarks, txnId }
            }
        });

        revalidatePath('/dashboard/finance/transactions');
        return { success: true };
    } catch (error) {
        console.error('approveWithdrawal error:', error);
        return { success: false, error: 'Failed to approve withdrawal' };
    }
}

export async function rejectWithdrawal(transactionId: number, adminId: number, remarks: string) {
    try {
        const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!txn) return { success: false, error: 'Transaction not found' };

        // Refund balance if rejected
        // Use transaction to ensure atomicity
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'REJECTED',
                    adminId,
                    remarks,
                    updatedAt: new Date()
                }
            }),
            prisma.user.update({
                where: { id: txn.userId },
                data: {
                    balance: { increment: txn.amount }
                }
            }),
            prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'REJECT_WITHDRAWAL',
                    details: { transactionId, remarks }
                }
            })
        ]);

        revalidatePath('/dashboard/finance/transactions');
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to reject withdrawal' };
    }
}

export async function approveDeposit(transactionId: number, adminId: number, remarks: string, txnId?: string) {
    try {
        const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!txn) return { success: false, error: 'Transaction not found' };
        if (txn.type !== 'DEPOSIT') return { success: false, error: 'Transaction is not a deposit' };
        if (txn.status !== 'PENDING') return { success: false, error: 'Transaction is not pending' };

        const approvedDepositCountBeforeThisDeposit = await prisma.transaction.count({
            where: {
                userId: txn.userId,
                type: 'DEPOSIT',
                status: { in: ['APPROVED', 'COMPLETED'] },
                id: { not: transactionId },
            },
        });

        const bonusResult = await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'COMPLETED',
                    adminId,
                    remarks,
                    ...(txnId ? { transactionId: txnId } : {}),
                    updatedAt: new Date(),
                },
            });

            await tx.user.update({
                where: { id: txn.userId },
                data: {
                    balance: { increment: txn.amount },
                    totalDeposited: { increment: txn.amount },
                },
            });

            const appliedBonus = await applyEligibleDepositBonus(
                tx,
                {
                    userId: txn.userId,
                    amount: txn.amount,
                    paymentDetails: txn.paymentDetails,
                },
                approvedDepositCountBeforeThisDeposit,
            );

            if (!appliedBonus.applied) {
                await tx.user.update({
                    where: { id: txn.userId },
                    data: {
                        depositWageringRequired: { increment: txn.amount },
                    } as Prisma.UserUpdateInput,
                });
            }

            await tx.auditLog.create({
                data: {
                    adminId,
                    action: 'APPROVE_DEPOSIT',
                    details: {
                        transactionId,
                        remarks,
                        txnId,
                        bonusApplied: appliedBonus.applied,
                        bonusCode: appliedBonus.applied ? appliedBonus.bonusCode : null,
                    },
                },
            });

            return appliedBonus;
        });

        try {
            const adminToken = process.env.ADMIN_SECRET_TOKEN || '';
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            await fetch(`${apiUrl}/admin/bonus/emit-wallet-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
                body: JSON.stringify({ userId: txn.userId }),
            });
        } catch (emitErr) {
            console.warn('Failed to emit wallet refresh after deposit approval:', emitErr);
        }

        // Create in-app notification (non-blocking — don't fail the approval if this fails)
        try {
            const amtStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(txn.amount);
            const bonusLine = bonusResult.applied
                ? ` Bonus ${bonusResult.bonusCode} was applied to this deposit.`
                : '';
            const notifBody = txnId
                ? `Your deposit of ${amtStr} has been approved. Transaction ID: ${txnId}.${bonusLine}`
                : `Your deposit of ${amtStr} has been approved and credited to your account.${bonusLine}`;

            await prismaWithNotification.notification.create({
                data: {
                    userId: txn.userId,
                    title: '✅ Deposit Approved',
                    body: notifBody,
                }
            });
        } catch (notifErr) {
            console.warn('Failed to create deposit approval notification:', notifErr);
        }

        revalidatePath('/dashboard/finance/transactions');
        revalidatePath('/dashboard/finance/deposits');
        return {
            success: true,
            bonusApplied: bonusResult.applied,
            bonusCode: bonusResult.applied ? bonusResult.bonusCode : undefined,
        };
    } catch (error) {
        console.error('approveDeposit error:', error);
        return { success: false, error: 'Failed to approve deposit' };
    }
}

export async function rejectDeposit(transactionId: number, adminId: number, remarks: string) {
    try {
        const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!txn) return { success: false, error: 'Transaction not found' };
        if (txn.type !== 'DEPOSIT') return { success: false, error: 'Transaction is not a deposit' };
        if (txn.status !== 'PENDING') return { success: false, error: 'Transaction is not pending' };

        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'REJECTED',
                    adminId,
                    remarks,
                    updatedAt: new Date()
                }
            }),
            prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'REJECT_DEPOSIT',
                    details: { transactionId, remarks }
                }
            })
        ]);

        // Notify user (non-blocking)
        try {
            const amtStr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(txn.amount);
            await prismaWithNotification.notification.create({
                data: {
                    userId: txn.userId,
                    title: '❌ Deposit Rejected',
                    body: `Your deposit of ${amtStr} has been rejected. Reason: ${remarks}`,
                }
            });
        } catch (notifErr) {
            console.warn('Failed to create deposit rejection notification:', notifErr);
        }

        revalidatePath('/dashboard/finance/transactions');
        revalidatePath('/dashboard/finance/deposits');
        return { success: true };
    } catch (error) {
        console.error('rejectDeposit error:', error);
        return { success: false, error: 'Failed to reject deposit' };
    }
}

export async function createManualAdjustment(userId: number, type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, remarks: string, adminId: number) {
    try {
        const increment = type === 'DEPOSIT' ? amount : -amount;

        // Check balance if withdrawal
        if (type === 'WITHDRAWAL') {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.balance < amount) {
                return { success: false, error: 'Insufficient balance' };
            }
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { balance: { increment } }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    amount,
                    type, // Enum or String? Schema says String
                    status: 'COMPLETED',
                    paymentMethod: 'MANUAL',
                    adminId,
                    remarks,
                    transactionId: `MAN-${Date.now()}`
                }
            }),
            prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'MANUAL_ADJUSTMENT',
                    details: { userId, type, amount, remarks }
                }
            })
        ]);

        // Track wagering requirement for manual deposits
        if (type === 'DEPOSIT') {
            await prisma.user.update({
                where: { id: userId },
                data: { wageringRequired: { increment: amount } } as Prisma.UserUpdateInput
            });
        }

        revalidatePath('/dashboard/finance/transactions');
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to create adjustment' };
    }
}

export async function searchUsersForManualDeposit(search: string, limit = 8) {
    try {
        const query = search.trim();
        if (query.length < 2) return { success: true, data: [] };

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                username: true,
                email: true,
                balance: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return { success: true, data: users };
    } catch (error) {
        console.error('searchUsersForManualDeposit error:', error);
        return { success: false, error: 'Failed to search users', data: [] };
    }
}

export async function createManualDeposit(data: {
    userId: number;
    amount: number;
    method?: string;
    utr?: string;
    remarks?: string;
    adminId?: number;
}) {
    try {
        const numAmount = Number(data.amount);
        if (!data.userId || !numAmount || numAmount <= 0) {
            return { success: false, error: 'userId and a positive amount are required' };
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(data.userId) },
            select: { id: true, username: true, email: true },
        });
        if (!user) return { success: false, error: 'User not found' };

        const utrRef = (data.utr || '').trim() || `ADMIN${Date.now()}`;
        const adminId = Number(data.adminId || 1);

        const [, txn] = await prisma.$transaction([
            prisma.user.update({
                where: { id: Number(data.userId) },
                data: {
                    balance: { increment: numAmount },
                    totalDeposited: { increment: numAmount },
                    wageringRequired: { increment: numAmount },
                },
            }),
            prisma.transaction.create({
                data: {
                    userId: Number(data.userId),
                    amount: numAmount,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    paymentMethod: data.method || 'Manual Deposit (Admin)',
                    utr: utrRef,
                    remarks: data.remarks || 'Manual deposit by admin',
                    adminId,
                    paymentDetails: {
                        gateway: 'admin_manual',
                        requiresAdminReview: false,
                        addedBy: adminId,
                        adminNote: data.remarks || '',
                    } as Prisma.JsonObject,
                },
            }),
            prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'MANUAL_DEPOSIT',
                    details: {
                        userId: Number(data.userId),
                        amount: numAmount,
                        method: data.method || 'Manual Deposit (Admin)',
                        utr: utrRef,
                        remarks: data.remarks || '',
                    },
                },
            }),
        ]);

        revalidatePath('/dashboard/finance/deposits');
        revalidatePath('/dashboard/finance/transactions');
        revalidatePath(`/dashboard/users/${data.userId}`);

        return {
            success: true,
            message: `Deposited ₹${numAmount} to ${user.username || user.email}`,
            transactionId: txn.id,
        };
    } catch (error) {
        console.error('createManualDeposit error:', error);
        return { success: false, error: 'Failed to process manual deposit' };
    }
}

// dispatchWithdrawal removed — all withdrawals are now fully manual (admin approve/reject only).
