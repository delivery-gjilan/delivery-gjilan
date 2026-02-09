import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { login, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter email and password');
            return;
        }

        setError(null);
        try {
            await login(email.trim(), password);
            router.replace('/(tabs)/home');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="flex-1 justify-center px-6">
                        <Text className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                            Driver Login
                        </Text>
                        <Text className="text-base mb-8" style={{ color: theme.colors.subtext }}>
                            Sign in to view and manage deliveries
                        </Text>

                        <Input
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholder="driver@company.com"
                        />
                        <Input
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholder="••••••••"
                        />

                        {error && (
                            <Text className="text-red-500 mb-3 text-sm">
                                {error}
                            </Text>
                        )}

                        <Button
                            title={loading ? 'Signing in...' : 'Sign In'}
                            onPress={handleLogin}
                            loading={loading}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
