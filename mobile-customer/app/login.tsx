import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';

export default function LoginScreen() {
    const { login, loading, signupError } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setError(null);
        try {
            const result = await login(email, password);
            setEmail('');
            setPassword('');

            // Navigate based on signup step
            if (result.user.signupStep === 'COMPLETED') {
                router.replace('/(tabs)/home');
            } else {
                router.replace('/signup' as Href);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1">
                <View className="px-6 py-12">
                    <Text className="text-4xl font-bold text-gray-900 mb-2">Welcome</Text>
                    <Text className="text-base text-gray-600">Sign in to your account</Text>
                </View>

                <View className="px-6 py-6">
                    {/* Error Message */}
                    {(error || signupError) && (
                        <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <Text className="text-red-600 font-medium">{error || signupError}</Text>
                        </View>
                    )}

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-gray-700 font-semibold mb-2">Email</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            editable={!loading}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Input */}
                    <View className="mb-6">
                        <Text className="text-gray-700 font-semibold mb-2">Password</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            editable={!loading}
                            secureTextEntry
                        />
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        className={`py-3 rounded-lg flex-row items-center justify-center ${
                            loading ? 'bg-gray-400' : 'bg-blue-600'
                        }`}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-base">Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <TouchableOpacity
                        className="py-4 mt-6"
                        onPress={() => {
                            router.push('/signup' as Href);
                        }}
                    >
                        <Text className="text-center text-gray-600">
                            Don't have an account?{' '}
                            <Text className="text-blue-600 font-semibold">Sign up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}