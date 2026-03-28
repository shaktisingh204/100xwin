'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { Role, KycStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import connectMongo from '@/lib/mongo';
import { Bet } from '@/models/MongoModels';

// ─── Rich user profile used by the detail page ────────────────────────────────

export async function getUserProfile(id: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                manager: { select: { id: true, username: true } },
                referrer: { select: { id: true, username: true } },
                kycDocuments: { orderBy: { createdAt: 'desc' } },
                transactions: { take: 20, orderBy: { createdAt: 'desc' } },
                casinoTransactions: { take: 20, orderBy: { timestamp: 'desc' } },
                userBonuses: { orderBy: { createdAt: 'desc' } },
            }
        });
        return { success: true, user };
    } catch (error) {
        return { success: false, user: null };
    }
}

export async function getUserTransactionsDirect(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    try {
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.transaction.count({ where: { userId } }),
        ]);
        return { success: true, transactions, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    } catch (error) {
        return { success: false, transactions: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
}

export async function getUserCasinoTransactions(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    try {
        const [transactions, total] = await Promise.all([
            prisma.casinoTransaction.findMany({
                where: { user_id: userId },
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
            }),
            prisma.casinoTransaction.count({ where: { user_id: userId } }),
        ]);
        return { success: true, transactions, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    } catch (error) {
        return { success: false, transactions: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
}

export async function getUserSportsBets(userId: number, limit = 50) {
    try {
        await connectMongo();
        const bets = await Bet.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return { success: true, bets: JSON.parse(JSON.stringify(bets)) };
    } catch (error) {
        console.error('getUserSportsBets error:', error);
        return { success: false, bets: [] };
    }
}

export async function updateUserProfile(userId: number, data: {
    email?: string;
    phoneNumber?: string;
    role?: string;
    currency?: string;
    country?: string;
}) {
    try {
        const updateData: any = {};
        if (data.email) updateData.email = data.email.toLowerCase();
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber || null;
        if (data.role) updateData.role = data.role as Role;
        if (data.currency) updateData.currency = data.currency;
        if (data.country !== undefined) updateData.country = data.country || null;

        await prisma.user.update({ where: { id: userId }, data: updateData });
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: 'Email or phone number already in use.' };
        return { success: false, error: 'Failed to update profile.' };
    }
}

export async function resetUserPassword(userId: number, newPassword: string) {
    try {
        if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to reset password.' };
    }
}

export async function setRGLimitsAction(userId: number, limits: {
    depositLimit?: number | null;
    lossLimit?: number | null;
    selfExclusionUntil?: string | null;
}) {
    try {
        const data: any = {};
        if (limits.depositLimit !== undefined) data.depositLimit = limits.depositLimit;
        if (limits.lossLimit !== undefined) data.lossLimit = limits.lossLimit;
        if (limits.selfExclusionUntil !== undefined) {
            data.selfExclusionUntil = limits.selfExclusionUntil ? new Date(limits.selfExclusionUntil) : null;
        }
        await prisma.user.update({ where: { id: userId }, data });
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to update limits.' };
    }
}

export async function getManagersList() {
    try {
        const managers = await prisma.user.findMany({
            where: { role: { in: ['MANAGER', 'SUPER_ADMIN', 'MASTER', 'AGENT'] as Role[] } },
            select: { id: true, username: true, role: true },
            orderBy: { username: 'asc' },
        });
        return managers;
    } catch {
        return [];
    }
}

export async function createUser(data: {
    username: string;
    email: string;
    phoneNumber?: string;
    password: string;
    role: string;
}) {
    try {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await prisma.user.create({
            data: {
                username: data.username,
                email: data.email.toLowerCase(),
                phoneNumber: data.phoneNumber || null,
                password: hashedPassword,
                role: data.role as Role,
            }
        });
        revalidatePath('/dashboard/users');
        return { success: true, user };
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: 'Username or email already exists.' };
        }
        return { success: false, error: 'Failed to create user.' };
    }
}

export async function getUsers(page = 1, limit = 10, search = '', role = '', status = '') {
    const skip = (page - 1) * limit;

    try {
        const params: any[] = [];
        const countParams: any[] = [];
        const conditions: string[] = [];

        // Search — pass the same value 3 times for 3 different $N placeholders
        if (search) {
            const s = `%${search}%`;
            const n = params.length;
            params.push(s, s, s);        // $1 $2 $3 (or offset)
            countParams.push(s, s, s);
            conditions.push(`(username ILIKE $${n + 1} OR email ILIKE $${n + 2} OR "phoneNumber" ILIKE $${n + 3})`);
        }

        // Role filter — cast the string to the Role enum
        if (role && role !== 'ALL') {
            const n = params.length;
            params.push(role);
            countParams.push(role);
            conditions.push(`role::text = $${n + 1}`);
        }

        // Status filter — no extra params needed (boolean literals)
        if (status === 'BANNED') {
            conditions.push(`"isBanned" = true`);
        } else if (status === 'ACTIVE') {
            conditions.push(`"isBanned" = false`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // LIMIT / OFFSET come after search/role params
        const li = params.length + 1;
        const oi = params.length + 2;
        params.push(limit, skip);

        const [rows, countResult] = await Promise.all([
            prisma.$queryRawUnsafe(`
                SELECT * FROM "User"
                ${where}
                ORDER BY "createdAt" DESC
                LIMIT $${li} OFFSET $${oi}
            `, ...params) as any,
            prisma.$queryRawUnsafe(`
                SELECT COUNT(*)::int AS total FROM "User" ${where}
            `, ...countParams) as any,
        ]);

        // Pick only the fields we need so the shape is predictable
        const users = (rows as any[]).map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            phoneNumber: u.phoneNumber,
            role: u.role,
            isBanned: u.isBanned ?? false,
            balance: u.balance ?? 0,
            bonus: u.bonus ?? 0,
            currency: u.currency ?? 'INR',
            kycStatus: u.kycStatus ?? 'NONE',
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            managerId: u.managerId ?? null,
            referrerId: u.referrerId ?? null,
        }));

        const total = Number(countResult[0]?.total ?? 0);

        return {
            users: users as any[],
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw new Error('Failed to fetch users');
    }
}

export async function getUserById(id: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                manager: { select: { id: true, username: true } },
                referrer: { select: { id: true, username: true } },
                kycDocuments: true,
                transactions: { take: 5, orderBy: { createdAt: 'desc' } },
                casinoTransactions: { take: 5, orderBy: { timestamp: 'desc' } },
            }
        });
        return user;
    } catch (error) {
        throw new Error('User not found');
    }
}

export async function updateUserStatus(userId: number, isBanned: boolean, banReason?: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isBanned }
        });

        // Log the ban/unban action with optional reason
        try {
            await (prisma as any).auditLog.create({
                data: {
                    adminId: 1,
                    action: isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
                    details: {
                        userId,
                        reason: banReason || null,
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        } catch {
            // AuditLog table may not exist — skip silently
        }

        revalidatePath('/dashboard/users');
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update status' };
    }
}

export async function updateUserRole(userId: number, role: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: role as Role }
        });
        revalidatePath('/dashboard/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update role' };
    }
}

export async function verifyKyc(userId: number, status: KycStatus) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { kycStatus: status }
        });
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to verify KYC' };
    }
}

export async function assignManager(userId: number, managerId: number | null) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { managerId }
        });
        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to assign manager' };
    }
}

/** Deletes all dependent records then hard-deletes the user using raw SQL. */
async function deleteUserAndRelations(p: any, userId: number) {
    // Nullify self-referential FKs (this user being manager/agent/master/referrer of others)
    await p.$executeRawUnsafe(`UPDATE "User" SET "managerId" = NULL WHERE "managerId" = ${userId}`);
    await p.$executeRawUnsafe(`UPDATE "User" SET "agentId" = NULL WHERE "agentId" = ${userId}`);
    await p.$executeRawUnsafe(`UPDATE "User" SET "masterId" = NULL WHERE "masterId" = ${userId}`);
    await p.$executeRawUnsafe(`UPDATE "User" SET "referrerId" = NULL WHERE "referrerId" = ${userId}`);

    // Delete leaf tables first (deepest FK dependencies first)
    await p.$executeRawUnsafe(`DELETE FROM "OriginalsEngagementEvent" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "OriginalsSession" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "MinesGame" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "PasswordResetToken" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "VipApplication" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "UserBonus" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "KycDocument" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "CasinoTransaction" WHERE "user_id" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE "userId" = ${userId}`);
    await p.$executeRawUnsafe(`DELETE FROM "ReferralHistory" WHERE "referrerId" = ${userId} OR "referredUserId" = ${userId}`);

    // Support messages → tickets (two-level delete)
    await p.$executeRawUnsafe(`
        DELETE FROM "SupportMessage"
        WHERE "ticketId" IN (SELECT id FROM "SupportTicket" WHERE "userId" = ${userId})
    `);
    await p.$executeRawUnsafe(`DELETE FROM "SupportTicket" WHERE "userId" = ${userId}`);

    // Finally delete the user
    await p.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" = ${userId}`);
}


export async function deleteUser(userId: number) {
    try {
        await deleteUserAndRelations(prisma, userId);
        revalidatePath('/dashboard/users');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete user:', error);
        return { success: false, error: 'Failed to permanently delete user.' };
    }
}

export async function exportUsers(search = '', role = '', status = '') {
    try {
        const params: any[] = [];
        const conditions: string[] = [];

        if (search) {
            const s = `%${search}%`;
            params.push(s, s, s);
            conditions.push(`(username ILIKE $1 OR email ILIKE $2 OR "phoneNumber" ILIKE $3)`);
        }

        if (role && role !== 'ALL') {
            const n = params.length;
            params.push(role);
            conditions.push(`role::text = $${n + 1}`);
        }

        if (status === 'BANNED') {
            conditions.push(`"isBanned" = true`);
        } else if (status === 'ACTIVE') {
            conditions.push(`"isBanned" = false`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const rows = await prisma.$queryRawUnsafe(`
            SELECT username, email, "phoneNumber" FROM "User"
            ${where}
            ORDER BY "createdAt" DESC
        `, ...params) as any[];

        const users = rows.map((u: any) => ({
            username: u.username ?? '',
            email: u.email ?? '',
            phoneNumber: u.phoneNumber ?? '',
        }));

        return { success: true, users };
    } catch (error) {
        console.error('Failed to export users:', error);
        return { success: false, users: [] };
    }
}

export async function performBulkAction(userIds: number[], action: 'BAN' | 'VERIFY' | 'BONUS' | 'DELETE', data?: any) {
    try {
        if (action === 'BAN') {
            await prisma.user.updateMany({
                where: { id: { in: userIds } },
                data: { isBanned: true }
            });
        } else if (action === 'VERIFY') {
            await prisma.user.updateMany({
                where: { id: { in: userIds } },
                data: { kycStatus: 'VERIFIED' }
            });
        } else if (action === 'BONUS') {
            const amount = parseFloat(data?.amount || '0');
            if (amount > 0) {
                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                for (const uid of userIds) {
                    try {
                        await (prisma as any).$transaction([
                            // Credit the casino bonus wallet
                            (prisma as any).user.update({
                                where: { id: uid },
                                data: { casinoBonus: { increment: amount } },
                            }),
                            // Create a UserBonus record so the bonus shows in My Bonuses
                            (prisma as any).userBonus.create({
                                data: {
                                    userId: uid,
                                    bonusId: 'admin_bulk',
                                    bonusCode: 'ADMIN_BULK',
                                    bonusTitle: 'Admin Bonus Credit',
                                    bonusCurrency: 'INR',
                                    applicableTo: 'CASINO',
                                    depositAmount: 0,
                                    bonusAmount: amount,
                                    wageringRequired: 0,
                                    wageringDone: 0,
                                    status: 'ACTIVE',
                                    expiresAt,
                                },
                            }),
                            // Transaction log entry
                            (prisma as any).transaction.create({
                                data: {
                                    userId: uid,
                                    amount,
                                    type: 'BONUS',
                                    status: 'APPROVED',
                                    remarks: 'Bulk Casino Bonus Credit (Admin)',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                },
                            }),
                        ]);
                    } catch (e) {
                        console.error(`Failed to give bonus to user ${uid}`, e);
                    }
                }
            }
        } else if (action === 'DELETE') {
            for (const uid of userIds) {
                await deleteUserAndRelations(prisma, uid);
            }
        }

        revalidatePath('/dashboard/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Bulk action failed' };
    }
}

/**
 * Convert a user's active bonus between casino ↔ sports.
 * - Moves the wallet balance (casinoBonus ↔ sportsBonus)
 * - Moves per-type wagering counters
 * - Updates all active UserBonus records' applicableTo field
 * - Logs an audit transaction
 */
export async function convertBonusType(
    userId: number,
    from: 'CASINO' | 'SPORTS',
    adminId = 1,
) {
    try {
        const to = from === 'CASINO' ? 'SPORTS' : 'CASINO';

        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                casinoBonus: true,
                fiatBonus: true,
                sportsBonus: true,
                casinoBonusWageringRequired: true,
                casinoBonusWageringDone: true,
                sportsBonusWageringRequired: true,
                sportsBonusWageringDone: true,
            },
        });
        if (!user) return { success: false, error: 'User not found' };

        const fromWallet = from === 'CASINO' ? 'casinoBonus' : 'sportsBonus';
        const toWallet = to === 'CASINO' ? 'casinoBonus' : 'sportsBonus';

        // Find active UserBonus records for the source type FIRST — these are the source of truth
        const fromApplicableTo = from === 'CASINO' ? ['CASINO', 'BOTH'] : ['SPORTS'];
        const activeBonuses = await (prisma as any).userBonus.findMany({
            where: { userId, status: 'ACTIVE', applicableTo: { in: fromApplicableTo } },
        });

        // Amount to move: trust split wallet first, then active UserBonus records, then orphan BONUS txns.
        const walletAmount = from === 'CASINO'
            ? parseFloat(((user.casinoBonus || 0) + (user.fiatBonus || 0)).toString())
            : parseFloat((user[fromWallet] || 0).toString());
        const ubAmount = activeBonuses.reduce((s: number, ub: any) => s + parseFloat((ub.bonusAmount || 0).toString()), 0);
        const ubWageringReq = activeBonuses.reduce((s: number, ub: any) => s + parseFloat((ub.wageringRequired || 0).toString()), 0);
        const ubWageringDone = activeBonuses.reduce((s: number, ub: any) => s + parseFloat((ub.wageringDone || 0).toString()), 0);

        let orphanBonusAmount = 0;
        if (from === 'CASINO' && walletAmount <= 0 && ubAmount <= 0) {
            const approvedBonusTxns = await (prisma as any).transaction.findMany({
                where: { userId, type: 'BONUS', status: 'APPROVED' },
                select: { amount: true },
            });
            const totalApprovedBonusTxns = approvedBonusTxns.reduce(
                (sum: number, tx: any) => sum + parseFloat((tx.amount || 0).toString()),
                0,
            );
            orphanBonusAmount = Math.max(0, roundTo2(totalApprovedBonusTxns - walletAmount));
        }

        const amount = Math.max(walletAmount, ubAmount, orphanBonusAmount);

        if (amount <= 0) return { success: false, error: `No ${from.toLowerCase()} bonus balance to convert` };


        const fromWageringReq = from === 'CASINO' ? 'casinoBonusWageringRequired' : 'sportsBonusWageringRequired';
        const fromWageringDone = from === 'CASINO' ? 'casinoBonusWageringDone' : 'sportsBonusWageringDone';
        const toWageringReq = to === 'CASINO' ? 'casinoBonusWageringRequired' : 'sportsBonusWageringRequired';
        const toWageringDone = to === 'CASINO' ? 'casinoBonusWageringDone' : 'sportsBonusWageringDone';
        const sourceWageringReq = parseFloat((user[fromWageringReq] || 0).toString());
        const sourceWageringDone = parseFloat((user[fromWageringDone] || 0).toString());
        const wageringReq = Math.max(sourceWageringReq, ubWageringReq);
        const wageringDone = Math.min(wageringReq, Math.max(sourceWageringDone, ubWageringDone));

        await (prisma as any).$transaction(async (tx: any) => {
            // 1. Move wallet balance + wagering counters
            const userUpdate: Record<string, any> = {
                [toWallet]: { increment: amount },
                [toWageringReq]: { increment: wageringReq },
                [toWageringDone]: { increment: wageringDone },
            };

            if (from === 'CASINO' && (user.fiatBonus || 0) > 0) {
                userUpdate.fiatBonus = 0;
            }

            const sourceSplitWalletAmount = parseFloat((user[fromWallet] || 0).toString());
            if (sourceSplitWalletAmount > 0) {
                userUpdate[fromWallet] = { decrement: Math.min(sourceSplitWalletAmount, amount) };
            }
            if (sourceWageringReq > 0) {
                userUpdate[fromWageringReq] = { decrement: Math.min(sourceWageringReq, wageringReq) };
            }
            if (sourceWageringDone > 0) {
                userUpdate[fromWageringDone] = { decrement: Math.min(sourceWageringDone, wageringDone) };
            }

            await tx.user.update({
                where: { id: userId },
                data: userUpdate,
            });

            // 2. Flip each UserBonus record
            if (activeBonuses.length > 0) {
                for (const ub of activeBonuses) {
                    await tx.userBonus.update({
                        where: { id: ub.id },
                        data: { applicableTo: to },
                    });
                }
            } else if (orphanBonusAmount > 0) {
                await tx.userBonus.create({
                    data: {
                        userId,
                        bonusId: 'admin_bulk_recovered',
                        bonusCode: 'ADMIN_BULK_RECOVERED',
                        bonusTitle: `Recovered Admin Bonus (${to})`,
                        bonusCurrency: 'INR',
                        applicableTo: to,
                        depositAmount: 0,
                        bonusAmount: amount,
                        wageringRequired: wageringReq,
                        wageringDone: wageringDone,
                        status: 'ACTIVE',
                        isEnabled: true,
                        expiresAt: null,
                    },
                });
            }

            // 3. Transaction log
            await tx.transaction.create({
                data: {
                    userId,
                    amount,
                    type: 'BONUS_TYPE_SWITCH',
                    status: 'APPROVED',
                    remarks: `Admin switched bonus type: ${from} → ${to} (₹${amount.toFixed(2)}) by admin #${adminId}`,
                    adminId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            // 4. Audit log
            await tx.auditLog.create({
                data: {
                    adminId,
                    action: 'BONUS_TYPE_CONVERT',
                    details: { userId, from, to, amount, wageringReq, wageringDone },
                },
            });
        });

        revalidatePath(`/dashboard/users/${userId}`);
        return { success: true, amount, from, to };
    } catch (error: any) {
        console.error('convertBonusType error:', error);
        return { success: false, error: error?.message || 'Failed to convert bonus type' };
    }
}

function roundTo2(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
