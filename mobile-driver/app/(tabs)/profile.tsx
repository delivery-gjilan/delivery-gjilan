import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/Button';

export default function Profile() {
    const theme = useTheme();
    const { t, languageChoice, setLanguageChoice } = useTranslations();
    const user = useAuthStore((state) => state.user);
    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    const toggleLanguage = () => {
        const newLang = languageChoice === 'en' ? 'al' : 'en';
        setLanguageChoice(newLang);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* User Info Card */}
                <View
                    className="rounded-3xl p-5 mb-4"
                    style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                >
                    <View
                        className="w-16 h-16 rounded-full items-center justify-center mb-4"
                        style={{ backgroundColor: theme.colors.primary + '20' }}
                    >
                        <Text className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                            {displayName.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                        {displayName || '—'}
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                        {user?.email ?? '—'}
                    </Text>
                    <View
                        className="mt-3 self-start px-3 py-1 rounded-full"
                        style={{ backgroundColor: theme.colors.primary + '20' }}
                    >
                        <Text className="text-xs font-semibold uppercase" style={{ color: theme.colors.primary }}>
                            Driver
                        </Text>
                    </View>
                </View>

                {/* Language Toggle Card */}
                <View
                    className="rounded-3xl p-5 mb-4"
                    style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                >
                    <Text className="text-xs font-semibold uppercase mb-3" style={{ color: theme.colors.subtext }}>
                        Language
                    </Text>
                    <Button
                        title={t.profile.language_toggle}
                        onPress={toggleLanguage}
                        variant="primary"
                        size="lg"
                        className="mb-2"
                    />
                    <Text className="text-xs text-center mt-1" style={{ color: theme.colors.subtext }}>
                        {t.profile.current_language}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
