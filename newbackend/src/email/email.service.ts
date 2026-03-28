import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as nodemailer from 'nodemailer';
import { forgotPasswordTemplate } from './templates/forgot-password.template';
import { registerSuccessTemplate } from './templates/register-success.template';
import { depositSuccessTemplate } from './templates/deposit-success.template';
import { withdrawalSuccessTemplate } from './templates/withdrawal-success.template';

const SMTP_KEY = 'SMTP_SETTINGS';

interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly prisma: PrismaService) { }

    /** Load SMTP config from SystemConfig table */
    private async getSmtpConfig(): Promise<SmtpConfig | null> {
        try {
            const record = await this.prisma.systemConfig.findUnique({ where: { key: SMTP_KEY } });
            if (!record?.value) return null;
            return JSON.parse(record.value) as SmtpConfig;
        } catch {
            return null;
        }
    }

    /** Also load platform name */
    private async getPlatformName(): Promise<string> {
        try {
            const record = await this.prisma.systemConfig.findUnique({ where: { key: 'PLATFORM_NAME' } });
            return record?.value || 'Platform';
        } catch {
            return 'Platform';
        }
    }

    /** Send an email using the configured SMTP transporter */
    async sendMail(to: string, subject: string, html: string): Promise<boolean> {
        const smtp = await this.getSmtpConfig();
        if (!smtp || !smtp.host || !smtp.user || !smtp.password) {
            this.logger.warn('SMTP not configured — email not sent');
            return false;
        }

        try {
            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: Number(smtp.port) || 587,
                secure: smtp.secure ?? false,
                auth: {
                    user: smtp.user,
                    pass: smtp.password,
                },
            });

            await transporter.sendMail({
                from: `"${smtp.fromName || 'Platform'}" <${smtp.fromEmail || smtp.user}>`,
                to,
                subject,
                html,
            });

            this.logger.log(`Email sent to ${to} — Subject: ${subject}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error.message);
            return false;
        }
    }

    /** Forgot-password email */
    async sendForgotPassword(to: string, resetLink: string, username?: string): Promise<boolean> {
        const platformName = await this.getPlatformName();
        const html = forgotPasswordTemplate(platformName, resetLink, username);
        return this.sendMail(to, `Reset your ${platformName} password`, html);
    }

    /** Registration welcome email */
    async sendRegisterSuccess(to: string, username: string): Promise<boolean> {
        const platformName = await this.getPlatformName();
        const html = registerSuccessTemplate(platformName, username);
        return this.sendMail(to, `Welcome to ${platformName}! 🎉`, html);
    }

    /** Deposit approved email */
    async sendDepositSuccess(to: string, username: string, amount: string, currency = 'INR'): Promise<boolean> {
        const platformName = await this.getPlatformName();
        const html = depositSuccessTemplate(platformName, username, amount, currency);
        return this.sendMail(to, `Deposit of ${currency} ${amount} confirmed ✅`, html);
    }

    /** Withdrawal approved email */
    async sendWithdrawalSuccess(to: string, username: string, amount: string, currency = 'INR'): Promise<boolean> {
        const platformName = await this.getPlatformName();
        const html = withdrawalSuccessTemplate(platformName, username, amount, currency);
        return this.sendMail(to, `Withdrawal of ${currency} ${amount} processed 💸`, html);
    }
}
