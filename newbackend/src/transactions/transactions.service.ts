import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { ReferralService } from '../referral/referral.service';
import { BonusService } from '../bonus/bonus.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private referralService: ReferralService,
        private bonusService: BonusService,
        private emailService: EmailService,
    ) { }

    async createDeposit(userId: number, amount: number, paymentMethod: string, utr: string, currency: string, type: string, proof?: string, bonusCode?: string) {
        // Check if UTR already exists
        const existingTransaction = await this.prisma.transaction.findUnique({
            where: { utr },
        });

        if (existingTransaction) {
            throw new BadRequestException('Transaction with this UTR already exists');
        }

        return this.prisma.transaction.create({
            data: {
                userId,
                amount,
                type: 'DEPOSIT',
                status: 'PENDING',
                paymentMethod,
                utr,
                proof,
                // Store bonus code in paymentDetails so approveTransaction can redeem it
                paymentDetails: bonusCode ? { bonusCode: bonusCode.toUpperCase(), currency } : { currency } as any,
            },
        });
    }

    async createWithdrawal(userId: number, amount: number, paymentDetails: any) {
        // Check user balance
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.balance < amount) {
            throw new BadRequestException('Insufficient balance');
        }

        // ── iGaming Bonus Policy ──────────────────────────────────────────────
        // If user has an active bonus, forfeit it before allowing withdrawal.
        // This matches the standard policy: wagering must be completed to keep bonus.
        const activeBonus = await (this.prisma as any).userBonus.findFirst({
            where: { userId, status: 'ACTIVE' }
        });
        if (activeBonus) {
            await this.bonusService.forfeitActiveBonus(userId, 'Withdrawal requested before wagering complete');
        }

        return this.prisma.$transaction(async (prisma) => {
            // Deduct balance
            await prisma.user.update({
                where: { id: userId },
                data: { balance: { decrement: amount } },
            });

            // Derive a clean paymentMethod label for display
            const methodLabel = paymentDetails?.method
                ? (paymentDetails.method as string).toUpperCase() === 'UPI' ? 'UPI'
                    : (paymentDetails.method as string).toUpperCase() === 'BANK' ? 'BANK'
                        : (paymentDetails.method as string).toUpperCase() === 'CRYPTO' ? 'CRYPTO'
                            : 'WITHDRAWAL'
                : 'WITHDRAWAL';

            // Create transaction record
            return prisma.transaction.create({
                data: {
                    userId,
                    amount,
                    type: 'WITHDRAWAL',
                    status: 'PENDING',
                    paymentMethod: methodLabel,
                    paymentDetails,
                },
            });
        });
    }

    async getUserTransactions(userId: number) {
        return this.prisma.transaction.findMany({
            where: {
                userId,
                NOT: {
                    type: { in: ['BET', 'BET_PLACE'] },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllTransactions(page: number = 1, limit: number = 20, type?: string, status?: string, search?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (type && type !== 'ALL') where.type = type;
        if (status && status !== 'ALL') where.status = status;
        if (search) {
            where.OR = [
                { utr: { contains: search, mode: 'insensitive' } },
                { user: { username: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                include: { user: { select: { username: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.transaction.count({ where })
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
    }

    async approveTransaction(id: number, adminId: number, remarks?: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!transaction) throw new BadRequestException('Transaction not found');
        if (transaction.status !== 'PENDING') throw new BadRequestException('Transaction is not pending');

        return this.prisma.$transaction(async (prisma) => {
            if (transaction.type === 'DEPOSIT') {
                // Add balance to user
                await prisma.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { increment: transaction.amount } },
                });

                // Check for First Deposit
                const previousDeposits = await prisma.transaction.count({
                    where: {
                        userId: transaction.userId,
                        type: 'DEPOSIT',
                        status: 'APPROVED',
                    },
                });

                // This logic runs inside a transaction, but the referral service methods might not participate in the same transaction unless refactored.
                // For now, we will run them *after* the transaction or *inside* but acknowledging they might run independent queries.
                // It's safer to run them after, or accept they are independent.
                // Since `checkAndAward` effectively just updates balances and adds history, it's fine to call it.
                // However, `checkAndAward` is async. We should await it.
                // Ideally, we'd pass the transaction client `prisma` to `checkAndAward` to keep it atomic, but `ReferralService` uses `this.prisma`.
                // We'll call it, but note that if `checkAndAward` fails, the transaction might still commit if we don't catch/bubble up properly or if we call it outside.
                // Let's call it here.

                try {
                    if (previousDeposits === 0) {
                        await this.referralService.checkAndAward(transaction.userId, 'DEPOSIT_FIRST', transaction.amount);
                    }
                    await this.referralService.checkAndAward(transaction.userId, 'DEPOSIT_RECURRING', transaction.amount);
                } catch (e) {
                    console.error('Referral award failed', e);
                }

                // ── Bonus Redemption + Deposit Wagering Lock ─────────────────
                // If deposit stored a bonusCode in paymentDetails, redeem it now.
                // redeemBonus() also sets depositWageringRequired for the bonus deposit multiplier.
                // For deposits WITHOUT a bonus code, apply the default 1x deposit wagering lock.
                const bonusCode = (transaction.paymentDetails as any)?.bonusCode;
                const depositCurrency = (transaction.paymentDetails as any)?.depositCurrency === 'CRYPTO'
                    ? 'CRYPTO'
                    : 'INR';
                let depositWageringApplied = false;
                if (bonusCode) {
                    try {
                        const result = await this.bonusService.redeemBonus(transaction.userId, bonusCode, transaction.amount, {
                            depositCurrency,
                            approvedDepositCountBeforeThisDeposit: previousDeposits,
                        });
                        if (result) depositWageringApplied = true;
                    } catch (e) {
                        console.error('Bonus redemption failed (non-fatal):', e);
                    }
                }

                // Always ensure deposit wagering is set (default 1x if no bonus applied it)
                if (!depositWageringApplied) {
                    try {
                        await this.bonusService.applyDepositWagering(transaction.userId, transaction.amount, 1);
                    } catch (e) {
                        console.error('Deposit wagering lock failed (non-fatal):', e);
                    }
                }

                // Track total deposited for analytics
                try {
                    await (this.prisma as any).user.update({
                        where: { id: transaction.userId },
                        data: { totalDeposited: { increment: transaction.amount } },
                    });
                } catch (e) {
                    console.error('totalDeposited increment failed (non-fatal):', e);
                }
            }
            // For withdrawal, balance was already deducted on creation.

            const approved = await prisma.transaction.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    adminId,
                    remarks,
                },
            });

            // Send email notification (non-blocking)
            if (transaction.user?.email) {
                const amountStr = transaction.amount.toFixed(2);
                const currency = (transaction.paymentDetails as any)?.currency || 'INR';
                if (transaction.type === 'DEPOSIT') {
                    this.emailService.sendDepositSuccess(
                        transaction.user.email,
                        transaction.user.username || transaction.user.email,
                        amountStr,
                        currency,
                    ).catch(() => { });
                } else if (transaction.type === 'WITHDRAWAL') {
                    this.emailService.sendWithdrawalSuccess(
                        transaction.user.email,
                        transaction.user.username || transaction.user.email,
                        amountStr,
                        currency,
                    ).catch(() => { });
                }
            }

            return approved;
        });
    }

    async rejectTransaction(id: number, adminId: number, remarks?: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
        });

        if (!transaction) throw new BadRequestException('Transaction not found');
        if (transaction.status !== 'PENDING') throw new BadRequestException('Transaction is not pending');

        return this.prisma.$transaction(async (prisma) => {
            if (transaction.type === 'WITHDRAWAL') {
                // Refund balance to user
                await prisma.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { increment: transaction.amount } },
                });
            }

            return prisma.transaction.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    adminId,
                    remarks,
                },
            });
        });
    }
}
