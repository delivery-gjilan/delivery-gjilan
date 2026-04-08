import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const { login, loading } = useAuth();
    const router = useRouter();
    const { t } = useTranslations();
    const theme = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

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

                if (result.user.signupStep === 'COMPLETED') {
                    router.replace('/brand-splash');
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 justify-center px-6">
                    {/* Brand Section */}
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
                        <Text
                            style={{
                                color: theme.colors.text,
                                fontSize: 28,
                                fontWeight: '700',
                            }}
                        >
                            {t.auth.login.title}
                        </Text>
                        <Text
                            style={{
                                color: theme.colors.subtext,
                                fontSize: 15,
                                marginTop: 4,
                            }}
                        >
                            {t.auth.login.subtitle}
                        </Text>
                    </Animated.View>

                    {/* Error Message */}
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

                    {/* Email Input */}
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
                                placeholder={t.auth.login.email_placeholder}
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

                    {/* Password Input */}
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
                                placeholder={t.auth.login.password_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
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

                    {/* Login Button */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                            style={{
                                backgroundColor: loading ? theme.colors.border : theme.colors.primary,
                                paddingVertical: 16,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                                    {t.auth.sign_in}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Forgot Password */}
                    <Animated.View entering={FadeInDown.delay(350).duration(500)}>
                        <TouchableOpacity
                            style={{ paddingVertical: 12, marginTop: 4, alignItems: 'center' }}
                            onPress={() => router.push('/forgot-password')}
                        >
                            <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '500' }}>
                                {t.auth.login.forgot_password}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sign Up Link */}
                    <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                        <TouchableOpacity
                            style={{ paddingVertical: 16, marginTop: 16 }}
                            onPress={() => router.push('/signup' as Href)}
                        >
                            <Text style={{ textAlign: 'center', color: theme.colors.subtext, fontSize: 15 }}>
                                {t.auth.login.no_account}
                                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                    {t.auth.login.sign_up_link}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
