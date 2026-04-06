import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { AuthRepository } from '@/repositories/AuthRepository';
import { DriverRepository } from '@/repositories/DriverRepository';
import { DriverConnectionStatusType } from '@/database/schema/drivers';
import { AppError } from '@/lib/errors';

export interface DriverAuthResult {
    token: string;
    refreshToken: string;
    driver: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        onlinePreference: boolean;
        connectionStatus: DriverConnectionStatusType;
        lastHeartbeatAt: string | null;
        lastLocationUpdate: string | null;
        driverLat: number | null;
        driverLng: number | null;
    };
    message: string;
}

export class DriverAuthService {
    constructor(
        private authRepository: AuthRepository,
        private driverRepository: DriverRepository
    ) {}

    private getJwtSecret(): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return secret;
    }

    private getRefreshSecret(): string {
        const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('REFRESH_TOKEN_SECRET is not defined in environment variables');
        }
        return secret;
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async generateTokenPair(userId: string, role: string, businessId: string | null) {
        const token = jwt.sign(
            { userId, role, businessId },
            this.getJwtSecret(),
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { userId, type: 'refresh', jti: randomUUID() },
            this.getRefreshSecret(),
            { algorithm: 'HS256', expiresIn: '30d' }
        );
        const refreshTokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await this.authRepository.createRefreshTokenSession(
            userId,
            refreshTokenHash,
            expiresAt.toISOString()
        );
        return { token, refreshToken };
    }

    private buildDriverResponse(user: { id: string; email: string; firstName: string; lastName: string; phoneNumber: string | null }, driver: { onlinePreference: boolean; connectionStatus: any; lastHeartbeatAt: string | null; lastLocationUpdate: string | null; driverLat: number | null; driverLng: number | null }) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            onlinePreference: driver.onlinePreference,
            connectionStatus: driver.connectionStatus,
            lastHeartbeatAt: driver.lastHeartbeatAt,
            lastLocationUpdate: driver.lastLocationUpdate,
            driverLat: driver.driverLat,
            driverLng: driver.driverLng,
        };
    }

    async register(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        phoneNumber?: string
    ): Promise<DriverAuthResult> {
        const existingUser = await this.authRepository.findByEmail(email.toLowerCase());
        if (existingUser) {
            throw AppError.conflict('Driver with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let user = await this.authRepository.createUserWithRole(
            firstName,
            lastName,
            email.toLowerCase(),
            hashedPassword,
            'DRIVER'
        );

        if (phoneNumber) {
            const updatedUser = await this.authRepository.setPhoneNumber(user.id, phoneNumber);
            if (updatedUser) {
                user = updatedUser;
            }
        }

        const driverProfile = await this.driverRepository.createDriver(user.id);

        const { token, refreshToken } = await this.generateTokenPair(user.id, user.role, user.businessId ?? null);

        return {
            token,
            refreshToken,
            driver: this.buildDriverResponse(user, driverProfile),
            message: 'Driver registered successfully',
        };
    }

    async login(email: string, password: string): Promise<DriverAuthResult> {
        const user = await this.authRepository.findByEmail(email.toLowerCase());
        if (!user || user.role !== 'DRIVER') {
            throw AppError.badInput('Driver not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw AppError.badInput('Invalid password');
        }

        const driverProfile = await this.driverRepository.createDriver(user.id);

        const { token, refreshToken } = await this.generateTokenPair(user.id, user.role, user.businessId ?? null);

        return {
            token,
            refreshToken,
            driver: this.buildDriverResponse(user, driverProfile),
            message: 'Driver login successful',
        };
    }

    async getDriver(driverId: string) {
        return this.driverRepository.getDriverByUserId(driverId);
    }
}
