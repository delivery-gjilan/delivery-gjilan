import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

interface AuthGateProps {
    visible: boolean;
    onDismiss: () => void;
}

export default function AuthGate({ visible, onDismiss }: AuthGateProps) {
    const router = useRouter();
    const { user, needsSignupCompletion } = useAuthStore();

    const handlePrimaryAction = () => {
        onDismiss();
        if (needsSignupCompletion) {
            router.push('/signup');
        } else {
            router.push('/auth-selection');
        }
    };

    const getMessage = () => {
        if (needsSignupCompletion) {
            return {
                title: 'Complete Your Signup',
                description:
                    "You haven't finished setting up your account. Complete the signup process to start ordering!",
                primaryButton: 'Continue Signup',
                secondaryButton: 'Do It Later',
            };
        }
        return {
            title: 'Get a Better Experience',
            description: 'Sign in to save your preferences, track orders, and enjoy a personalized experience!',
            primaryButton: 'Sign In / Sign Up',
            secondaryButton: 'Continue as Guest',
        };
    };

    const message = getMessage();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <View className="flex-1 bg-black/50 items-center justify-center px-6">
                <View className="bg-white rounded-2xl p-6 w-full max-w-md">
                    {/* Icon */}
                    <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4 self-center">
                        <Text className="text-3xl">🔐</Text>
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-bold text-gray-900 text-center mb-2">{message.title}</Text>

                    {/* Description */}
                    <Text className="text-base text-gray-600 text-center mb-6">{message.description}</Text>

                    {/* Primary Button */}
                    <TouchableOpacity className="bg-blue-600 py-4 rounded-xl mb-3" onPress={handlePrimaryAction}>
                        <Text className="text-white font-semibold text-center text-base">{message.primaryButton}</Text>
                    </TouchableOpacity>

                    {/* Secondary Button */}
                    <TouchableOpacity className="py-3 rounded-xl" onPress={onDismiss}>
                        <Text className="text-gray-600 font-medium text-center text-base">
                            {message.secondaryButton}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
