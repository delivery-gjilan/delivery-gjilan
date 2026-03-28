import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { SignupStep } from '@/gql/graphql';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import type { Translation } from '@/localization/schema';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const getStepConfig = (t: Translation): Record<SignupStep, { number: number; title: string; description: string }> => ({
    INITIAL: { number: 1, title: t.auth.signup.step_titles.create_account, description: t.auth.signup.step_titles.create_account_desc },
    EMAIL_SENT: { number: 2, title: t.auth.signup.step_titles.verify_email, description: t.auth.signup.step_titles.verify_email_desc },
    EMAIL_VERIFIED: { number: 3, title: t.auth.signup.step_titles.add_phone, description: t.auth.signup.step_titles.add_phone_desc },
    PHONE_SENT: { number: 4, title: t.auth.signup.step_titles.verify_phone, description: t.auth.signup.step_titles.verify_phone_desc },
    COMPLETED: { number: 5, title: t.auth.signup.step_titles.complete, description: t.auth.signup.step_titles.complete_desc },
});

/* ── OTP-style code input ── */
function CodeInput({
    value,
    onChange,
    length = 6,
    theme,
    editable = true,
}: {
    value: string;
    onChange: (v: string) => void;
    length?: number;
    theme: any;
    editable?: boolean;
}) {
    const inputRef = useRef<TextInput>(null);
    const digits = value.padEnd(length, ' ').split('');

    return (
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {digits.map((digit, i) => (
                    <View
                        key={i}
                        style={{
                            width: 48,
                            height: 56,
                            borderRadius: 14,
                            backgroundColor: theme.colors.card,
                            borderWidth: 2,
                            borderColor: i === value.length ? theme.colors.primary : theme.colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '700' }}>
                            {digit.trim() ? digit : ''}
                        </Text>
                    </View>
                ))}
            </View>
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                maxLength={length}
                keyboardType="number-pad"
                editable={editable}
                style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
                autoFocus
            />
        </TouchableOpacity>
    );
}

/* ── Styled input row with icon ── */
function InputRow({
    icon,
    children,
    theme,
}: {
    icon: string;
    children: React.ReactNode;
    theme: any;
}) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 16,
                paddingHorizontal: 16,
                marginBottom: 12,
            }}
        >
            <Ionicons name={icon as any} size={20} color={theme.colors.subtext} />
            {children}
        </View>
    );
}

export default function SignupScreen() {
    const {
        user,
        initiateSignup,
        verifyEmail,
        submitPhoneNumber,
        verifyPhone,
        resendEmailVerification,
        resendPhoneVerification,
        loading: authLoading,
    } = useAuth();
    const router = useRouter();
    const { t } = useTranslations();
    const theme = useTheme();

    const STEP_CONFIG = getStepConfig(t);

    // Step 1: Account details
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2: Email verification
    const [emailCode, setEmailCode] = useState('');

    // Step 3: Phone number
    const [phoneNumber, setPhoneNumber] = useState('');

    // Step 4: Phone verification
    const [phoneCode, setPhoneCode] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentStep: SignupStep = user?.signupStep ?? SignupStep.Initial;
    const stepConfig = STEP_CONFIG[currentStep] ?? STEP_CONFIG.INITIAL;

    const TOTAL_STEPS = 4;
    const currentStepNumber = stepConfig.number;
    const progressPercent = ((currentStepNumber - 1) / (TOTAL_STEPS - 1)) * 100;

    const handleInitiateSignup = async () => {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
            setError(t.auth.signup.fill_all_fields);
            return;
        }
        if (password.length < 6) {
            setError(t.auth.signup.password_min_length);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await initiateSignup(email, password, firstName, lastName, referralCode.trim() || undefined);
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setReferralCode('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.signup.signup_failed);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!emailCode.trim()) {
            setError(t.auth.signup.enter_verification_code);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await verifyEmail(emailCode);
            setEmailCode('');
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.signup.email_verification_failed);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPhoneNumber = async () => {
        if (!phoneNumber.trim()) {
            setError(t.auth.signup.enter_phone);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await submitPhoneNumber(phoneNumber);
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.signup.phone_submit_failed);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPhone = async () => {
        if (!phoneCode.trim()) {
            setError(t.auth.signup.enter_verification_code);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await verifyPhone(phoneCode);
            setPhoneCode('');
            setTimeout(() => {
                router.replace('/brand-splash');
            }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.signup.phone_verification_failed);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        flex: 1,
        paddingVertical: 16,
        marginLeft: 12,
        fontSize: 16,
        color: theme.colors.text,
    } as const;

    /* ── Step Progress Bar ── */
    const StepProgressBar = () => {
        const steps = [
            { label: t.auth.signup.steps.account },
            { label: t.auth.signup.steps.email },
            { label: t.auth.signup.steps.phone },
            { label: t.auth.signup.steps.verify },
        ];

        return (
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                {/* Progress track */}
                <View
                    style={{
                        height: 4,
                        backgroundColor: theme.colors.border,
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 12,
                    }}
                >
                    <View
                        style={{
                            height: 4,
                            width: `${progressPercent}%`,
                            backgroundColor: theme.colors.primary,
                            borderRadius: 2,
                        }}
                    />
                </View>
                {/* Step dots + labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {steps.map((step, index) => {
                        const isActive = currentStepNumber > index + 1;
                        const isCurrent = currentStepNumber === index + 1;
                        return (
                            <View key={index} style={{ alignItems: 'center', flex: 1 }}>
                                <View
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: isActive || isCurrent ? theme.colors.primary : theme.colors.border,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 4,
                                    }}
                                >
                                    {isActive ? (
                                        <Ionicons name="checkmark" size={14} color="white" />
                                    ) : (
                                        <Text
                                            style={{
                                                color: isCurrent ? 'white' : theme.colors.subtext,
                                                fontSize: 11,
                                                fontWeight: '700',
                                            }}
                                        >
                                            {index + 1}
                                        </Text>
                                    )}
                                </View>
                                <Text
                                    style={{
                                        color: isActive || isCurrent ? theme.colors.text : theme.colors.subtext,
                                        fontSize: 11,
                                        fontWeight: isCurrent ? '600' : '400',
                                        textAlign: 'center',
                                    }}
                                >
                                    {step.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    /* ── Action button shared component ── */
    const ActionButton = ({ onPress, label }: { onPress: () => void; label: string }) => (
        <TouchableOpacity
            onPress={onPress}
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
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>{label}</Text>
            )}
        </TouchableOpacity>
    );

    /* ── Sign in link ── */
    const SignInLink = () => (
        <TouchableOpacity style={{ paddingVertical: 16, marginTop: 16 }} onPress={() => router.push('/login' as Href)}>
            <Text style={{ textAlign: 'center', color: theme.colors.subtext, fontSize: 15 }}>
                {'Already have an account? '}
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{t.auth.sign_in}</Text>
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Back button */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
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

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
                        <Animated.View entering={FadeIn.duration(400)}>
                            <Text
                                style={{
                                    color: theme.colors.text,
                                    fontSize: 28,
                                    fontWeight: '700',
                                    marginBottom: 4,
                                }}
                            >
                                {stepConfig.title}
                            </Text>
                            <Text
                                style={{
                                    color: theme.colors.subtext,
                                    fontSize: 15,
                                    lineHeight: 22,
                                }}
                            >
                                {stepConfig.description}
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Step Progress */}
                    <View style={{ marginTop: 16 }}>
                        <StepProgressBar />
                    </View>

                    {/* Form Content */}
                    <View style={{ paddingHorizontal: 24 }}>
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

                        {/* ── Step 1: Account Details ── */}
                        {currentStep === 'INITIAL' && (
                            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                                <InputRow icon="person-outline" theme={theme}>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder={t.auth.signup.first_name_placeholder}
                                        placeholderTextColor={theme.colors.subtext}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        editable={!loading}
                                        autoCapitalize="words"
                                    />
                                </InputRow>

                                <InputRow icon="person-outline" theme={theme}>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder={t.auth.signup.last_name_placeholder}
                                        placeholderTextColor={theme.colors.subtext}
                                        value={lastName}
                                        onChangeText={setLastName}
                                        editable={!loading}
                                        autoCapitalize="words"
                                    />
                                </InputRow>

                                <InputRow icon="mail-outline" theme={theme}>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder={t.auth.signup.email_placeholder}
                                        placeholderTextColor={theme.colors.subtext}
                                        value={email}
                                        onChangeText={setEmail}
                                        editable={!loading}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                    />
                                </InputRow>

                                <InputRow icon="lock-closed-outline" theme={theme}>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder={t.auth.signup.password_placeholder}
                                        placeholderTextColor={theme.colors.subtext}
                                        value={password}
                                        onChangeText={setPassword}
                                        editable={!loading}
                                        secureTextEntry={!showPassword}
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
                                </InputRow>

                                <InputRow icon="gift-outline" theme={theme}>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder={t.auth.signup.referral_code_placeholder}
                                        placeholderTextColor={theme.colors.subtext}
                                        value={referralCode}
                                        onChangeText={(text) => setReferralCode(text.toUpperCase())}
                                        editable={!loading}
                                        autoCapitalize="characters"
                                    />
                                </InputRow>
                                <Text
                                    style={{
                                        color: theme.colors.subtext,
                                        fontSize: 12,
                                        marginTop: -4,
                                        marginBottom: 20,
                                        marginLeft: 4,
                                    }}
                                >
                                    {t.auth.signup.referral_code_hint}
                                </Text>

                                <ActionButton onPress={handleInitiateSignup} label={t.common.continue} />
                                <SignInLink />
                            </Animated.View>
                        )}

                        {/* ── Step 2: Email Verification ── */}
                        {currentStep === 'EMAIL_SENT' && (
                            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                                <View
                                    style={{
                                        backgroundColor: theme.colors.primary + '12',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 24,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="mail" size={24} color={theme.colors.primary} />
                                    <Text
                                        style={{
                                            color: theme.colors.subtext,
                                            fontSize: 14,
                                            marginLeft: 12,
                                            flex: 1,
                                            lineHeight: 20,
                                        }}
                                    >
                                        {t.auth.signup.email_sent}{' '}
                                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
                                            {user?.email}
                                        </Text>
                                    </Text>
                                </View>

                                <View style={{ marginBottom: 24 }}>
                                    <Text
                                        style={{
                                            color: theme.colors.text,
                                            fontWeight: '600',
                                            fontSize: 14,
                                            marginBottom: 12,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {t.auth.signup.verification_code}
                                    </Text>
                                    <CodeInput
                                        value={emailCode}
                                        onChange={setEmailCode}
                                        theme={theme}
                                        editable={!loading}
                                    />
                                </View>

                                <ActionButton onPress={handleVerifyEmail} label={t.auth.signup.verify_email_button} />

                                <TouchableOpacity
                                    style={{ paddingVertical: 14, marginTop: 8 }}
                                    onPress={async () => {
                                        setLoading(true);
                                        try {
                                            await resendEmailVerification();
                                            setError(null);
                                        } catch (err) {
                                            setError(err instanceof Error ? err.message : t.auth.signup.resend_failed);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    <Text
                                        style={{
                                            color: theme.colors.primary,
                                            textAlign: 'center',
                                            fontWeight: '600',
                                            fontSize: 15,
                                        }}
                                    >
                                        {t.auth.signup.resend_code}
                                    </Text>
                                </TouchableOpacity>
                                <SignInLink />
                            </Animated.View>
                        )}

                        {/* ── Step 3: Phone Number ── */}
                        {currentStep === 'EMAIL_VERIFIED' && (
                            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                                <View
                                    style={{
                                        backgroundColor: theme.colors.primary + '12',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 24,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="call" size={24} color={theme.colors.primary} />
                                    <Text
                                        style={{
                                            color: theme.colors.subtext,
                                            fontSize: 14,
                                            marginLeft: 12,
                                            flex: 1,
                                            lineHeight: 20,
                                        }}
                                    >
                                        {t.auth.signup.phone_instruction}
                                    </Text>
                                </View>

                                <InputRow icon="call-outline" theme={theme}>
                                    <TextInput
                                        style={inputStyle}
                                        placeholder={t.auth.signup.phone_placeholder}
                                        placeholderTextColor={theme.colors.subtext}
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        editable={!loading}
                                        keyboardType="phone-pad"
                                        autoComplete="tel"
                                    />
                                </InputRow>

                                <View style={{ marginTop: 12 }}>
                                    <ActionButton onPress={handleSubmitPhoneNumber} label={t.common.continue} />
                                </View>
                                <SignInLink />
                            </Animated.View>
                        )}

                        {/* ── Step 4: Phone Verification ── */}
                        {currentStep === 'PHONE_SENT' && (
                            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                                <View
                                    style={{
                                        backgroundColor: theme.colors.primary + '12',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 24,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="chatbubble-ellipses" size={24} color={theme.colors.primary} />
                                    <Text
                                        style={{
                                            color: theme.colors.subtext,
                                            fontSize: 14,
                                            marginLeft: 12,
                                            flex: 1,
                                            lineHeight: 20,
                                        }}
                                    >
                                        {t.auth.signup.phone_verification_sent}{' '}
                                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
                                            {user?.phoneNumber}
                                        </Text>
                                        . {t.auth.signup.phone_verification_instruction}
                                    </Text>
                                </View>

                                <View style={{ marginBottom: 24 }}>
                                    <Text
                                        style={{
                                            color: theme.colors.text,
                                            fontWeight: '600',
                                            fontSize: 14,
                                            marginBottom: 12,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {t.auth.signup.verification_code}
                                    </Text>
                                    <CodeInput
                                        value={phoneCode}
                                        onChange={setPhoneCode}
                                        theme={theme}
                                        editable={!loading}
                                    />
                                </View>

                                <ActionButton onPress={handleVerifyPhone} label={t.auth.signup.complete_signup} />

                                <TouchableOpacity
                                    style={{ paddingVertical: 14, marginTop: 8 }}
                                    onPress={() => {
                                        resendPhoneVerification();
                                        setPhoneCode('');
                                    }}
                                    disabled={loading}
                                >
                                    <Text
                                        style={{
                                            color: theme.colors.primary,
                                            textAlign: 'center',
                                            fontWeight: '600',
                                            fontSize: 15,
                                        }}
                                    >
                                        {t.auth.signup.change_phone}
                                    </Text>
                                </TouchableOpacity>
                                <SignInLink />
                            </Animated.View>
                        )}
                    </View>

                    {/* Bottom spacing */}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
