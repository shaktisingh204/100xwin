import { Controller, Post, Body, Res, HttpStatus, Logger, Req, UseGuards, RawBodyRequest, Headers } from '@nestjs/common';
import { Payment0Service } from './payment0.service';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BonusService } from '../bonus/bonus.service';
import { UsersService } from '../users/users.service';

@Controller('payment0')
export class Payment0Controller {
    private readonly logger = new Logger(Payment0Controller.name);

    constructor(
        private readonly payment0Service: Payment0Service,
        private readonly prisma: PrismaService,
        private configService: ConfigService,
        private readonly bonusService: BonusService,
        private readonly usersService: UsersService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createPayment(@Body() body: any, @Req() req: Request, @Res() res: Response) {
        try {
            const {
                orderNo,
                amount,
                bonusCode,
                promoCode,
                returnUrl,
            } = body;

            this.logger.log(`[UPI0] Creating deposit — orderNo: ${orderNo}, amount: ${amount}`);

            const phpGatewayBaseUrl = this.configService.get<string>('PAYMENT0_BASE_URL');
            if (!phpGatewayBaseUrl) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: 'PAYMENT0_BASE_URL (anyleson.com/pay) is not configured in .env',
                });
            }

            const userId: number = (req as any).user?.id || body.userId;
            const effectiveBonusCode = ((bonusCode || promoCode || '').trim().toUpperCase()) || undefined;

            if (userId && orderNo) {
                try {
                    const existing = await this.prisma.transaction.findUnique({ where: { utr: orderNo } });
                    if (!existing) {
                        await this.prisma.transaction.create({
                            data: {
                                userId,
                                amount: parseFloat(amount),
                                type: 'DEPOSIT',
                                status: 'PENDING',
                                paymentMethod: 'UPI Gateway 0 (Razorpay)',
                                utr: orderNo,
                                paymentDetails: {
                                    gateway: 'upi0',
                                    depositCurrency: 'INR',
                                    orderNo,
                                    ...(effectiveBonusCode ? { bonusCode: effectiveBonusCode } : {}),
                                } as any,
                            },
                        });
                        this.logger.log(`✅ [UPI0] DB: PENDING deposit CREATED — utr: ${orderNo}, userId: ${userId}`);
                    }
                } catch (e) {
                    this.logger.error(`❌ [UPI0] DB: failed to create PENDING deposit — ${e.message}`);
                }
            }

            const payload = {
                orderNo,
                amount,
                userId,
                returnUrl
            };
            const token = Buffer.from(JSON.stringify(payload)).toString('base64');
            const redirectUrl = `${phpGatewayBaseUrl}/index.php?token=${encodeURIComponent(token)}`;

            return res.status(HttpStatus.OK).json({
                success: true,
                payUrl: redirectUrl,
            });
        } catch (error) {
            this.logger.error(`[UPI0] Create deposit error: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to initiate UPI 0 deposit',
            });
        }
    }

    @Public()
    @Post('notify')
    async paymentCallback(@Req() req: Request, @Body() body: any, @Res() res: Response) {
        this.logger.log(`[UPI0] Deposit callback: ${JSON.stringify(body)}`);

        try {
            const { orderNo, amount, status, gatewayTxn } = body;

            if (!gatewayTxn) {
                this.logger.warn(`[UPI0] Deposit callback missing gatewayTxn! Cannot verify with Razorpay.`);
                return res.status(HttpStatus.BAD_REQUEST).send('fail');
            }

            const expectedAmount = parseFloat(amount || '0');
            const isValid = await this.payment0Service.verifyPaymentWithRazorpay(gatewayTxn, expectedAmount);

            if (!isValid) {
                this.logger.warn(`[UPI0] Deposit callback — Razorpay API verification failed!`);
                return res.status(HttpStatus.BAD_REQUEST).send('fail');
            }

            this.logger.log(
                `[UPI0] Deposit callback verified — orderNo: ${orderNo}, status: ${status}, amount: ${amount}`
            );

            if (status === 'success') {
                await this.creditDeposit(orderNo, parseFloat(amount || '0'));
            }

            return res.status(HttpStatus.OK).send('ok');
        } catch (error) {
            this.logger.error(`[UPI0] Deposit callback error: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('fail');
        }
    }

    /**
     * Direct Razorpay Webhook — handles payment.captured and payment.failed
     * events sent by Razorpay servers. This catches delayed payments and
     * marks failed ones as REJECTED.
     */
    @Public()
    @Post('razorpay-webhook')
    async razorpayWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-razorpay-signature') signature: string,
        @Body() body: any,
        @Res() res: Response,
    ) {
        this.logger.log(`[UPI0-Webhook] Received event: ${body?.event || 'unknown'}`);

        try {
            // 1. Verify signature using raw body
            const rawBody = req.rawBody;
            if (!rawBody) {
                this.logger.error('[UPI0-Webhook] Raw body not available — cannot verify signature');
                return res.status(HttpStatus.BAD_REQUEST).json({ status: 'error', message: 'Raw body unavailable' });
            }

            const isValid = this.payment0Service.verifyWebhookSignature(rawBody, signature);
            if (!isValid) {
                this.logger.warn('[UPI0-Webhook] Invalid webhook signature — rejecting');
                return res.status(HttpStatus.BAD_REQUEST).json({ status: 'error', message: 'Invalid signature' });
            }

            const event = body?.event;
            const paymentEntity = body?.payload?.payment?.entity;

            if (!paymentEntity) {
                this.logger.warn('[UPI0-Webhook] No payment entity in payload');
                return res.status(HttpStatus.OK).json({ status: 'ok' });
            }

            const razorpayPaymentId = paymentEntity.id;
            const razorpayOrderId = paymentEntity.order_id;
            const amountInPaise = paymentEntity.amount;
            const amountInINR = amountInPaise / 100;
            const paymentStatus = paymentEntity.status;
            // Our orderNo is stored in Razorpay notes during order creation
            const adxOrderNo: string | undefined = paymentEntity.notes?.orderNo;

            this.logger.log(`[UPI0-Webhook] Event: ${event}, PaymentID: ${razorpayPaymentId}, OrderID: ${razorpayOrderId}, Amount: ₹${amountInINR}, Status: ${paymentStatus}, OrderNo: ${adxOrderNo || 'N/A'}`);

            if (!adxOrderNo) {
                this.logger.warn(`[UPI0-Webhook] No orderNo in notes — cannot match transaction. Ignoring.`);
                return res.status(HttpStatus.OK).json({ status: 'ok' });
            }

            if (event === 'payment.captured') {
                const txn = await this.prisma.transaction.findUnique({ where: { utr: adxOrderNo } });

                if (txn && txn.status === 'PENDING') {
                    await this.creditDeposit(txn.utr, amountInINR);
                    this.logger.log(`[UPI0-Webhook] payment.captured processed for txn ${txn.utr}`);
                } else if (txn) {
                    this.logger.log(`[UPI0-Webhook] Txn ${adxOrderNo} already ${txn.status} — skip`);
                } else {
                    this.logger.warn(`[UPI0-Webhook] No transaction found for orderNo ${adxOrderNo}`);
                }
            } else if (event === 'payment.failed') {
                const txn = await this.prisma.transaction.findUnique({ where: { utr: adxOrderNo } });

                if (txn && txn.status === 'PENDING') {
                    await this.markDepositFailed(txn.utr);
                    this.logger.log(`[UPI0-Webhook] payment.failed — marked txn ${txn.utr} as REJECTED`);
                } else if (txn) {
                    this.logger.log(`[UPI0-Webhook] Txn ${adxOrderNo} already ${txn.status} — skip`);
                } else {
                    this.logger.warn(`[UPI0-Webhook] No transaction found for orderNo ${adxOrderNo}`);
                }
            } else {
                this.logger.log(`[UPI0-Webhook] Ignoring event: ${event}`);
            }

            return res.status(HttpStatus.OK).json({ status: 'ok' });
        } catch (error) {
            this.logger.error(`[UPI0-Webhook] Error processing webhook: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ status: 'error' });
        }
    }

    private async creditDeposit(orderNo: string, gatewayAmount: number) {
        try {
            const txn = await this.prisma.transaction.findUnique({ where: { utr: orderNo } });
            if (!txn) { this.logger.warn(`[UPI0] No transaction for orderNo: ${orderNo}`); return; }
            if (txn.status !== 'PENDING') { this.logger.warn(`[UPI0] Already ${txn.status} — skip`); return; }

            const credit = gatewayAmount > 0 ? gatewayAmount : txn.amount;
            const previousDeposits = await this.prisma.transaction.count({
                where: { userId: txn.userId, type: 'DEPOSIT', status: 'APPROVED' },
            });
            await this.prisma.$transaction([
                this.prisma.user.update({ where: { id: txn.userId }, data: { balance: { increment: credit } } }),
                this.prisma.transaction.update({ where: { id: txn.id }, data: { status: 'APPROVED', amount: credit } }),
            ]);
            this.logger.log(`[UPI0] Deposit APPROVED — userId: ${txn.userId}, amount: ${credit}`);

            try {
                await this.usersService.setWageringOnFirstDeposit(txn.userId, credit);
            } catch (e) {
                this.logger.error(`[UPI0] Wagering update failed (non-fatal): ${e.message}`);
            }

            const bonusCode = (txn.paymentDetails as any)?.bonusCode;
            if (bonusCode) {
                try {
                    await this.bonusService.redeemBonus(txn.userId, bonusCode, credit, {
                        depositCurrency: 'INR',
                        approvedDepositCountBeforeThisDeposit: previousDeposits,
                    });
                    this.logger.log(`[UPI0] Bonus redeemed — userId: ${txn.userId}, code: ${bonusCode}`);
                } catch (e) {
                    this.logger.error(`[UPI0] Bonus redemption failed (non-fatal): ${e.message}`);
                }
            }
        } catch (e) {
            this.logger.error(`[UPI0] creditDeposit error: ${e.message}`);
        }
    }

    private async markDepositFailed(orderNo: string) {
        try {
            const txn = await this.prisma.transaction.findUnique({ where: { utr: orderNo } });
            if (!txn) { this.logger.warn(`[UPI0-Webhook] No transaction for orderNo: ${orderNo}`); return; }
            if (txn.status !== 'PENDING') { this.logger.warn(`[UPI0-Webhook] Already ${txn.status} — skip`); return; }

            await this.prisma.transaction.update({
                where: { id: txn.id },
                data: { status: 'REJECTED' },
            });
            this.logger.log(`[UPI0-Webhook] Deposit REJECTED — userId: ${txn.userId}, orderNo: ${orderNo}`);
        } catch (e) {
            this.logger.error(`[UPI0-Webhook] markDepositFailed error: ${e.message}`);
        }
    }
}
