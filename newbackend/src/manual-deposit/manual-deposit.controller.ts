import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma.service';
import { Request, Response } from 'express';
import { getGatewayRetryState } from '../payment/payment-retry.util';

@Controller('manual-deposit')
export class ManualDepositController {
  private readonly logger = new Logger(ManualDepositController.name);

  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get('retry-state')
  async getRetryState(@Req() req: Request, @Res() res: Response) {
    try {
      const userId: number = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, message: 'Not authenticated' });
      }

      const retryState = await getGatewayRetryState(this.prisma, userId);
      return res.status(HttpStatus.OK).json(retryState);
    } catch (error) {
      this.logger.error(`[ManualDeposit] retry-state error: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to load retry state',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC CONFIG — returns UPI ID + QR URL + support contacts
  //  Sourced from SystemConfig keys:
  //    MANUAL_UPI_ID   — the UPI VPA users pay to (e.g. example@upi)
  //    MANUAL_QR_URL   — optional hosted QR image URL
  // ─────────────────────────────────────────────────────────────────────────
  @Public()
  @Get('config')
  async getConfig(@Res() res: Response) {
    try {
      const rows = await this.prisma.systemConfig.findMany({
        where: {
          key: {
            in: ['MANUAL_UPI_ID', 'MANUAL_QR_URL', 'CONTACT_SETTINGS'],
          },
        },
      });

      const map: Record<string, string> = {};
      rows.forEach((r) => {
        map[r.key] = r.value;
      });

      const upiId = map['MANUAL_UPI_ID'] || '';
      const qrImageUrl = map['MANUAL_QR_URL'] || '';

      let whatsappNumber = '';
      let telegramHandle = '';
      let telegramLink = '';
      try {
        const contact = map['CONTACT_SETTINGS']
          ? JSON.parse(map['CONTACT_SETTINGS'])
          : {};
        whatsappNumber = contact.whatsappNumber || '';
        telegramHandle = contact.telegramHandle || '';
        telegramLink = contact.telegramLink || '';
      } catch {
        // ignore parse errors
      }

      return res.status(HttpStatus.OK).json({
        upiId,
        qrImageUrl,
        whatsappNumber,
        telegramHandle,
        telegramLink,
      });
    } catch (error) {
      this.logger.error(`[ManualDeposit] config fetch error: ${error.message}`);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ upiId: '', qrImageUrl: '' });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SUBMIT — user claims they have paid and uploads UTR + screenshot URL
  //  Creates a PENDING transaction that admin must approve
  // ─────────────────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('submit')
  async submitManualDeposit(
    @Body()
    body: {
      amount: number;
      utr: string;
      screenshotUrl?: string;
      bonusCode?: string;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId: number = (req as any).user?.userId || (req as any).user?.id;
      const { amount, utr, screenshotUrl, bonusCode } = body;

      if (!userId) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, message: 'Not authenticated' });
      }
      if (!amount || parseFloat(String(amount)) <= 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: 'Invalid amount' });
      }
      if (!utr || !utr.trim()) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'UTR / Transaction ID is required',
        });
      }

      const numAmount = parseFloat(String(amount));
      const cleanUtr = utr.trim().toUpperCase();
      const effectiveBonusCode =
        (bonusCode || '').trim().toUpperCase() || undefined;

      // Check for duplicate UTR
      const existing = await this.prisma.transaction.findUnique({
        where: { utr: cleanUtr },
      });
      if (existing) {
        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message:
            'This UTR has already been submitted. Please contact support if this is an error.',
        });
      }

      const txn = await this.prisma.transaction.create({
        data: {
          userId,
          amount: numAmount,
          type: 'DEPOSIT',
          status: 'PENDING',
          paymentMethod: 'Manual UPI',
          utr: cleanUtr,
          remarks: 'Manual UPI deposit — awaiting admin approval',
          paymentDetails: {
            gateway: 'manual_upi',
            requiresAdminReview: true,
            utr: cleanUtr,
            screenshotUrl: screenshotUrl || null,
            submittedAt: new Date().toISOString(),
            ...(effectiveBonusCode ? { bonusCode: effectiveBonusCode } : {}),
          } as any,
        },
      });

      this.logger.log(
        `[ManualDeposit] PENDING created — userId: ${userId}, amount: ${numAmount}, utr: ${cleanUtr}, txnId: ${txn.id}`,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message:
          'Your payment has been submitted and is pending approval (usually 5–15 minutes).',
        transactionId: txn.id,
      });
    } catch (error) {
      this.logger.error(`[ManualDeposit] submit error: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to submit payment',
      });
    }
  }
}
