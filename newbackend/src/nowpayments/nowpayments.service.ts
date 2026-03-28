import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { ReferralService } from '../referral/referral.service';
import { BonusService } from '../bonus/bonus.service';

@Injectable()
export class NowpaymentsService {
    private readonly logger = new Logger(NowpaymentsService.name);
    private readonly baseUrl = 'https://api.nowpayments.io/v1';

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        private referralService: ReferralService,
        private bonusService: BonusService,
    ) { }

    private get apiKey(): string {
        return this.configService.get<string>('NOWPAYMENTS_API_KEY') || '';
    }

    private get ipnSecret(): string {
        return this.configService.get<string>('NOWPAYMENTS_IPN_SECRET') || '';
    }

    private get callbackUrl(): string {
        const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
        return `${backendUrl}/nowpayments/ipn`;
    }

    private async apiRequest<T>(method: string, path: string, body?: any): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`NOWPayments API error [${method} ${path}]: ${response.status} - ${errorText}`);
            throw new BadRequestException(`NOWPayments API error: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Creates a NOWPayments cryptocurrency payment and stores the pending transaction in DB.
     */
    async createPayment(
        userId: number,
        priceAmount: number,
        priceCurrency: string = 'usd',
        payCurrency: string,
        bonusCode?: string,
    ): Promise<{
        paymentId: string;
        payAddress: string;
        payAmount: number;
        payCurrency: string;
        expiresAt: string | null;
        transactionDbId: number;
    }> {
        if (!this.apiKey) {
            throw new BadRequestException('NOWPayments API key is not configured');
        }

        const orderId = `CRYPTO_${userId}_${Date.now()}`;

        const nowPaymentsResponse = await this.apiRequest<any>('POST', '/payment', {
            price_amount: priceAmount,
            price_currency: priceCurrency.toLowerCase(),
            pay_currency: payCurrency.toLowerCase(),
            order_id: orderId,
            ipn_callback_url: this.callbackUrl,
            is_fixed_rate: false,
            is_fee_paid_by_user: false,
        });

        this.logger.log(`NOWPayments payment created: ${JSON.stringify(nowPaymentsResponse)}`);

        const paymentId = nowPaymentsResponse.payment_id?.toString();
        const payAddress = nowPaymentsResponse.pay_address;
        const payAmount = nowPaymentsResponse.pay_amount;
        const expiresAt = nowPaymentsResponse.expiration_estimate_date || null;

        if (!paymentId || !payAddress) {
            throw new BadRequestException('Invalid response from NOWPayments');
        }

        const effectiveBonusCode = (bonusCode || '').trim().toUpperCase() || undefined;

        // Store in DB as PENDING transaction
        const transaction = await this.prisma.transaction.create({
            data: {
                userId,
                amount: priceAmount,
                type: 'DEPOSIT',
                status: 'PENDING',
                paymentMethod: `CRYPTO_${payCurrency.toUpperCase()}`,
                transactionId: paymentId,
                utr: orderId,
                paymentDetails: {
                    payAddress,
                    payAmount,
                    payCurrency: payCurrency.toUpperCase(),
                    depositCurrency: 'CRYPTO',
                    priceCurrency: priceCurrency.toUpperCase(),
                    priceAmount,
                    expiresAt,
                    nowpaymentsOrderId: orderId,
                    ...(effectiveBonusCode ? { bonusCode: effectiveBonusCode } : {}),
                } as any,
            },
        });

        return {
            paymentId,
            payAddress,
            payAmount,
            payCurrency: payCurrency.toUpperCase(),
            expiresAt,
            transactionDbId: transaction.id,
        };
    }

    /**
     * Fetches the current status of a payment from NOWPayments API.
     */
    async getPaymentStatus(paymentId: string): Promise<{
        paymentId: string;
        status: string;
        payAddress: string;
        payAmount: number;
        actuallyPaid: number;
        payCurrency: string;
        outcomeAmount: number | null;
    }> {
        const data = await this.apiRequest<any>('GET', `/payment/${paymentId}`);
        return {
            paymentId: data.payment_id?.toString(),
            status: data.payment_status,
            payAddress: data.pay_address,
            payAmount: data.pay_amount,
            actuallyPaid: data.actually_paid || 0,
            payCurrency: data.pay_currency?.toUpperCase(),
            outcomeAmount: data.outcome_amount || null,
        };
    }

    /**
     * Verifies the HMAC-SHA512 signature from NOWPayments IPN webhook.
     */
    verifyIpnSignature(rawBody: string | object, receivedSignature: string): boolean {
        if (!this.ipnSecret) {
            this.logger.warn('NOWPAYMENTS_IPN_SECRET is not set — skipping IPN verification');
            return false;
        }

        // Sort keys alphabetically and stringify
        const bodyObj = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        const sortedKeys = Object.keys(bodyObj).sort();
        const sortedObj: Record<string, any> = {};
        for (const key of sortedKeys) {
            sortedObj[key] = bodyObj[key];
        }
        const sortedString = JSON.stringify(sortedObj);

        const hmac = crypto
            .createHmac('sha512', this.ipnSecret)
            .update(sortedString)
            .digest('hex');

        return hmac === receivedSignature;
    }

    /**
     * Handles a verified IPN callback — auto-approves deposit on 'finished' status.
     */
    async handleIpnCallback(ipnBody: any): Promise<void> {
        const paymentId = ipnBody.payment_id?.toString();
        const status = ipnBody.payment_status;

        this.logger.log(`IPN received for payment ${paymentId}: status = ${status}`);

        if (!paymentId) return;

        // Find the matching transaction in our DB
        const transaction = await this.prisma.transaction.findFirst({
            where: { transactionId: paymentId },
            include: { user: true },
        });

        if (!transaction) {
            this.logger.warn(`IPN: No transaction found for payment_id ${paymentId}`);
            return;
        }

        if (status === 'finished' || status === 'confirmed') {
            if (transaction.status === 'APPROVED') {
                this.logger.log(`IPN: Transaction ${transaction.id} already approved, skipping.`);
                return;
            }

            // Auto-approve: credit cryptoBalance (USD wallet) — NOT the fiat balance
            await this.prisma.$transaction(async (prisma) => {
                await prisma.user.update({
                    where: { id: transaction.userId },
                    data: { cryptoBalance: { increment: transaction.amount } } as any,
                });

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'APPROVED',
                        remarks: `Auto-approved via NOWPayments IPN. Credited to CRYPTO USD wallet. Status: ${status}. Actually paid: ${ipnBody.actually_paid} ${ipnBody.pay_currency?.toUpperCase()}`,
                    },
                });
            });

            // Handle referral rewards
            try {
                const previousDeposits = await this.prisma.transaction.count({
                    where: {
                        userId: transaction.userId,
                        type: 'DEPOSIT',
                        status: 'APPROVED',
                        id: { not: transaction.id },
                    },
                });
                if (previousDeposits === 0) {
                    await this.referralService.checkAndAward(transaction.userId, 'DEPOSIT_FIRST', transaction.amount);
                }
                await this.referralService.checkAndAward(transaction.userId, 'DEPOSIT_RECURRING', transaction.amount);

                const bonusCode = (transaction.paymentDetails as any)?.bonusCode;
                if (bonusCode) {
                    await this.bonusService.redeemBonus(transaction.userId, bonusCode, transaction.amount, {
                        depositCurrency: 'CRYPTO',
                        approvedDepositCountBeforeThisDeposit: previousDeposits,
                    });
                }
            } catch (e) {
                this.logger.error(`Post-deposit processing failed for user ${transaction.userId}: ${e.message}`);
            }

            this.logger.log(`✅ Auto-approved crypto deposit ${transaction.id} for user ${transaction.userId} — amount: ${transaction.amount}`);
        } else if (status === 'partially_paid') {
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    remarks: `Partially paid via NOWPayments. Actually paid: ${ipnBody.actually_paid} ${ipnBody.pay_currency?.toUpperCase()}. Requires manual review.`,
                },
            });
            this.logger.warn(`⚠️  Partial payment for transaction ${transaction.id} — requires manual admin review`);
        } else if (status === 'expired' || status === 'failed') {
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'REJECTED',
                    remarks: `Payment ${status} via NOWPayments IPN.`,
                },
            });
            this.logger.log(`❌ Payment ${status} for transaction ${transaction.id}`);
        }
    }

    /**
     * Returns list of available currencies from NOWPayments.
     */
    async getAvailableCurrencies(): Promise<string[]> {
        try {
            const data = await this.apiRequest<{ currencies: string[] }>('GET', '/currencies');
            return data.currencies || [];
        } catch (e) {
            this.logger.error(`Failed to fetch currencies: ${e.message}`);
            return ['btc', 'eth', 'usdt', 'ltc', 'bnb', 'xrp', 'trx'];
        }
    }

    /**
     * Get approximate crypto amount for a given fiat price.
     */
    async getEstimatedAmount(fromCurrency: string, toCurrency: string, amount: number): Promise<number> {
        try {
            const data = await this.apiRequest<{ estimated_amount: number }>(
                'GET',
                `/estimate?amount=${amount}&currency_from=${fromCurrency}&currency_to=${toCurrency}`,
            );
            return data.estimated_amount;
        } catch (e) {
            this.logger.error(`Failed to get estimate: ${e.message}`);
            return 0;
        }
    }

    /**
     * Fetches the minimum payment amount for a given currency pair from NOWPayments.
     * Returns 0 on error (so we don't block the user unnecessarily).
     */
    async getMinimumAmount(currencyFrom: string, currencyTo: string): Promise<number> {
        try {
            const data = await this.apiRequest<{ min_amount: number; currency_from: string; currency_to: string }>(
                'GET',
                `/min-amount?currency_from=${currencyFrom.toLowerCase()}&currency_to=${currencyTo.toLowerCase()}`,
            );
            return data.min_amount || 0;
        } catch (e) {
            this.logger.error(`Failed to get min-amount for ${currencyFrom}→${currencyTo}: ${e.message}`);
            return 0; // Don't block on error — let NOWPayments reject if truly too low
        }
    }
}
