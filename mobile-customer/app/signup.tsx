import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SignupStep } from '@/gql/graphql';

const STEP_CONFIG: Record<SignupStep, { number: number; title: string; description: string }> = {
    INITIAL: { number: 1, title: 'Create Account', description: 'Enter your basic information' },
    EMAIL_SENT: { number: 2, title: 'Verify Email', description: 'Check your email for the verification code' },
    EMAIL_VERIFIED: { number: 3, title: 'Add Phone', description: 'Provide your phone number' },
    PHONE_SENT: { number: 4, title: 'Verify Phone', description: 'Check your SMS for the verification code' },
    COMPLETED: { number: 5, title: 'Complete', description: 'Account setup complete!' },
};

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

    // Step 1: Account details
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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
            setError('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await initiateSignup(email, password, firstName, lastName);
            // Clear form
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!emailCode.trim()) {
            setError('Please enter the verification code');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await verifyEmail(emailCode);
            setEmailCode('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Email verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPhoneNumber = async () => {
        if (!phoneNumber.trim()) {
            setError('Please enter your phone number');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await submitPhoneNumber(phoneNumber);
            // Don't clear phone number - keep it for potential resubmission
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit phone number');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPhone = async () => {
        if (!phoneCode.trim()) {
            setError('Please enter the verification code');
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
            setError(err instanceof Error ? err.message : 'Phone verification failed');
        } finally {
            setLoading(false);
        }
    };

    // Step Progress Indicator
    const StepIndicator = () => {
        const steps = [
            { num: 1, label: 'Account', key: 'INITIAL' },
            { num: 2, label: 'Email', key: 'EMAIL_SENT' },
            { num: 3, label: 'Phone', key: 'EMAIL_VERIFIED' },
            { num: 4, label: 'Verify', key: 'PHONE_SENT' },
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
                                    isActive ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <Text className={`font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                    {step.num}
                                </Text>
                            </View>
                            <Text
                                className={`text-xs mt-2 text-center ${isActive ? 'text-gray-700' : 'text-gray-400'}`}
                            >
                                {step.label}
                            </Text>
                            {index < steps.length - 1 && (
                                <View
                                    className={`absolute top-5 w-12 h-1 ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
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
        <ScrollView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 py-8">
                <Text className="text-3xl font-bold text-gray-900">{stepConfig.title}</Text>
                <Text className="text-base text-gray-600 mt-2">{stepConfig.description}</Text>
            </View>

            {/* Step Indicator */}
            <StepIndicator />

            {/* Form Content */}
            <View className="px-6 py-6">
                {/* Error Message */}
                {error && (
                    <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <Text className="text-red-600 font-medium">{error}</Text>
                    </View>
                )}

                {/* Step 1: Account Details */}
                {currentStep === 'INITIAL' && (
                    <View>
                        <View className="mb-4">
                            <Text className="text-gray-700 font-semibold mb-2">First Name</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                                placeholder="Enter your first name"
                                value={firstName}
                                onChangeText={setFirstName}
                                editable={!loading}
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-700 font-semibold mb-2">Last Name</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                                placeholder="Enter your last name"
                                value={lastName}
                                onChangeText={setLastName}
                                editable={!loading}
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-gray-700 font-semibold mb-2">Email</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                                placeholder="Enter your email"
                                value={email}
                                onChangeText={setEmail}
                                editable={!loading}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">Password</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                                placeholder="Enter your password (min 6 characters)"
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-gray-400' : 'bg-blue-600'
                            }`}
                            onPress={handleInitiateSignup}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">Continue</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 2: Email Verification */}
                {currentStep === 'EMAIL_SENT' && (
                    <View>
                        <Text className="text-gray-600 mb-4">
                            We&apos;ve sent a verification code to {user?.email}. Please check your email and enter the
                            code below.
                        </Text>

                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">Verification Code</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 
                                text-center text-xl tracking-widest"
                                placeholder="000000"
                                value={emailCode}
                                onChangeText={setEmailCode}
                                editable={!loading}
                                maxLength={6}
                                keyboardType="number-pad"
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-gray-400' : 'bg-blue-600'
                            }`}
                            onPress={handleVerifyEmail}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">Verify Email</Text>
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
                                    setError(err instanceof Error ? err.message : 'Failed to resend code');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            <Text className="text-blue-600 text-center font-semibold">Resend Code</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 3: Phone Number */}
                {currentStep === 'EMAIL_VERIFIED' && (
                    <View>
                        <Text className="text-gray-600 mb-4">
                            We need your phone number to send you verification codes and important updates.
                        </Text>

                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">Phone Number</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                                placeholder="+1 (555) 123-4567"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                editable={!loading}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-gray-400' : 'bg-blue-600'
                            }`}
                            onPress={handleSubmitPhoneNumber}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">Continue</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 4: Phone Verification */}
                {currentStep === 'PHONE_SENT' && (
                    <View>
                        <Text className="text-gray-600 mb-4">
                            We&apos;ve sent a verification code to {user?.phoneNumber}. Please check your messages and
                            enter the code below.
                        </Text>

                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2">Verification Code</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-center 
                                text-xl tracking-widest"
                                placeholder="000000"
                                value={phoneCode}
                                onChangeText={setPhoneCode}
                                editable={!loading}
                                maxLength={6}
                                keyboardType="number-pad"
                            />
                        </View>

                        <TouchableOpacity
                            className={`py-3 rounded-lg flex-row items-center justify-center ${
                                loading ? 'bg-gray-400' : 'bg-blue-600'
                            }`}
                            onPress={handleVerifyPhone}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">Complete Signup</Text>
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
                            <Text className="text-blue-600 text-center font-semibold">Change Phone Number</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
