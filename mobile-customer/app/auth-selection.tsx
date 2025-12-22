import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function AuthSelectionScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-6 justify-center">
                {/* Header */}
                <View className="mb-12">
                    <Text className="text-5xl font-bold text-gray-900 mb-4">Welcome!</Text>
                    <Text className="text-lg text-gray-600">Create an account or sign in to get started</Text>
                </View>

                {/* Illustration/Icon */}
                <View className="w-32 h-32 bg-blue-100 rounded-full items-center justify-center mb-12 self-center">
                    <Text className="text-6xl">🍕</Text>
                </View>

                {/* Buttons */}
                <View className="space-y-4">
                    {/* Create Account Button */}
                    <TouchableOpacity className="bg-blue-600 py-4 rounded-xl" onPress={() => router.push('/signup')}>
                        <Text className="text-white font-bold text-center text-lg">Create Account</Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        className="border-2 border-blue-600 py-4 rounded-xl mt-4"
                        onPress={() => router.push('/login')}
                    >
                        <Text className="text-blue-600 font-bold text-center text-lg">Sign In</Text>
                    </TouchableOpacity>
                </View>

                {/* Guest Option */}
                <TouchableOpacity className="mt-8" onPress={() => router.replace('/(tabs)/home')}>
                    <Text className="text-gray-500 text-center font-medium">Continue as Guest</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
