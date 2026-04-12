import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useTranslations } from '@/hooks/useTranslations';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const C = {
    bg: '#09090B',
    card: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
    text: '#FAFAFA',
    sub: '#A1A1AA',
    primary: '#7C3AED',
    glow: 'rgba(124,58,237,0.3)',
    error: '#EF4444',
    errorBg: 'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.25)',
};

export default function LoginScreen() {
    const { login, loading } = useAuth();
    const router = useRouter();
    const { t } = useTranslations();

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
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Back */}
                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            backgroundColor: C.card,
                            borderWidth: 1,
                            borderColor: C.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={C.text} />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
                    {/* Header */}
                    <Animated.View entering={FadeIn.duration(500)} style={{ marginBottom: 36 }}>
                        <Text
                            style={{
                                color: C.text,
                                fontSize: 32,
                                fontWeight: '800',
                                letterSpacing: -0.5,
                            }}
                        >
                            {t.auth.login.title}
                        </Text>
                        <Text
                            style={{
                                color: C.sub,
                                fontSize: 15,
                                marginTop: 6,
                                lineHeight: 22,
                            }}
                        >
                            {t.auth.login.subtitle}
                        </Text>
                    </Animated.View>

                    {/* Error */}
                    {error && (
                        <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 16 }}>
                            <View
                                style={{
                                    backgroundColor: C.errorBg,
                                    borderWidth: 1,
                                    borderColor: C.errorBorder,
                                    borderRadius: 14,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Ionicons name="alert-circle" size={20} color={C.error} />
                                <Text
                                    style={{
                                        color: C.error,
                                        marginLeft: 10,
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

                    {/* Email */}
                    <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ marginBottom: 12 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: C.card,
                                borderWidth: 1,
                                borderColor: C.border,
                                borderRadius: 14,
                                paddingHorizontal: 16,
                            }}
                        >
                            <Ionicons name="mail-outline" size={20} color={C.sub} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    marginLeft: 12,
                                    fontSize: 16,
                                    color: C.text,
                                }}
                                placeholder={t.auth.login.email_placeholder}
                                placeholderTextColor={C.sub}
                                value={email}
                                onChangeText={setEmail}
                                editable={!loading}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>
                    </Animated.View>

                    {/* Password */}
                    <Animated.View entering={FadeInDown.delay(160).duration(400)} style={{ marginBottom: 24 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: C.card,
                                borderWidth: 1,
                                borderColor: C.border,
                                borderRadius: 14,
                                paddingHorizontal: 16,
                            }}
                        >
                            <Ionicons name="lock-closed-outline" size={20} color={C.sub} />
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    marginLeft: 12,
                                    fontSize: 16,
                                    color: C.text,
                                }}
                                placeholder={t.auth.login.password_placeholder}
                                placeholderTextColor={C.sub}
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
                                    color={C.sub}
                                />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Login button */}
                    <Animated.View entering={FadeInDown.delay(240).duration(400)}>
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                            style={{
                                backgroundColor: loading ? 'rgba(255,255,255,0.08)' : C.primary,
                                paddingVertical: 18,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: loading ? 'transparent' : C.primary,
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.4,
                                shadowRadius: 16,
                                elevation: loading ? 0 : 10,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 }}>
                                    {t.auth.sign_in}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Forgot password */}
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <TouchableOpacity
                            style={{ paddingVertical: 14, marginTop: 4, alignItems: 'center' }}
                            onPress={() => router.push('/forgot-password')}
                        >
                            <Text style={{ color: C.sub, fontSize: 14, fontWeight: '500' }}>
                                {t.auth.login.forgot_password}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sign up link */}
                    <Animated.View entering={FadeInDown.delay(360).duration(400)}>
                        <TouchableOpacity
                            style={{ paddingVertical: 16, marginTop: 12 }}
                            onPress={() => router.push('/signup' as Href)}
                        >
                            <Text style={{ textAlign: 'center', color: C.sub, fontSize: 15 }}>
                                {t.auth.login.no_account}
                                <Text style={{ color: C.primary, fontWeight: '600' }}>
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
