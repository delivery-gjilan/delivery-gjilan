import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/utils/secureTokenStore';
import { useLazyQuery } from '@apollo/client/react';
import { ME_QUERY } from '@/graphql/operations/auth';
import { useRouter } from 'expo-router';
import { SignupStep } from '@/gql/graphql';

/**
 * Hook to initialize authentication state on app startup
 * Loads token from secure storage and fetches user data if token exists
 */
export function useAuthInitialization() {
    const router = useRouter();
    const isInitializingRef = useRef(true);
    const [isInitializing, setIsInitializing] = useState(true);
    const { setToken, setUser, setLoading, logout } = useAuthStore();

    const [fetchMe, { data, error, loading }] = useLazyQuery(ME_QUERY, {
        fetchPolicy: 'network-only',
    });

    const logoutAndNavigate = useCallback(() => {
        logout();
        router.replace('/auth-selection');
    }, [logout, router]);

    useEffect(() => {
        // const token = await getToken();
        // setToken(token);
        // logout();
        // setLoading(true);
        // setUser(data.me);
        // router.replace('/auth-selection');
        // router.replace('/(tabs)/home');
        if (!isInitializingRef.current) {
            return;
        }

        const initializeAuth = async () => {
            const token = await getToken();
            if (!token) {
                logoutAndNavigate();
            } else {
                setToken(token);
                setLoading(true);
                fetchMe();
            }
            isInitializingRef.current = false;
            setIsInitializing(false);
        };
        initializeAuth();
    }, [fetchMe, logoutAndNavigate, setLoading, setToken]);

    useEffect(() => {
        if (loading || error || !data?.me) return;
        setUser(data.me);

        if (data.me.signupStep === SignupStep.Completed) {
            router.replace('/(tabs)/home');
        } else {
            router.replace('/signup');
        }
    }, [data?.me, error, loading, router, setUser]);

    useEffect(() => {
        if (error) {
            logoutAndNavigate();
        }
    }, [error, logoutAndNavigate]);

    return {
        isInitializing,
        error,
    };
}
