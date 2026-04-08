import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { RESET_PASSWORD_MUTATION } from '@/graphql/operations/auth';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { t } = useTranslations();
    const theme = useTheme();
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
                    {done ? (
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
                                <Ionicons name="checkmark-circle-outline" size={40} color="#22c55e" />
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
                                {t.auth.reset_password.success_title}
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
                                {t.auth.reset_password.success_message}
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
                                {t.auth.reset_password.title}
                            </Text>
                            <Text
                                style={{
                                    color: theme.colors.subtext,
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

                            {/* New password */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: theme.colors.card,
                                    borderWidth: 1.5,
                                    borderColor: theme.colors.border,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    marginBottom: 12,
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
                                        backgroundColor: 'transparent',
                                    }}
                                    placeholder={t.auth.reset_password.new_password_placeholder}
                                    placeholderTextColor={theme.colors.subtext}
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
                                        color={theme.colors.subtext}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Confirm password */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: theme.colors.card,
                                    borderWidth: 1.5,
                                    borderColor:
                                        confirmPassword.length > 0 && confirmPassword === newPassword
                                            ? '#22c55e'
                                            : theme.colors.border,
                                    borderRadius: 16,
                                    paddingHorizontal: 16,
                                    marginBottom: 24,
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
                                        backgroundColor: 'transparent',
                                    }}
                                    placeholder={t.auth.reset_password.confirm_password_placeholder}
                                    placeholderTextColor={theme.colors.subtext}
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
