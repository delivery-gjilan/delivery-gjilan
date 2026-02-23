import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state.hasHydrated);

    if (!hasHydrated) {
        return null;
    }
    return <Redirect href={isAuthenticated ? '/(tabs)/map' : '/login'} />;
}
