import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export default function Market() {
    const theme = useTheme();

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1 items-center justify-center px-4">
                <Text className="text-3xl font-bold mb-4" style={{ color: theme.colors.text }}>
                    Market
                </Text>
                <Text className="text-base text-center" style={{ color: theme.colors.subtext }}>
                    Coming soon...
                </Text>
            </View>
        </SafeAreaView>
    );
}
