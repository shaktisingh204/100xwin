import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './auth/dto/auth.dto';
import { v4 as uuidv4 } from 'uuid';

import { ReferralService } from './referral/referral.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';

// ─── Random username generator ───────────────────────────────────────────────

const USERNAME_WORDS = [
    'ace', 'apex', 'arch', 'arrow', 'axe', 'bear', 'blade', 'blaze', 'bolt', 'brave',
    'chief', 'claw', 'cobra', 'coin', 'dart', 'dawn', 'dash', 'dusk', 'eagle', 'echo',
    'elite', 'ember', 'falcon', 'flame', 'flash', 'fox', 'frost', 'fury', 'gale',
    'ghost', 'glide', 'gold', 'grave', 'grit', 'hawk', 'haze', 'hero', 'high', 'hunt',
    'iron', 'jade', 'jaguar', 'jet', 'keen', 'king', 'knight', 'lance', 'legend',
    'lion', 'lure', 'lynx', 'mace', 'mark', 'maven', 'might', 'monk', 'moon', 'nova',
    'onyx', 'orion', 'peak', 'phantom', 'pilot', 'pulse', 'quick', 'raven', 'razor',
    'reef', 'rogue', 'rush', 'sage', 'savage', 'scout', 'shadow', 'shark', 'shield',
    'silver', 'sky', 'slate', 'smoke', 'snake', 'sonic', 'spark', 'spike', 'spirit',
    'star', 'steel', 'storm', 'striker', 'swift', 'thor', 'tiger', 'titan', 'torch',
    'tribe', 'turbo', 'ultra', 'valor', 'venom', 'vibe', 'victor', 'viking', 'viper',
    'void', 'volt', 'wave', 'wild', 'wolf', 'wrath', 'yeti', 'zeal', 'zen', 'zephyr',
];

function generateUsername(): string {
    const word = USERNAME_WORDS[Math.floor(Math.random() * USERNAME_WORDS.length)];
    const digits = String(Math.floor(1000 + Math.random() * 9000)); // 1000–9999
    const suffix = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a–z
    return `${word}${digits}${suffix}`;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private referralService: ReferralService,
        private emailService: EmailService,
        private smsService: SmsService,
    ) { }

    async validateUser(identifier: string, pass: string): Promise<any> {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: identifier },
                        { phoneNumber: identifier },
                        { username: identifier }
                    ]
                }
            });

            if (!user) {
                this.logger.warn(`User not found: ${identifier}`);
                return { __reason: 'NOT_FOUND' };
            }

            const isMatch = await bcrypt.compare(pass, user.password);
            if (!isMatch) {
                this.logger.warn(`Password mismatch for user: ${identifier}`);
                return { __reason: 'WRONG_PASSWORD' };
            }

            // Block banned users from logging in
            if ((user as any).isBanned) {
                this.logger.warn(`Banned user attempted login: ${identifier}`);
                return { __reason: 'BANNED' };
            }

            const { password, ...result } = user;
            return result;
        } catch (error) {
            this.logger.error(`Error validating user: ${identifier}`, error.stack);
            throw error;
        }
    }

    async login(user: any) {
        try {
            const payload = { username: user.username, sub: user.id, role: user.role };
            return {
                access_token: this.jwtService.sign(payload),
                user: user,
            };
        } catch (error) {
            this.logger.error(`Error signing JWT for user: ${user.username}`, error.stack);
            throw error;
        }
    }

    async signup(data: SignupDto & { referralCode?: string }) {
        if (!data.email && !data.phoneNumber) {
            throw new ConflictException('Email or Phone Number is required');
        }

        // ── Phone signup: require a verified OTP ─────────────────────────────────
        if (data.phoneNumber) {
            const verifiedOtp = await (this.prisma as any).phoneOtp.findFirst({
                where: {
                    phoneNumber: data.phoneNumber,
                    purpose: 'REGISTER',
                    used: true,                          // OTP must have been verified
                    expiresAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }, // within 10 min of OTP lifecycle
                },
                orderBy: { createdAt: 'desc' },
            });
            if (!verifiedOtp) {
                throw new BadRequestException(
                    'Phone number not verified. Please complete OTP verification before signing up.'
                );
            }
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Generate a new referral code for this user
        const myReferralCode = await this.referralService.generateReferralCode();

        try {
            // Exclude fields that aren't Prisma User columns, and always ignore any client-supplied username
            const { referralCode: _inRef, promoCode: _inPromo, username: _clientUsername, ...prismaData } = data as any;

            // Generate a unique username (retry up to 5 times on collision)
            let username = generateUsername();
            for (let i = 0; i < 4; i++) {
                const exists = await this.prisma.user.findUnique({ where: { username } });
                if (!exists) break;
                username = generateUsername();
            }

            const user = await this.prisma.user.create({
                data: {
                    ...prismaData,
                    username,
                    password: hashedPassword,
                    balance: 0,
                    role: data.role || 'USER',
                    referralCode: myReferralCode,
                },
            });

            // Apply referral code if provided (separate from promoCode)
            if (data.referralCode) {
                try {
                    await this.referralService.applyReferral(user.id, data.referralCode.trim().toUpperCase());
                } catch (e) {
                    console.log('Failed to apply referral code', e);
                    // Don't block signup
                }
            }

            // Note: data.promoCode is for bonus redemption — handled separately by the bonus system

            // Send welcome email (non-blocking)
            if (user.email) {
                this.emailService.sendRegisterSuccess(user.email, user.username || user.email).catch(e =>
                    this.logger.warn('Register welcome email failed', e?.message)
                );
            }

            const { password, ...result } = user;
            return this.login(result);
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('User with this Email or Phone already exists');
            }
            throw error;
        }
    }

    // ─── Forgot Password ────────────────────────────────────────────────────────

    async forgotPassword(email: string, frontendUrl: string = ''): Promise<{ message: string }> {
        // Always return the same message to avoid user enumeration
        const genericMsg = { message: 'If an account with that email exists, a reset link has been sent.' };

        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) return genericMsg;

        // Invalidate any existing tokens for this user
        await this.prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        });

        // Create a new token (expires 1 hour)
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: { userId: user.id, token, expiresAt },
        });

        // Build reset link
        const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        // Send email (non-blocking)
        this.emailService.sendForgotPassword(email, resetLink, user.username || undefined).catch(e =>
            this.logger.warn('Forgot password email failed', e?.message)
        );

        return genericMsg;
    }

    // ─── Reset Password ─────────────────────────────────────────────────────────

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });

        if (!record) throw new BadRequestException('Invalid or expired reset link.');
        if (record.used) throw new BadRequestException('This reset link has already been used.');
        if (new Date() > record.expiresAt) throw new BadRequestException('This reset link has expired. Please request a new one.');

        const hashed = await bcrypt.hash(newPassword, 10);

        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.userId },
                data: { password: hashed },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { used: true },
            }),
        ]);

        this.logger.log(`Password reset successful for userId: ${record.userId}`);

        return { message: 'Password has been reset successfully. You can now log in.' };
    }

    // ─── Phone OTP: Send ────────────────────────────────────────────────────────

    async sendPhoneOtp(phoneNumber: string, purpose: string): Promise<{ message: string }> {
        return this.smsService.sendOtp(phoneNumber, purpose);
    }

    // ─── Phone OTP: Verify ──────────────────────────────────────────────────────

    async verifyPhoneOtp(phoneNumber: string, code: string, purpose: string): Promise<{ verified: boolean }> {
        await this.smsService.verifyOtp(phoneNumber, code, purpose);
        return { verified: true };
    }

    // ─── Phone Forgot Password: Send OTP ────────────────────────────────────────

    async phoneForgotPassword(phoneNumber: string): Promise<{ message: string }> {
        const genericMsg = { message: 'If an account with that phone number exists, an OTP has been sent.' };

        const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) return genericMsg; // don't reveal existence

        await this.smsService.sendOtp(phoneNumber, 'FORGOT_PASSWORD');
        return genericMsg;
    }

    // ─── Phone Reset Password ───────────────────────────────────────────────────
    /**
     * Confirms the OTP was already verified (used=true) and resets the password.
     * We do NOT call verifyOtp again because the caller already went through
     * /auth/verify-otp which marked the record used=true.
     */
    async resetPasswordByPhone(phoneNumber: string, code: string, newPassword: string): Promise<{ message: string }> {
        // Confirm the OTP was actually verified for this phone+code (used = true, within 15-min grace window)
        const verifiedOtp = await (this.prisma as any).phoneOtp.findFirst({
            where: {
                phoneNumber,
                code,
                purpose: 'FORGOT_PASSWORD',
                used: true,
                expiresAt: { gt: new Date(Date.now() - 15 * 60 * 1000) }, // grace: 15 min after TTL
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!verifiedOtp) {
            throw new BadRequestException('OTP verification required. Please verify your OTP first.');
        }

        // Find user
        const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) throw new BadRequestException('No account found with this phone number.');

        // Hash new password
        const hashed = await bcrypt.hash(newPassword, 10);

        // Update password + invalidate any existing email reset tokens
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: user.id },
                data: { password: hashed },
            }),
            this.prisma.passwordResetToken.updateMany({
                where: { userId: user.id, used: false },
                data: { used: true },
            }),
        ]);

        this.logger.log(`Phone-OTP password reset for userId: ${user.id}`);
        return { message: 'Password has been reset successfully. You can now log in.' };
    }
}
