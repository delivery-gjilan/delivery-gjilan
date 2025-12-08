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
     * Step 1: Initiate signup - Create user and generate email verification code
     */
    async initiateSignup(
        firstName: string,
        lastName: string,
        email: string,
        password: string,
    ): Promise<SignupStepResponse> {
        // Check if user already exists
        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await this.authRepository.createUser(firstName, lastName, email, hashedPassword);

        // Generate and set email verification code
        const verificationCode = generateVerificationCode();
        await this.authRepository.setEmailVerificationCode(user.id, verificationCode);

        // In a real app, you would send this code via email
        console.log(`Email verification code for ${email}: ${verificationCode}`);

        return {
            userId: user.id,
            currentStep: 'EMAIL_SENT',
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
     * Step 3: Submit phone number and generate verification code
     */
    async submitPhoneNumber(userId: string, phoneNumber: string): Promise<SignupStepResponse> {
        const user = await this.authRepository.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.signupStep !== 'EMAIL_VERIFIED') {
            throw new Error('Please verify your email first');
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

        // Check if signup is completed
        if (user.signupStep !== 'COMPLETED') {
            throw new Error('Please complete the signup process first');
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate JWT token (eternal - no expiration)
        const token = this.generateJWT(user.id);

        return {
            token,
            user,
            message: 'Login successful',
        };
    }

    /**
     * Generate JWT token without expiration
     */
    generateJWT(userId: string): string {
        const secret = this.getJwtSecret();
        // No expiresIn option = eternal token
        return jwt.sign({ userId }, secret);
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
}
