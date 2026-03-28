import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export default function LoadingScreen() {
    const theme = useTheme();
    return (
        <View className="flex-1 items-center justify-center bg-background">
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
}
