import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslations } from '@/hooks/useTranslations';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import type { LanguageChoice } from '@/utils/types';

const C = {
    bg: '#09090B',
    card: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
    text: '#FAFAFA',
    sub: '#A1A1AA',
    primary: '#7C3AED',
    glow: 'rgba(124,58,237,0.3)',
};

export default function AuthSelectionScreen() {
    const router = useRouter();
    const { t, languageChoice, setLanguageChoice } = useTranslations();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle="light-content" />

            {/* Language toggle */}
            <Animated.View
                entering={FadeIn.delay(100).duration(500)}
                style={{ paddingHorizontal: 24, paddingTop: 12, alignItems: 'flex-end' }}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        backgroundColor: C.card,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: C.border,
                        padding: 3,
                    }}
                >
                    {(['en', 'al'] as LanguageChoice[]).map((lang) => {
                        const active = languageChoice === lang;
                        return (
                            <TouchableOpacity
                                key={lang}
                                onPress={() => setLanguageChoice(lang)}
                                activeOpacity={0.7}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 7,
                                    borderRadius: 9,
                                    backgroundColor: active ? C.primary : 'transparent',
                                }}
                            >
                                <Text
                                    style={{
                                        color: active ? '#FFF' : C.sub,
                                        fontSize: 13,
                                        fontWeight: '600',
                                    }}
                                >
                                    {lang === 'en' ? '🇬🇧 EN' : '🇦🇱 AL'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Animated.View>

            <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 40 }}>
                {/* Brand */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.View entering={FadeIn.delay(250).duration(700)} style={{ alignItems: 'center' }}>
                        <View
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: 32,
                                backgroundColor: C.glow,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 36,
                                shadowColor: C.primary,
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.45,
                                shadowRadius: 28,
                                elevation: 16,
                            }}
                        >
                            <Image
                                source={require('@/assets/images/icon.png')}
                                style={{ width: 80, height: 80, borderRadius: 20 }}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(450).duration(600)} style={{ alignItems: 'center' }}>
                        <Text
                            style={{
                                color: C.text,
                                fontSize: 38,
                                fontWeight: '800',
                                marginBottom: 12,
                                textAlign: 'center',
                                letterSpacing: -0.5,
                            }}
                        >
                            {t.auth.welcome}
                        </Text>
                        <Text
                            style={{
                                color: C.sub,
                                fontSize: 16,
                                textAlign: 'center',
                                paddingHorizontal: 20,
                                lineHeight: 24,
                            }}
                        >
                            {t.auth.create_or_sign_in}
                        </Text>
                    </Animated.View>
                </View>

                {/* Actions */}
                <Animated.View entering={FadeInDown.delay(650).duration(600)}>
                    <TouchableOpacity
                        onPress={() => router.push('/signup')}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: C.primary,
                            paddingVertical: 18,
                            borderRadius: 16,
                            alignItems: 'center',
                            marginBottom: 12,
                            shadowColor: C.primary,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.4,
                            shadowRadius: 16,
                            elevation: 10,
                        }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 17, letterSpacing: 0.2 }}>
                            {t.auth.create_account}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/login')}
                        activeOpacity={0.85}
                        style={{
                            backgroundColor: C.card,
                            borderWidth: 1,
                            borderColor: C.border,
                            paddingVertical: 18,
                            borderRadius: 16,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: C.text, fontWeight: '600', fontSize: 17 }}>
                            {t.auth.sign_in}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}
