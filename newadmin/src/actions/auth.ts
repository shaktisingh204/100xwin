'use server'

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs'; // Need to install bcryptjs as dev dependency or dependency
import { SignJWT } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'secret';

export async function login(currentState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email },
        });

        if (!user || !user.password) {
            return { error: 'Invalid credentials' };
        }

        // Check password
        // Using bcryptjs because backend uses bcrypt, format should be compatible
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return { error: 'Invalid credentials' };
        }

        // Check Role
        if (!['TECH_MASTER', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
            return { error: 'Unauthorized access' };
        }

        // Create Session
        const secret = new TextEncoder().encode(SECRET_KEY);
        const alg = 'HS256';

        const jwt = await new SignJWT({ sub: user.id.toString(), role: user.role, email: user.email })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        // Set Cookie
        (await cookies()).set('token', jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        // Also set user data cookie for client-side access (non-httpOnly) if needed, 
        // or return it to be stored in localStorage by client.
        // For server actions, we usually redirect.
        return { success: true, user: { id: user.id, email: user.email, role: user.role, username: user.username } };

    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Something went wrong' };
    }
}

export async function logout() {
    (await cookies()).delete('token');
    return { success: true };
}
