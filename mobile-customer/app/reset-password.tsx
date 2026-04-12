import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from '@/hooks/useTranslations';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { RESET_PASSWORD_MUTATION } from '@/graphql/operations/auth';

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

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { t } = useTranslations();
    const { token } = useLocalSearchParams<{ token: string }>();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION);

    const handleReset = async () => {
        if (!token) {
            setError(t.auth.reset_password.invalid_link);
            return;
        }
        if (newPassword.length < 8) {
            setError(t.auth.reset_password.password_min_length);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t.auth.reset_password.passwords_no_match);
            return;
        }
        setError(null);
        try {
            await resetPassword({ variables: { token, newPassword } });
            setDone(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
                setError(t.auth.reset_password.invalid_link);
            } else {
                setError(t.auth.reset_password.failed);
            }
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
                    {done ? (
                        /* ── Success state ── */
                        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
                            <View
                                style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 36,
                                    backgroundColor: 'rgba(34,197,94,0.08)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20,
                                }}
                            >
                                <Ionicons name="checkmark-circle-outline" size={40} color="#22c55e" />
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
                                {t.auth.reset_password.success_title}
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
                                {t.auth.reset_password.success_message}
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
                                {t.auth.reset_password.title}
                            </Text>
                            <Text
                                style={{
                                    color: C.sub,
                                    fontSize: 15,
                                    lineHeight: 22,
                                    marginBottom: 32,
                                }}
                            >
                                {t.auth.reset_password.subtitle}
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

                            {/* New password */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: C.card,
                                    borderWidth: 1.5,
                                    borderColor: C.border,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    marginBottom: 12,
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
                                        backgroundColor: 'transparent',
                                    }}
                                    placeholder={t.auth.reset_password.new_password_placeholder}
                                    placeholderTextColor={C.sub}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    editable={!loading}
                                    secureTextEntry={!showPassword}
                                    textContentType="newPassword"
                                    autoFocus
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

                            {/* Confirm password */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: C.card,
                                    borderWidth: 1.5,
                                    borderColor:
                                        confirmPassword.length > 0 && confirmPassword === newPassword
                                            ? '#22c55e'
                                            : C.border,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    marginBottom: 24,
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
                                        backgroundColor: 'transparent',
                                    }}
                                    placeholder={t.auth.reset_password.confirm_password_placeholder}
                                    placeholderTextColor={C.sub}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    editable={!loading}
                                    secureTextEntry={!showPassword}
                                    textContentType="newPassword"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleReset}
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
                                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 }}>
                                        {t.auth.reset_password.reset_button}
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
