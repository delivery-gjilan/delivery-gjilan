import { SignupStep, UserRole } from '@/gql/graphql';
import { useState, useCallback } from 'react';

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    address?: string | null;
    phoneNumber?: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    signupStep: SignupStep;
    role: UserRole;
}

interface SignupStepResponse {
    userId: string;
    currentStep: SignupStep;
    message: string;
}

export const useAuth = () => {
    const generateId = () => Math.random().toString(36).slice(2);

    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [signupError, setSignupError] = useState<string | null>(null);

    const saveTokenAndUser = useCallback((newToken: string, newUser: AuthUser) => {
        setToken(newToken);
        setUser(newUser);
    }, []);

    const initiateSignup = useCallback(
        async (email: string, password: string, firstName: string, lastName: string) => {
            setSignupError(null);

            const mockUser: AuthUser = {
                id: generateId(),
                email,
                firstName,
                lastName,
                phoneNumber: null,
                address: null as unknown as string | undefined, // keep shape aligned
                emailVerified: false,
                phoneVerified: false,
                signupStep: SignupStep.EmailSent,
                role: 'CUSTOMER' as UserRole,
            } as AuthUser;

            await saveTokenAndUser('mock-token', mockUser);
            return {
                token: 'mock-token',
                user: mockUser,
                message: 'Mock signup started. Use code 123456 to verify email.',
            };
        },
        [saveTokenAndUser],
    );

    const verifyEmail = useCallback(
        async (_code: string): Promise<SignupStepResponse> => {
            setSignupError(null);
            if (!user) throw new Error('No user in progress');

            const updatedUser = { ...user, emailVerified: true, signupStep: SignupStep.EmailVerified };
            await saveTokenAndUser(token ?? 'mock-token', updatedUser);

            return {
                userId: updatedUser.id,
                currentStep: updatedUser.signupStep,
                message: 'Email verified (mock). Use phone code 123456 next.',
            };
        },
        [token, user, saveTokenAndUser],
    );

    const submitPhoneNumber = useCallback(
        async (phoneNumber: string): Promise<SignupStepResponse> => {
            setSignupError(null);
            if (!user) throw new Error('No user in progress');

            const updatedUser = {
                ...user,
                phoneNumber,
                signupStep: SignupStep.PhoneSent,
            };

            await saveTokenAndUser(token ?? 'mock-token', updatedUser);

            return {
                userId: updatedUser.id,
                currentStep: updatedUser.signupStep,
                message: `Phone saved (mock). Code 123456 sent to ${phoneNumber}.`,
            };
        },
        [token, user, saveTokenAndUser],
    );

    const verifyPhone = useCallback(
        async (_code: string): Promise<SignupStepResponse> => {
            setSignupError(null);
            if (!user) throw new Error('No user in progress');

            const updatedUser = {
                ...user,
                phoneVerified: true,
                signupStep: SignupStep.Completed,
            };

            await saveTokenAndUser(token ?? 'mock-token', updatedUser);

            return {
                userId: updatedUser.id,
                currentStep: updatedUser.signupStep,
                message: 'Phone verified (mock). Signup completed.',
            };
        },
        [token, user, saveTokenAndUser],
    );

    const login = useCallback(
        async (email: string, _password: string) => {
            setSignupError(null);

            // Create a fresh in-progress user to force signup flow
            const newUser: AuthUser = {
                id: generateId(),
                email,
                firstName: 'Mock',
                lastName: 'User',
                phoneNumber: null,
                address: null as unknown as string | undefined,
                emailVerified: false,
                phoneVerified: false,
                signupStep: SignupStep.EmailSent,
                role: 'CUSTOMER' as UserRole,
            };

            saveTokenAndUser('mock-token', newUser);

            return {
                token: 'mock-token',
                user: newUser,
                message: 'Login simulated (mock)',
            };
        },
        [saveTokenAndUser],
    );

    const logout = useCallback(async () => {
        setToken(null);
        setUser(null);
        setSignupError(null);
    }, []);

    return {
        user,
        token,
        loading,
        signupError,
        initiateSignup,
        verifyEmail,
        submitPhoneNumber,
        verifyPhone,
        login,
        logout,
        isAuthenticated: !!user && user.signupStep === SignupStep.Completed,
        isSigningUp: !!user && user.signupStep !== SignupStep.Completed,
    };
};
