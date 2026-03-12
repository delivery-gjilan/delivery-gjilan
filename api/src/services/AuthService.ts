import { AuthRepository } from '@/repositories/AuthRepository';
import { DbUser } from '@/database/schema/users';
import { hashPassword, comparePassword, generateVerificationCode } from '@/lib/utils/authUtils';
import jwt from 'jsonwebtoken';
import { AuthResponse, SignupStepResponse } from '@/generated/types.generated';
import logger from '@/lib/logger';
import { AppError } from '@/lib/errors';

const log = logger.child({ service: 'AuthService' });

export class AuthService {
    constructor(private authRepository: AuthRepository) {}

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

    /**
     * Step 1: Initiate signup - Create user, generate email verification code, and return JWT token
     */
    async initiateSignup(firstName: string, lastName: string, email: string, password: string, referralCode?: string): Promise<AuthResponse> {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw AppError.badInput('Invalid email format');
        }

        // Normalize email
        email = email.trim().toLowerCase();

        // Validate password strength
        if (password.length < 8) {
            throw AppError.badInput('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            throw AppError.badInput('Password must contain at least one uppercase letter');
        }
        if (!/[0-9]/.test(password)) {
            throw AppError.badInput('Password must contain at least one number');
        }

        // Check if user already exists
        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw AppError.conflict('User with this email already exists');
        }

        // If referral code provided, validate it
        let referrerUserId: string | null = null;
        if (referralCode) {
            referrerUserId = await this.authRepository.findUserByReferralCode(referralCode);
            if (!referrerUserId) {
                throw AppError.badInput('Invalid referral code');
            }
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await this.authRepository.createUser(firstName, lastName, email, hashedPassword);

        // Create referral record if referral code was provided
        if (referrerUserId) {
            await this.authRepository.createReferral(referrerUserId, user.id, referralCode!);
        }

        // Generate and set email verification code
        const verificationCode = generateVerificationCode();
        await this.authRepository.setEmailVerificationCode(user.id, verificationCode);

        // In a real app, you would send this code via email
        log.info({ email }, 'auth:signup:verificationSent');

        // Generate JWT token for authenticated signup steps
        const token = await this.generateJWT(user.id);

        return {
            token,
            user,
            message: `Verification code sent to ${email}. Please check your email.`,
        };
    }

    /**
     * Step 2: Verify email code
     */
    async verifyEmail(userId: string, code: string): Promise<SignupStepResponse> {
        const user = await this.authRepository.verifyEmailCode(userId, code);

        if (!user) {
            throw AppError.badInput('Invalid verification code');
        }

        return {
            userId: user.id,
            currentStep: 'EMAIL_VERIFIED',
            message: 'Email verified successfully. Please provide your phone number.',
        };
    }

    /**
     * Resend email verification code
     */
    async resendEmailVerification(userId: string): Promise<SignupStepResponse> {
        const user = await this.authRepository.findById(userId);

        if (!user) {
            throw AppError.notFound('User');
        }

        if (user.emailVerified) {
            throw AppError.conflict('Email is already verified');
        }

        // Generate and set new email verification code
        const verificationCode = generateVerificationCode();
        await this.authRepository.setEmailVerificationCode(user.id, verificationCode);

        // In a real app, you would send this code via email
        log.info({ email: user.email }, 'auth:resendVerification:sent');

        return {
            userId: user.id,
            currentStep: user.signupStep as SignupStepResponse['currentStep'],
            message: `Verification code resent to ${user.email}. Please check your email.`,
        };
    }

    /**
     * Step 3: Submit phone number and generate verification code
     */
    async submitPhoneNumber(userId: string, phoneNumber: string): Promise<SignupStepResponse> {
        const user = await this.authRepository.findById(userId);

        if (!user) {
            throw AppError.notFound('User');
        }

        if (!user.emailVerified) {
            throw AppError.businessRule('Please verify your email first');
        }

        // Allow resubmission if phone not verified yet
        if (user.phoneVerified) {
            throw AppError.conflict('Phone number is already verified');
        }

        // Set phone number
        await this.authRepository.setPhoneNumber(userId, phoneNumber);

        // Generate and set phone verification code
        const verificationCode = generateVerificationCode();
        await this.authRepository.setPhoneVerificationCode(userId, verificationCode);

        // In a real app, you would send this code via SMS
        log.info({ phoneNumber: phoneNumber.slice(-4) }, 'auth:phoneVerification:sent');

        return {
            userId: user.id,
            currentStep: 'PHONE_SENT',
            message: `Verification code sent to ${phoneNumber}. Please check your messages.`,
        };
    }

    /**
     * Step 4: Verify phone code and complete signup
     */
    async verifyPhone(userId: string, code: string): Promise<SignupStepResponse> {
        const user = await this.authRepository.verifyPhoneCode(userId, code);

        if (!user) {
            throw AppError.badInput('Invalid verification code');
        }

        return {
            userId: user.id,
            currentStep: 'COMPLETED',
            message: 'Phone verified successfully. Your account is now active!',
        };
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<AuthResponse> {
        // Normalize email to lowercase for consistent lookup
        email = email.trim().toLowerCase();
        const user = await this.authRepository.findByEmail(email);

        if (!user) {
            log.warn({ email }, 'auth:login:userNotFound');
            throw AppError.badInput('Invalid email or password');
        }

        log.info({ userId: user.id, email: user.email, role: user.role }, 'auth:login:userFound');

        // Allow login at any signup stage - user will be redirected based on signupStep

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        
        if (!isPasswordValid) {
            log.warn({ userId: user.id, email }, 'auth:login:invalidPassword');
            throw AppError.badInput('Invalid email or password');
        }

        // Generate short-lived access token plus long-lived refresh token.
        const token = await this.generateJWT(user.id);
        const refreshToken = await this.generateRefreshToken(user.id);

        return {
            token,
            refreshToken,
            user,
            message: 'Login successful',
        };
    }

    /**
     * Generate JWT access token with short expiration (15 minutes)
     */
    async generateJWT(userId: string): Promise<string> {
        const secret = this.getJwtSecret();
        const user = await this.authRepository.findById(userId);
        if (!user) throw AppError.notFound('User');
        return jwt.sign({ userId, role: user.role, businessId: user.businessId }, secret, { algorithm: 'HS256', expiresIn: '15m' });
    }

    /**
     * Generate a longer-lived refresh token (30 days) with a separate secret
     */
    async generateRefreshToken(userId: string): Promise<string> {
        const secret = this.getRefreshSecret();
        return jwt.sign({ userId, type: 'refresh' }, secret, { algorithm: 'HS256', expiresIn: '30d' });
    }

    /**
     * Refresh an access token using a valid refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
        try {
            const secret = this.getRefreshSecret();
            const decoded = jwt.verify(refreshToken, secret, { algorithms: ['HS256'] }) as { userId: string; type?: string };
            if (decoded.type !== 'refresh') {
                throw AppError.unauthorized('Invalid refresh token');
            }
            const user = await this.authRepository.findById(decoded.userId);
            if (!user) throw AppError.notFound('User');
            const newToken = await this.generateJWT(decoded.userId);
            const newRefreshToken = await this.generateRefreshToken(decoded.userId);
            return { token: newToken, refreshToken: newRefreshToken };
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw AppError.unauthorized('Invalid or expired refresh token');
        }
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyJWT(token: string): Promise<DbUser | null> {
        try {
            const secret = this.getJwtSecret();
            const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string };
            const user = await this.authRepository.findById(decoded.userId);
            return user || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<DbUser | null> {
        const user = await this.authRepository.findById(userId);
        return user || null;
    }

    /**
     * Create user directly with role (for admin use) - bypasses verification steps
     */
    async createUser(
        firstName: string,
        lastName: string,
        email: string,
        password: string,
        role: 'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_EMPLOYEE',
        businessId?: string,
    ): Promise<AuthResponse> {
        // Normalize email to lowercase to ensure consistent lookup
        email = email.trim().toLowerCase();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw AppError.badInput('Invalid email format');
        }

        // Validate password strength
        if (password.length < 8) {
            throw AppError.badInput('Password must be at least 8 characters long');
        }

        // Check if user already exists
        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw AppError.conflict('User with this email already exists');
        }

        // Validate businessId for business roles
        if ((role === 'BUSINESS_OWNER' || role === 'BUSINESS_EMPLOYEE') && !businessId) {
            throw AppError.badInput(`Business ID is required for ${role} role`);
        }

        log.info({ email, role }, 'auth:createUser:starting');

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user with role and completed status
        const user = await this.authRepository.createUserWithRole(
            firstName,
            lastName,
            email,
            hashedPassword,
            role,
            businessId,
        );

        log.info({ userId: user.id, email: user.email, role: user.role }, 'auth:createUser:userCreated');

        // Generate JWT token
        const token = await this.generateJWT(user.id);

        return {
            token,
            user,
            message: `User created successfully as ${role}`,
        };
    }

    /**
     * Fetch all users
     */
    async getAllUsers(): Promise<DbUser[]> {
        return this.authRepository.findAllUsers();
    }

    /**
     * Fetch only drivers
     */
    async getDrivers(): Promise<DbUser[]> {
        return this.authRepository.findDrivers();
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<DbUser | undefined> {
        return this.authRepository.findById(userId);
    }

    /**
     * Update user fields
     */
    async updateUser(userId: string, data: Partial<Omit<DbUser, 'id' | 'createdAt'>>): Promise<DbUser | undefined> {
        return this.authRepository.updateUser(userId, data);
    }

}
