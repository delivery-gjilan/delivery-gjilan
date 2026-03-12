import { User } from '@/gql/graphql';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { saveRefreshToken, saveToken } from '@/utils/secureTokenStore';
import { useRouter } from 'expo-router';
import {
    INITIATE_SIGNUP_MUTATION,
    VERIFY_EMAIL_MUTATION,
    SUBMIT_PHONE_NUMBER_MUTATION,
    VERIFY_PHONE_MUTATION,
    LOGIN_MUTATION,
    RESEND_EMAIL_VERIFICATION_MUTATION,
} from '@/graphql/operations/auth';

export const useAuth = () => {
    const router = useRouter();
    const {
        user,
        token,
        isAuthenticated,
        needsSignupCompletion,
        login: storeLogin,
        logout: storeLogout,
        updateUser,
    } = useAuthStore();

    // Mutations
    const [initiateSignupMutation, { loading: initiateSignupLoading }] = useMutation(INITIATE_SIGNUP_MUTATION);
    const [verifyEmailMutation, { loading: verifyEmailLoading }] = useMutation(VERIFY_EMAIL_MUTATION);
    const [submitPhoneNumberMutation, { loading: submitPhoneLoading }] = useMutation(SUBMIT_PHONE_NUMBER_MUTATION);
    const [verifyPhoneMutation, { loading: verifyPhoneLoading }] = useMutation(VERIFY_PHONE_MUTATION);
    const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_MUTATION);
    const [resendEmailVerificationMutation, { loading: resendEmailLoading }] = useMutation(
        RESEND_EMAIL_VERIFICATION_MUTATION,
    );

    const initiateSignup = async (email: string, password: string, firstName: string, lastName: string, referralCode?: string) => {
        const { data } = await initiateSignupMutation({
            variables: {
                input: { email, password, firstName, lastName, referralCode },
            },
        });

        if (data?.initiateSignup) {
            const { token, user } = data.initiateSignup;
            console.log('[Auth] Signup successful, saving token');
            await saveToken(token);
            storeLogin(token, user as User);
        }

        return data?.initiateSignup;
    };

    const verifyEmail = async (code: string) => {
        const { data } = await verifyEmailMutation({
            variables: { input: { code } },
        });

        // Fetch updated user after verification
        if (data?.verifyEmail && user) {
            const updatedUser = { ...user, emailVerified: true, signupStep: data.verifyEmail.currentStep };
            updateUser(updatedUser as User);
        }

        return data?.verifyEmail;
    };

    const submitPhoneNumber = async (phoneNumber: string) => {
        const { data } = await submitPhoneNumberMutation({
            variables: { input: { phoneNumber } },
        });

        // Update user with phone number
        if (data?.submitPhoneNumber && user) {
            const updatedUser = { ...user, phoneNumber, signupStep: data.submitPhoneNumber.currentStep };
            updateUser(updatedUser as User);
        }

        return data?.submitPhoneNumber;
    };

    const verifyPhone = async (code: string) => {
        const { data } = await verifyPhoneMutation({
            variables: { input: { code } },
        });

        // Update user after phone verification
        if (data?.verifyPhone && user) {
            const updatedUser = { ...user, phoneVerified: true, signupStep: data.verifyPhone.currentStep };
            updateUser(updatedUser as User);
        }

        return data?.verifyPhone;
    };

    const login = async (email: string, password: string) => {
        const { data } = await loginMutation({
            variables: { input: { email, password } },
        });

        if (data?.login) {
            const { token, refreshToken, user } = data.login;
            console.log('[Auth] Login successful, saving token for user:', user.email);
            await saveToken(token);
            if (refreshToken) {
                await saveRefreshToken(refreshToken);
            }
            storeLogin(token, user as User);
        }

        return data?.login;
    };

    const resendEmailVerification = async () => {
        const { data } = await resendEmailVerificationMutation();
        return data?.resendEmailVerification;
    };

    const resendPhoneVerification = () => {
        // Go back to phone input step by updating user's signup step
        if (user) {
            const updatedUser = { ...user, signupStep: 'EMAIL_VERIFIED' as const };
            updateUser(updatedUser as User);
        }
    };

    const logout = async () => {
        try {
            console.log('[Auth] Logging out, clearing tokens');
            storeLogout();
            // Force navigation to auth selection screen
            if (typeof window !== 'undefined') {
                // Using replace to prevent going back
                router.replace('/auth-selection');
            }
        } catch (error) {
            console.error('[Auth] Logout error:', error);
            // Still logout even if there's an error
            storeLogout();
        }
    };

    return {
        user,
        token,
        isAuthenticated,
        needsSignupCompletion,
        loading:
            initiateSignupLoading ||
            verifyEmailLoading ||
            submitPhoneLoading ||
            verifyPhoneLoading ||
            loginLoading ||
            resendEmailLoading,
        initiateSignup,
        verifyEmail,
        submitPhoneNumber,
        verifyPhone,
        login,
        logout,
        resendEmailVerification,
        resendPhoneVerification,
    };
};
