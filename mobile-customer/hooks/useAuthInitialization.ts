import { useEffect, useState } from 'react';
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
    const [isInitializing, setIsInitializing] = useState(true);
    const { setToken, setUser, setLoading, logout } = useAuthStore();

    const [fetchMe, { data, error, loading }] = useLazyQuery(ME_QUERY, {
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        async function initializeAuth() {
            try {
                console.log('Initializing auth...');
                console.log(data, error, loading);
                setLoading(true);

                // Load token from secure storage
                const token = await getToken();

                if (!token) {
                    // No token found, user is not authenticated
                    setIsInitializing(false);
                    setLoading(false);
                    router.push('/auth-selection');
                    return;
                }

                // Set token in store
                setToken(token);

                // Fetch user data
                await fetchMe();
            } catch (err) {
                console.error('Error initializing auth:', err);
                // Clear auth state on error
                logout();
                setIsInitializing(false);
                setLoading(false);
            }
        }

        initializeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update user when query completes
    useEffect(() => {
        if (data?.me && !loading) {
            setUser(data.me);
            setIsInitializing(false);
            setLoading(false);
            if (data.me.signupStep === SignupStep.Completed) {
                router.push('/(tabs)/home');
            } else {
                router.push('/signup');
            }
        } else if (error) {
            // Invalid token or network error
            console.error('Error fetching user:', error);
            logout();
            setIsInitializing(false);
            setLoading(false);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, error]);

    return {
        loading,
        error,
    };
}
