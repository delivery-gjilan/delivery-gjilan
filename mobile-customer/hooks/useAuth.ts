import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { SignupStep, UserRole } from '@/types/graphql.generated';

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
    const [loading, setLoading] = useState(true);
    const [signupError, setSignupError] = useState<string | null>(null);

    const mounted = useRef(true);
    // Removed Apollo client and mutations

    // Restore token and user from AsyncStorage on mount
    useEffect(() => {
        const restoreToken = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('authToken');
                const storedUser = await AsyncStorage.getItem('authUser');

                if (mounted.current) {
                    if (storedToken && storedUser) {
                        setToken(storedToken);
                        setUser(JSON.parse(storedUser));
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to restore token:', error);
                if (mounted.current) {
                    setLoading(false);
                }
            }
        };

        restoreToken();

        return () => {
            mounted.current = false;
        };
    }, []);

    const saveTokenAndUser = useCallback(async (newToken: string, newUser: AuthUser) => {
        try {
            await AsyncStorage.setItem('authToken', newToken);
            await AsyncStorage.setItem('authUser', JSON.stringify(newUser));
            if (mounted.current) {
                setToken(newToken);
                setUser(newUser);
            }
        } catch (error) {
            console.error('Failed to save token:', error);
        }
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
                signupStep: 'EMAIL_SENT',
                role: 'CUSTOMER' as UserRole,
            } as AuthUser;

            await saveTokenAndUser('mock-token', mockUser);
            return {
                token: 'mock-token',
                user: mockUser,
                message: 'Mock signup started. Use code 123456 to verify email.',
            };
        },
        [saveTokenAndUser]
    );

    const verifyEmail = useCallback(
        async (_code: string): Promise<SignupStepResponse> => {
            setSignupError(null);
            if (!user) throw new Error('No user in progress');

            const updatedUser = { ...user, emailVerified: true, signupStep: 'EMAIL_VERIFIED' as SignupStep };
            await saveTokenAndUser(token ?? 'mock-token', updatedUser);

            return {
                userId: updatedUser.id,
                currentStep: updatedUser.signupStep,
                message: 'Email verified (mock). Use phone code 123456 next.',
            };
        },
        [token, user, saveTokenAndUser]
    );

    const submitPhoneNumber = useCallback(
        async (phoneNumber: string): Promise<SignupStepResponse> => {
            setSignupError(null);
            if (!user) throw new Error('No user in progress');

            const updatedUser = {
                ...user,
                phoneNumber,
                signupStep: 'PHONE_SENT' as SignupStep,
            };

            await saveTokenAndUser(token ?? 'mock-token', updatedUser);

            return {
                userId: updatedUser.id,
                currentStep: updatedUser.signupStep,
                message: `Phone saved (mock). Code 123456 sent to ${phoneNumber}.`,
            };
        },
        [token, user, saveTokenAndUser]
    );

    const verifyPhone = useCallback(
        async (_code: string): Promise<SignupStepResponse> => {
            setSignupError(null);
            if (!user) throw new Error('No user in progress');

            const updatedUser = {
                ...user,
                phoneVerified: true,
                signupStep: 'COMPLETED' as SignupStep,
            };

            await saveTokenAndUser(token ?? 'mock-token', updatedUser);

            return {
                userId: updatedUser.id,
                currentStep: updatedUser.signupStep,
                message: 'Phone verified (mock). Signup completed.',
            };
        },
        [token, user, saveTokenAndUser]
    );

    const login = useCallback(
        async (email: string, _password: string) => {
            setSignupError(null);

            // If a user exists, reuse it; otherwise create a completed mock user
            const existingUser = user ?? {
                id: generateId(),
                email,
                firstName: 'Mock',
                lastName: 'User',
                phoneNumber: '+10000000000',
                address: null as unknown as string | undefined,
                emailVerified: true,
                phoneVerified: true,
                signupStep: 'COMPLETED' as SignupStep,
                role: 'CUSTOMER' as UserRole,
            };

            await saveTokenAndUser('mock-token', existingUser as AuthUser);

            return {
                token: 'mock-token',
                user: existingUser,
                message: 'Login simulated (mock)',
            };
        },
        [saveTokenAndUser, user]
    );

    const logout = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('authUser');
            if (mounted.current) {
                setToken(null);
                setUser(null);
                setSignupError(null);
            }
            // No remote cache to clear in mock mode
        } catch (error) {
            console.error('Failed to logout:', error);
        }
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
        isAuthenticated: !!user && user.signupStep === 'COMPLETED',
        isSigningUp: !!user && user.signupStep !== 'COMPLETED',
    };
};
