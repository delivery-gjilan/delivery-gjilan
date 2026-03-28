import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/hooks/useTranslations';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { login, loading } = useAuth();
    const { t } = useTranslations();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError(t.auth.login.errors.required);
            return;
        }
        setError(null);
        try {
            await login(email.trim(), password);
            router.replace('/(tabs)/map');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.login.errors.invalid);
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View className="flex-1 justify-center px-8">
                        {/* Logo area */}
                        <View className="items-center mb-10">
                            <View
                                className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
                                style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                <Ionicons name="shield-checkmark" size={40} color={theme.colors.primary} />
                            </View>
                            <Text className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                                {t.auth.login.title}
                            </Text>
                            <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                                {t.auth.login.description}
                            </Text>
                        </View>

                        {/* Form */}
                        <Input
                            label={t.auth.login.email}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            placeholder="admin@delivery.com"
                        />
                        <Input
                            label={t.auth.login.password}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholder="••••••••"
                        />

                        {error && (
                            <View className="flex-row items-center mb-4 px-3 py-2.5 rounded-xl" style={{ backgroundColor: `${theme.colors.danger}10` }}>
                                <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
                                <Text className="text-sm ml-2 flex-1" style={{ color: theme.colors.danger }}>
                                    {error}
                                </Text>
                            </View>
                        )}

                        <Button
                            title={loading ? t.common.loading : t.auth.login.actions.login}
                            onPress={handleLogin}
                            loading={loading}
                            size="lg"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
