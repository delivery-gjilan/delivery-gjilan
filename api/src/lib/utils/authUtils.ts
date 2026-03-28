import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import logger from '@/lib/logger';
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random 6-digit verification code
 */
export function generateVerificationCode(): string {
    return randomInt(100000, 999999).toString();
}

export function decodeJwtToken(token: string): { userId: string; role?: string; businessId?: string | null } {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        logger.error('auth:decodeJwtToken JWT_SECRET is not defined');
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string; role?: string; businessId?: string | null };
    return { userId: decoded.userId, role: decoded.role, businessId: decoded.businessId };
}
