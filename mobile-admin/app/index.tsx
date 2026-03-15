import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state.hasHydrated);

    if (!hasHydrated) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }
    return <Redirect href={isAuthenticated ? '/(tabs)/map' : '/login'} />;
}
