import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { REQUEST_PASSWORD_RESET_MUTATION } from '@/graphql/operations/auth';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { t } = useTranslations();
    const theme = useTheme();

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
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                {/* Back button */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
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
                                    color: theme.colors.text,
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
                                    color: theme.colors.subtext,
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
                                    backgroundColor: theme.colors.primary,
                                    paddingVertical: 16,
                                    paddingHorizontal: 32,
                                    borderRadius: 16,
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
                            <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '700', marginBottom: 8 }}>
                                {t.auth.forgot_password.title}
                            </Text>
                            <Text
                                style={{
                                    color: theme.colors.subtext,
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

                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: theme.colors.card,
                                    borderWidth: 1.5,
                                    borderColor: theme.colors.border,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    marginBottom: 16,
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
                                        backgroundColor: 'transparent',
                                    }}
                                    placeholder={t.auth.forgot_password.email_placeholder}
                                    placeholderTextColor={theme.colors.subtext}
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
