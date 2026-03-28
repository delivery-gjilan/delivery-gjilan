import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function AuthSelectionScreen() {
    const router = useRouter();
    const { t } = useTranslations();
    const theme = useTheme();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 32 }}>
                {/* Top Section - Brand */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.View entering={FadeIn.delay(200).duration(800)} style={{ alignItems: 'center' }}>
                        <View
                            style={{
                                width: 112,
                                height: 112,
                                borderRadius: 28,
                                backgroundColor: theme.colors.primary + '15',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 24,
                            }}
                        >
                            <Image
                                source={require('@/assets/images/icon.png')}
                                style={{ width: 72, height: 72, borderRadius: 16 }}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(400).duration(600)} style={{ alignItems: 'center' }}>
                        <Text
                            style={{
                                color: theme.colors.text,
                                fontSize: 34,
                                fontWeight: '700',
                                marginBottom: 8,
                                textAlign: 'center',
                            }}
                        >
                            {t.auth.welcome}
                        </Text>
                        <Text
                            style={{
                                color: theme.colors.subtext,
                                fontSize: 16,
                                textAlign: 'center',
                                paddingHorizontal: 16,
                                lineHeight: 22,
                            }}
                        >
                            {t.auth.create_or_sign_in}
                        </Text>
                    </Animated.View>
                </View>

                {/* Bottom Section - Actions */}
                <Animated.View entering={FadeInDown.delay(600).duration(600)}>
                    {/* Create Account Button */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: theme.colors.primary,
                            paddingVertical: 16,
                            borderRadius: 16,
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                        onPress={() => router.push('/signup')}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 17 }}>
                            {t.auth.create_account}
                        </Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={{
                            borderWidth: 2,
                            borderColor: theme.colors.primary,
                            paddingVertical: 16,
                            borderRadius: 16,
                            alignItems: 'center',
                            marginBottom: 12,
                        }}
                        onPress={() => router.push('/login')}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 17 }}>
                            {t.auth.sign_in}
                        </Text>
                    </TouchableOpacity>

                    {/* Guest Option */}
                    <TouchableOpacity
                        style={{ paddingVertical: 12 }}
                        onPress={() => router.replace('/(tabs)/home')}
                    >
                        <Text
                            style={{
                                color: theme.colors.subtext,
                                textAlign: 'center',
                                fontWeight: '500',
                                fontSize: 15,
                            }}
                        >
                            {t.auth.continue_as_guest}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}
