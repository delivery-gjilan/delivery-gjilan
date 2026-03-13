import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { LOGIN_MUTATION } from '@/graphql/auth';
import { useAuthStore } from '@/store/authStore';
import { saveRefreshToken, saveToken } from '@/utils/secureTokenStore';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const router = useRouter();
    const { login: loginStore } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        try {
            const { data } = await loginMutation({
                variables: {
                    input: {
                        email: email.trim().toLowerCase(),
                        password,
                    },
                },
            });

            const loginPayload = (data as any)?.login;

            if (!loginPayload) {
                throw new Error('Login failed');
            }

            const { token, refreshToken, user } = loginPayload;

            // Validate business user
            if (user.role !== 'BUSINESS_OWNER' && user.role !== 'BUSINESS_EMPLOYEE') {
                Alert.alert('Access Denied', 'This app is only for business owners and employees.');
                return;
            }

            if (!user.businessId || !user.business) {
                Alert.alert('Error', 'No business associated with this account.');
                return;
            }

            // Save token to secure storage
            console.log('[Login] Saving token for user:', user.email);
            await saveToken(token);
            if (refreshToken) {
                await saveRefreshToken(refreshToken);
            }

            // Update store with user and token
            loginStore(user, token);

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('[Login] Login error:', error);
            Alert.alert('Login Failed', error.message || 'Invalid email or password');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView 
                className="flex-1" 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }} 
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-center px-8">
                        {/* Logo/Header */}
                        <View className="items-center mb-12">
                            <View className="w-24 h-24 rounded-3xl items-center justify-center mb-6 bg-primary/20">
                                <Ionicons name="storefront" size={48} color="#0b89a9" />
                            </View>
                            <Text className="text-3xl font-bold text-text">Business Portal</Text>
                            <Text className="text-base mt-2 text-subtext">Delivery Gjilan</Text>
                        </View>

                        {/* Form */}
                        <View className="space-y-4">
                            <View>
                                <Text className="text-sm font-medium text-text mb-2">Email</Text>
                                <TextInput
                                    className="bg-card text-text px-4 py-3.5 rounded-xl text-base"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    placeholder="business@example.com"
                                    placeholderTextColor="#6b7280"
                                    editable={!loading}
                                />
                            </View>

                            <View>
                                <Text className="text-sm font-medium text-text mb-2">Password</Text>
                                <View className="relative">
                                    <TextInput
                                        className="bg-card text-text px-4 py-3.5 rounded-xl text-base pr-12"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        placeholder="••••••••"
                                        placeholderTextColor="#6b7280"
                                        editable={!loading}
                                        onSubmitEditing={handleLogin}
                                    />
                                    <TouchableOpacity
                                        className="absolute right-4 top-3.5"
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#9ca3af"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                className="bg-primary py-4 rounded-xl mt-6"
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white text-center font-semibold text-base">
                                        Sign In
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Info */}
                        <View className="mt-8 p-4 bg-card/50 rounded-xl">
                            <View className="flex-row items-start">
                                <Ionicons name="information-circle" size={20} color="#0b89a9" />
                                <Text className="text-subtext text-sm ml-2 flex-1">
                                    This app is for business owners and employees to manage orders and products.
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
