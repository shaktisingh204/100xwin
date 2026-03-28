import { Controller, Post, Body, UseGuards, Get, Request, Logger, UnauthorizedException, Query } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users/users.service';
import { LoginDto, SignupDto, ForgotPasswordDto, ResetPasswordDto, SendOtpDto, VerifyOtpDto, PhoneForgotPasswordDto, PhoneResetPasswordDto } from './auth/dto/auth.dto';
import { EmailService } from './email/email.service';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private emailService: EmailService,
    ) { }

    @Public()
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        try {
            this.logger.log(`Attempting login for user: ${loginDto.identifier}`);
            const result = await this.authService.validateUser(loginDto.identifier, loginDto.password);

            if (result?.__reason === 'NOT_FOUND') {
                throw new UnauthorizedException('No account found with this email/phone. Please register first.');
            }
            if (result?.__reason === 'WRONG_PASSWORD') {
                throw new UnauthorizedException('Incorrect password. Please try again.');
            }
            if (result?.__reason === 'BANNED') {
                throw new UnauthorizedException('Your account has been suspended. Please contact support for assistance.');
            }
            if (!result) {
                throw new UnauthorizedException('Invalid credentials. Please try again.');
            }

            this.logger.log(`Login successful for user: ${loginDto.identifier}`);
            return await this.authService.login(result);
        } catch (error) {
            this.logger.error(`Login error for user: ${loginDto.identifier}`, error.stack);
            throw error;
        }
    }

    @Public()
    @Post('signup')
    async signup(@Body() signUpDto: SignupDto) {
        return this.authService.signup(signUpDto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    async getProfile(@Request() req) {
        // req.user contains { userId, username } from JwtStrategy
        // precise: fetch full user details
        const user = await this.usersService.findOne(req.user.username);
        // Maybe sanitize password? UsersService.findOne returns everything usually.
        if (user) {
            const { password, ...result } = user;
            return result;
        }
        return req.user;
    }

    // ─── Forgot / Reset Password ─────────────────────────────────────────────────

    @Public()
    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto, @Request() req) {
        const frontendUrl = req.headers['x-frontend-url'] || process.env.FRONTEND_URL || '';
        return this.authService.forgotPassword(dto.email, frontendUrl as string);
    }

    @Public()
    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }

    // ─── Admin: Test Email ───────────────────────────────────────────────────────

    @Public()
    @Post('test-email')
    async testEmail(@Body() body: { to: string }) {
        const sent = await this.emailService.sendMail(
            body.to,
            'Test Email — SMTP Configuration',
            `<div style="font-family:sans-serif;background:#0a0d1a;color:#e2e8f0;padding:40px;border-radius:12px;">
              <h2 style="color:#64b5f6;">✅ SMTP Test Successful</h2>
              <p style="color:#94a3b8;margin-top:12px;">Your SMTP configuration is working correctly. This is a test email sent from your admin panel.</p>
            </div>`,
        );
        if (sent) return { success: true, message: 'Test email sent successfully.' };
        return { success: false, message: 'Failed to send. Check SMTP settings.' };
    }

    // ─── SMS OTP: Send ──────────────────────────────────────────────────────────────

    /**
     * POST /auth/send-otp
     * Generates a 6-digit OTP and delivers it via LAAFFIC SMS.
     * purpose: "REGISTER" | "FORGOT_PASSWORD"
     */
    @Public()
    @Post('send-otp')
    async sendOtp(@Body() dto: SendOtpDto) {
        return this.authService.sendPhoneOtp(dto.phoneNumber, dto.purpose);
    }

    /**
     * POST /auth/verify-otp
     * Verifies a 6-digit OTP for the given phone number and purpose.
     * Returns { verified: true } on success.
     */
    @Public()
    @Post('verify-otp')
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyPhoneOtp(dto.phoneNumber, dto.code, dto.purpose);
    }

    // ─── SMS OTP: Forgot Password ─────────────────────────────────────────────────

    /**
     * POST /auth/forgot-password-phone
     * Checks if a user with the given phoneNumber exists, then sends a
     * FORGOT_PASSWORD OTP.  Always returns the same generic message.
     */
    @Public()
    @Post('forgot-password-phone')
    async forgotPasswordPhone(@Body() dto: PhoneForgotPasswordDto) {
        return this.authService.phoneForgotPassword(dto.phoneNumber);
    }

    /**
     * POST /auth/reset-password-phone
     * Verifies the FORGOT_PASSWORD OTP and resets the user's password in one call.
     */
    @Public()
    @Post('reset-password-phone')
    async resetPasswordPhone(@Body() dto: PhoneResetPasswordDto) {
        return this.authService.resetPasswordByPhone(dto.phoneNumber, dto.code, dto.newPassword);
    }
}
