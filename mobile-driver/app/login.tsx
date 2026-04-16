import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuthStore } from '@/store/authStore';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { login, loading } = useAuth();
    const { t } = useTranslations();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const hasHydrated = useAuthStore((state) => state.hasHydrated);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasHydrated && isAuthenticated) {
            router.replace('/brand-splash');
        }
    }, [hasHydrated, isAuthenticated, router]);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter email and password');
            return;
        }

        setError(null);
        try {
            await login(email.trim(), password);
            router.replace('/brand-splash');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View className="flex-1 justify-center px-6">
                    {/* Brand section */}
                    <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center', marginBottom: 40 }}>
                        <View
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: 20,
                                backgroundColor: theme.colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <Image
                                source={require('@/assets/images/icon.png')}
                                style={{ width: 52, height: 52, borderRadius: 12 }}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '700' }}>
                            {t.auth.login.title}
                        </Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 15, marginTop: 4 }}>
                            {t.auth.login.description}
                        </Text>
                    </Animated.View>

                    {/* Error banner */}
                    {error && (
                        <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 16 }}>
                            <View
                                style={{
                                    backgroundColor: theme.colors.expense + '15',
                                    borderWidth: 1,
                                    borderColor: theme.colors.expense + '30',
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Ionicons name="alert-circle" size={20} color={theme.colors.expense} />
                                <Text
                                    style={{
                                        color: theme.colors.expense,
                                        marginLeft: 8,
                                        fontSize: 14,
                                        fontWeight: '500',
                                        flex: 1,
                                    }}
                                >
                                    {error}
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Email input */}
                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginBottom: 12 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: 16,
                                paddingHorizontal: 16,
                            }}
                        >
                            <Ionicons name="mail-outline" size={20} color={theme.colors.subtext} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    marginLeft: 12,
                                    fontSize: 16,
                                    color: theme.colors.text,
                                }}
                                placeholder="driver@company.com"
                                placeholderTextColor={theme.colors.subtext}
                                value={email}
                                onChangeText={setEmail}
                                editable={!loading}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>
                    </Animated.View>

                    {/* Password input */}
                    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={{ marginBottom: 24 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: 16,
                                paddingHorizontal: 16,
                            }}
                        >
                            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.subtext} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    marginLeft: 12,
                                    fontSize: 16,
                                    color: theme.colors.text,
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={theme.colors.subtext}
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(v => !v)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={theme.colors.subtext}
                                />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Login button */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            style={{
                                backgroundColor: theme.colors.primary,
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                                    {t.auth.login.actions.login}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
