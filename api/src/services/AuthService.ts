import { AuthRepository } from '@/repositories/AuthRepository';
import { DbUser } from '@/database/schema/users';
import { hashPassword, comparePassword, generateVerificationCode } from '@/lib/utils/authUtils';
import jwt from 'jsonwebtoken';
import { AuthResponse, SignupStepResponse } from '@/generated/types.generated';

export class AuthService {
    constructor(private authRepository: AuthRepository) {}

    private getJwtSecret(): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return secret;
    }

    /**
     * Step 1: Initiate signup - Create user, generate email verification code, and return JWT token
     */
    async initiateSignup(firstName: string, lastName: string, email: string, password: string, referralCode?: string): Promise<AuthResponse> {
        // Check if user already exists
        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // If referral code provided, validate it
        let referrerUserId: string | null = null;
        if (referralCode) {
            referrerUserId = await this.authRepository.findUserByReferralCode(referralCode);
            if (!referrerUserId) {
                throw new Error('Invalid referral code');
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
        console.log(`Email verification code for ${email}: ${verificationCode}`);

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
            throw new Error('Invalid verification code');
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
            throw new Error('User not found');
        }

        if (user.emailVerified) {
            throw new Error('Email is already verified');
        }

        // Generate and set new email verification code
        const verificationCode = generateVerificationCode();
        await this.authRepository.setEmailVerificationCode(user.id, verificationCode);

        // In a real app, you would send this code via email
        console.log(`Email verification code for ${user.email}: ${verificationCode}`);

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
            throw new Error('User not found');
        }

        if (!user.emailVerified) {
            throw new Error('Please verify your email first');
        }

        // Allow resubmission if phone not verified yet
        if (user.phoneVerified) {
            throw new Error('Phone number is already verified');
        }

        // Set phone number
        await this.authRepository.setPhoneNumber(userId, phoneNumber);

        // Generate and set phone verification code
        const verificationCode = generateVerificationCode();
        await this.authRepository.setPhoneVerificationCode(userId, verificationCode);

        // In a real app, you would send this code via SMS
        console.log(`Phone verification code for ${phoneNumber}: ${verificationCode}`);

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
            throw new Error('Invalid verification code');
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
        const user = await this.authRepository.findByEmail(email);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Allow login at any signup stage - user will be redirected based on signupStep

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate JWT token (eternal - no expiration)
        const token = await this.generateJWT(user.id);

        return {
            token,
            user,
            message: 'Login successful',
        };
    }

    /**
     * Generate JWT token without expiration
     */
    async generateJWT(userId: string): Promise<string> {
        const secret = this.getJwtSecret();
        const user = await this.authRepository.findById(userId);
        if (!user) throw new Error('User not found');
        return jwt.sign({ userId, role: user.role, businessId: user.businessId }, secret);
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyJWT(token: string): Promise<DbUser | null> {
        try {
            const secret = this.getJwtSecret();
            const decoded = jwt.verify(token, secret) as { userId: string };
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
        role: 'CUSTOMER' | 'DRIVER' | 'SUPER_ADMIN' | 'BUSINESS_ADMIN',
        businessId?: string,
    ): Promise<AuthResponse> {
        // Check if user already exists
        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Validate businessId for BUSINESS_ADMIN role
        if (role === 'BUSINESS_ADMIN' && !businessId) {
            throw new Error('Business ID is required for BUSINESS_ADMIN role');
        }

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
