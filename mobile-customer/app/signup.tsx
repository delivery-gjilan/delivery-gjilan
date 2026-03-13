import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { SignupStep } from '@/gql/graphql';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import type { Translation } from '@/localization/schema';

const getStepConfig = (t: Translation): Record<SignupStep, { number: number; title: string; description: string }> => ({
    INITIAL: { number: 1, title: t.auth.signup.step_titles.create_account, description: t.auth.signup.step_titles.create_account_desc },
    EMAIL_SENT: { number: 2, title: t.auth.signup.step_titles.verify_email, description: t.auth.signup.step_titles.verify_email_desc },
    EMAIL_VERIFIED: { number: 3, title: t.auth.signup.step_titles.add_phone, description: t.auth.signup.step_titles.add_phone_desc },
    PHONE_SENT: { number: 4, title: t.auth.signup.step_titles.verify_phone, description: t.auth.signup.step_titles.verify_phone_desc },
    COMPLETED: { number: 5, title: t.auth.signup.step_titles.complete, description: t.auth.signup.step_titles.complete_desc },
});

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
            // Clear form
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
            // Don't clear phone number - keep it for potential resubmission
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
            // Redirect to home on completion
            setTimeout(() => {
                router.replace('/(tabs)/home');
            }, 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : t.auth.signup.phone_verification_failed);
        } finally {
            setLoading(false);
        }
    };

    // Step Progress Indicator
    const StepIndicator = () => {
        const steps = [
            { num: 1, label: t.auth.signup.steps.account, key: 'INITIAL' },
            { num: 2, label: t.auth.signup.steps.email, key: 'EMAIL_SENT' },
            { num: 3, label: t.auth.signup.steps.phone, key: 'EMAIL_VERIFIED' },
            { num: 4, label: t.auth.signup.steps.verify, key: 'PHONE_SENT' },
        ];

        const currentStepNumber = stepConfig.number;

        return (
            <View className="flex-row justify-between px-4 py-6">
                {steps.map((step, index) => {
                    const isActive = currentStepNumber >= step.num;
                    const isCurrent = currentStepNumber === step.num;

                    return (
                        <View key={step.key} className="flex-1 items-center">
                            <View
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    isActive ? 'bg-primary' : 'bg-border'
                                }`}
                            >
                                <Text className={`font-bold ${isActive ? 'text-white' : 'text-subtext'}`}>
                                    {step.num}
                                </Text>
                            </View>
                            <Text
                                className={`text-xs mt-2 text-center ${isActive ? 'text-foreground' : 'text-subtext'}`}
                            >
                                {step.label}
                            </Text>
                            {index < steps.length - 1 && (
                                <View
                                    className={`absolute top-5 w-12 h-1 ${isActive ? 'bg-primary' : 'bg-border'}`}
                                    style={{ left: '50%', marginLeft: 20 }}
                                />
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <ScrollView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 py-8">
                <Text className="text-3xl font-bold text-foreground">{stepConfig.title}</Text>
                <Text className="text-base text-subtext mt-2">{stepConfig.description}</Text>
            </View>

            {/* Step Indicator */}
            <StepIndicator />

            {/* Form Content */}
            <View className="px-6 py-6">
                {/* Error Message */}
                {error && (
                    <View className="bg-expense/10 border border-expense/20 rounded-lg p-4 mb-6">
                        <Text className="text-expense font-medium">{error}</Text>
                    </View>
                )}

                {/* Step 1: Account Details */}
                {currentStep === 'INITIAL' && (
                    <View>
                        <View className="mb-4">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.first_name}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground"
                                placeholder={t.auth.signup.first_name_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={firstName}
                                onChangeText={setFirstName}
                                editable={!loading}
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.last_name}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground"
                                placeholder={t.auth.signup.last_name_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={lastName}
                                onChangeText={setLastName}
                                editable={!loading}
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.email_label}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground"
                                placeholder={t.auth.signup.email_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={email}
                                onChangeText={setEmail}
                                editable={!loading}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.password_label}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground"
                                placeholder={t.auth.signup.password_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                secureTextEntry
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.referral_code_label}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground"
                                placeholder={t.auth.signup.referral_code_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={referralCode}
                                onChangeText={(text) => setReferralCode(text.toUpperCase())}
                                editable={!loading}
                                autoCapitalize="characters"
                            />
                            <Text className="text-xs text-subtext mt-1">
                                {t.auth.signup.referral_code_hint}
                            </Text>
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-border' : 'bg-primary'
                            }`}
                            onPress={handleInitiateSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">{t.common.continue}</Text>
                            )}
                        </TouchableOpacity>
                        {/* Back to Login Link */}
                        <TouchableOpacity
                            className="py-4 mt-6"
                            onPress={() => {
                                router.push('/login' as Href);
                            }}
                        >
                            <Text className="text-center text-subtext">
                                {(t.auth.signup as any).already_have_account || 'Already have an account? '}
                                <Text className="text-primary font-semibold">{t.auth.sign_in}</Text>
                            </Text>
                        </TouchableOpacity>                    </View>
                )}

                {/* Step 2: Email Verification */}
                {currentStep === 'EMAIL_SENT' && (
                    <View>
                        <Text className="text-subtext mb-4">
                            {t.auth.signup.email_sent} {user?.email}. {t.auth.signup.phone_verification_instruction}
                        </Text>

                        <View className="mb-6">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.verification_code}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground 
                                text-center text-xl tracking-widest"
                                placeholder={t.auth.signup.verification_code_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={emailCode}
                                onChangeText={setEmailCode}
                                editable={!loading}
                                maxLength={6}
                                keyboardType="number-pad"
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-border' : 'bg-primary'
                            }`}
                            onPress={handleVerifyEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">{t.auth.signup.verify_email_button}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="py-3 mt-3"
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
                            <Text className="text-primary text-center font-semibold">{t.auth.signup.resend_code}</Text>
                        </TouchableOpacity>

                        {/* Back to Login Link */}
                        <TouchableOpacity
                            className="py-4 mt-6"
                            onPress={() => {
                                router.push('/login' as Href);
                            }}
                        >
                            <Text className="text-center text-subtext">
                                {(t.auth.signup as any).already_have_account || 'Already have an account? '}
                                <Text className="text-primary font-semibold">{t.auth.sign_in}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 3: Phone Number */}
                {currentStep === 'EMAIL_VERIFIED' && (
                    <View>
                        <Text className="text-subtext mb-4">
                            {t.auth.signup.phone_instruction}
                        </Text>

                        <View className="mb-6">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.phone_label}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground"
                                placeholder={t.auth.signup.phone_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                editable={!loading}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-border' : 'bg-primary'
                            }`}
                            onPress={handleSubmitPhoneNumber}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">{t.common.continue}</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to Login Link */}
                        <TouchableOpacity
                            className="py-4 mt-6"
                            onPress={() => {
                                router.push('/login' as Href);
                            }}
                        >
                            <Text className="text-center text-subtext">
                                {(t.auth.signup as any).already_have_account || 'Already have an account? '}
                                <Text className="text-primary font-semibold">{t.auth.sign_in}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 4: Phone Verification */}
                {currentStep === 'PHONE_SENT' && (
                    <View>
                        <Text className="text-subtext mb-4">
                            {t.auth.signup.phone_verification_sent} {user?.phoneNumber}. {t.auth.signup.phone_verification_instruction}
                        </Text>

                        <View className="mb-6">
                            <Text className="text-foreground font-semibold mb-2">{t.auth.signup.verification_code}</Text>
                            <TextInput
                                className="border border-border rounded-lg px-4 py-3 text-foreground text-center 
                                text-xl tracking-widest"
                                placeholder={t.auth.signup.verification_code_placeholder}
                                placeholderTextColor={theme.colors.subtext}
                                value={phoneCode}
                                onChangeText={setPhoneCode}
                                editable={!loading}
                                maxLength={6}
                                keyboardType="number-pad"
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-border' : 'bg-primary'
                            }`}
                            onPress={handleVerifyPhone}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">{t.auth.signup.complete_signup}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="py-3 mt-3"
                            onPress={() => {
                                resendPhoneVerification();
                                setPhoneCode('');
                            }}
                            disabled={loading}
                        >
                            <Text className="text-primary text-center font-semibold">{t.auth.signup.change_phone}</Text>
                        </TouchableOpacity>

                        {/* Back to Login Link */}
                        <TouchableOpacity
                            className="py-4 mt-6"
                            onPress={() => {
                                router.push('/login' as Href);
                            }}
                        >
                            <Text className="text-center text-subtext">
                                {(t.auth.signup as any).already_have_account || 'Already have an account? '}
                                <Text className="text-primary font-semibold">{t.auth.sign_in}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
