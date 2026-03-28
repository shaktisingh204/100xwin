import { IsString, IsEmail, IsOptional, MinLength, IsNotEmpty, IsIn, ValidateIf } from 'class-validator';


export class SignupDto {
    @ValidateIf(o => !o.phoneNumber)
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;

    @ValidateIf(o => !o.email)
    @IsString()
    @MinLength(10, { message: 'Phone number must be at least 10 digits' })
    phoneNumber?: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    bonus_id?: string;

    @IsOptional()
    @IsString()
    role?: 'TECH_MASTER' | 'SUPER_ADMIN' | 'MANAGER' | 'USER';

    /** Referral code from a referral link (?ref=CODE) */
    @IsOptional()
    @IsString()
    referralCode?: string;

    /** Alias used by the register modal's promoCode field — treated as referralCode */
    @IsOptional()
    @IsString()
    promoCode?: string;
}

export class LoginDto {
    @IsNotEmpty()
    @IsString()
    identifier: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class ForgotPasswordDto {
    @IsNotEmpty()
    @IsEmail({}, { message: 'Invalid email address' })
    email: string;
}

export class ResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    token: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    newPassword: string;
}

// ─── SMS OTP DTOs ────────────────────────────────────────────────────────────

export class SendOtpDto {
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;

    @IsNotEmpty()
    @IsIn(['REGISTER', 'FORGOT_PASSWORD'])
    purpose: 'REGISTER' | 'FORGOT_PASSWORD';
}

export class VerifyOtpDto {
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;

    @IsNotEmpty()
    @IsString()
    code: string;

    @IsNotEmpty()
    @IsIn(['REGISTER', 'FORGOT_PASSWORD'])
    purpose: 'REGISTER' | 'FORGOT_PASSWORD';
}

export class PhoneForgotPasswordDto {
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;
}

export class PhoneResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;

    @IsNotEmpty()
    @IsString()
    code: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    newPassword: string;
}

