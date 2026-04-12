import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from '@/hooks/useTranslations';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { REQUEST_PASSWORD_RESET_MUTATION } from '@/graphql/operations/auth';

const C = {
    bg: '#09090B',
    card: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
    text: '#FAFAFA',
    sub: '#A1A1AA',
    primary: '#7C3AED',
    error: '#EF4444',
    errorBg: 'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.25)',
};

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { t } = useTranslations();

    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);

    const handleSend = async () => {
        if (!email.trim()) {
            setError(t.auth.forgot_password.fill_email);
            return;
        }
        setError(null);
        try {
            const result = await requestReset({ variables: { email: email.trim().toLowerCase() } });
            console.log('[ForgotPassword] mutation result:', JSON.stringify(result));
            setSent(true);
        } catch (err: unknown) {
            console.error('[ForgotPassword] mutation error:', err);
            if (err instanceof Error) {
                console.error('[ForgotPassword] message:', err.message);
                console.error('[ForgotPassword] stack:', err.stack);
            }
            setError(t.auth.forgot_password.failed);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                {/* Back button */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
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
                    {sent ? (
                        /* ── Success state ── */
                        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                            <View
                                style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 36,
                                    backgroundColor: '#22c55e15',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20,
                                }}
                            >
                                <Ionicons name="mail-outline" size={36} color="#22c55e" />
                            </View>
                            <Text
                                style={{
                                    color: C.text,
                                    fontSize: 24,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                    marginBottom: 12,
                                }}
                            >
                                {t.auth.forgot_password.success_title}
                            </Text>
                            <Text
                                style={{
                                    color: C.sub,
                                    fontSize: 15,
                                    textAlign: 'center',
                                    lineHeight: 22,
                                    marginBottom: 32,
                                }}
                            >
                                {t.auth.forgot_password.success_message}
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.replace('/login')}
                                style={{
                                    backgroundColor: C.primary,
                                    paddingVertical: 16,
                                    paddingHorizontal: 32,
                                    borderRadius: 16,
                                    shadowColor: C.primary,
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 16,
                                    elevation: 10,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                                    {t.auth.forgot_password.back_to_login}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ) : (
                        /* ── Form state ── */
                        <Animated.View entering={FadeIn.duration(400)}>
                            <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 }}>
                                {t.auth.forgot_password.title}
                            </Text>
                            <Text
                                style={{
                                    color: C.sub,
                                    fontSize: 15,
                                    lineHeight: 22,
                                    marginBottom: 32,
                                }}
                            >
                                {t.auth.forgot_password.subtitle}
                            </Text>

                            {error && (
                                <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 16 }}>
                                    <View
                                        style={{
                                            backgroundColor: C.errorBg,
                                            borderWidth: 1,
                                            borderColor: C.errorBorder,
                                            borderRadius: 16,
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

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: C.card,
                                    borderWidth: 1.5,
                                    borderColor: C.border,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    marginBottom: 16,
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
                                        backgroundColor: 'transparent',
                                    }}
                                    placeholder={t.auth.forgot_password.email_placeholder}
                                    placeholderTextColor={C.sub}
                                    value={email}
                                    onChangeText={setEmail}
                                    editable={!loading}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    autoFocus
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSend}
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
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                                        {t.auth.forgot_password.send_button}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
