import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
    const { login, loading } = useAuth();
    const router = useRouter();
    const { t } = useTranslations();
    const theme = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError(t.auth.login.fill_all_fields);
            return;
        }

        setError(null);
        try {
            const result = await login(email, password);
            if (result) {
                setEmail('');
                setPassword('');

                // Navigate based on signup step
                if (result.user.signupStep === 'COMPLETED') {
                    router.replace('/(tabs)/home');
                } else {
                    router.replace('/signup' as Href);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.login.login_failed);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1">
                <View className="px-6 py-12">
                    <Text className="text-4xl font-bold text-foreground mb-2">{t.auth.login.title}</Text>
                    <Text className="text-base text-subtext">{t.auth.login.subtitle}</Text>
                </View>

                <View className="px-6 py-6">
                    {/* Error Message */}
                    {error && (
                        <View className="bg-expense/10 border border-expense/20 rounded-lg p-4 mb-6">
                            <Text className="text-expense font-medium">{error}</Text>
                        </View>
                    )}

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-foreground font-semibold mb-2">{t.auth.login.email_label}</Text>
                        <TextInput
                            className="border border-border rounded-lg px-4 py-3 text-foreground"
                            placeholder={t.auth.login.email_placeholder}
                            placeholderTextColor={theme.colors.subtext}
                            value={email}
                            onChangeText={setEmail}
                            editable={!loading}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Input */}
                    <View className="mb-6">
                        <Text className="text-foreground font-semibold mb-2">{t.auth.login.password_label}</Text>
                        <TextInput
                            className="border border-border rounded-lg px-4 py-3 text-foreground"
                            placeholder={t.auth.login.password_placeholder}
                            placeholderTextColor={theme.colors.subtext}
                            value={password}
                            onChangeText={setPassword}
                            editable={!loading}
                            secureTextEntry
                        />
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        className={`py-3 rounded-lg flex-row items-center justify-center ${
                            loading ? 'bg-border' : 'bg-primary'
                        }`}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-base">{t.auth.sign_in}</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <TouchableOpacity
                        className="py-4 mt-6"
                        onPress={() => {
                            router.push('/signup' as Href);
                        }}
                    >
                        <Text className="text-center text-subtext">
                            {t.auth.login.no_account}<Text className="text-primary font-semibold">{t.auth.login.sign_up_link}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
