import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '@/repositories/AuthRepository';
import { DriverRepository } from '@/repositories/DriverRepository';

export interface DriverAuthResult {
    token: string;
    driver: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        onlinePreference: boolean;
        connectionStatus: string;
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

    private buildDriverResponse(user: { id: string; email: string; firstName: string; lastName: string; phoneNumber: string | null }, driver: { onlinePreference: boolean; connectionStatus: string; lastHeartbeatAt: string | null; lastLocationUpdate: string | null; driverLat: number | null; driverLng: number | null }) {
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
            throw new Error('Driver with this email already exists');
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

        const token = jwt.sign(
            { userId: user.id, role: user.role, businessId: user.businessId },
            this.getJwtSecret()
        );

        return {
            token,
            driver: this.buildDriverResponse(user, driverProfile),
            message: 'Driver registered successfully',
        };
    }

    async login(email: string, password: string): Promise<DriverAuthResult> {
        const user = await this.authRepository.findByEmail(email.toLowerCase());
        if (!user || user.role !== 'DRIVER') {
            throw new Error('Driver not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        const driverProfile = await this.driverRepository.createDriver(user.id);

        const token = jwt.sign(
            { userId: user.id, role: user.role, businessId: user.businessId },
            this.getJwtSecret()
        );

        return {
            token,
            driver: this.buildDriverResponse(user, driverProfile),
            message: 'Driver login successful',
        };
    }

    async getDriver(driverId: string) {
        return this.driverRepository.getDriverByUserId(driverId);
    }
}
