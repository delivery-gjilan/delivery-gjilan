import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslations } from '@/hooks/useTranslations';

export default function AuthSelectionScreen() {
    const router = useRouter();
    const { t } = useTranslations();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-6 justify-center">
                {/* Header */}
                <View className="mb-12">
                    <Text className="text-5xl font-bold text-gray-900 mb-4">{t.auth.welcome}</Text>
                    <Text className="text-lg text-gray-600">{t.auth.create_or_sign_in}</Text>
                </View>

                {/* Illustration/Icon */}
                <View className="w-32 h-32 bg-blue-100 rounded-full items-center justify-center mb-12 self-center">
                    <Text className="text-6xl">🍕</Text>
                </View>

                {/* Buttons */}
                <View className="space-y-4">
                    {/* Create Account Button */}
                    <TouchableOpacity className="bg-blue-600 py-4 rounded-xl" onPress={() => router.push('/signup')}>
                        <Text className="text-white font-bold text-center text-lg">{t.auth.create_account}</Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        className="border-2 border-blue-600 py-4 rounded-xl mt-4"
                        onPress={() => router.push('/login')}
                    >
                        <Text className="text-blue-600 font-bold text-center text-lg">{t.auth.sign_in}</Text>
                    </TouchableOpacity>
                </View>

                {/* Guest Option */}
                <TouchableOpacity className="mt-8" onPress={() => router.replace('/(tabs)/home')}>
                    <Text className="text-gray-500 text-center font-medium">{t.auth.continue_as_guest}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
