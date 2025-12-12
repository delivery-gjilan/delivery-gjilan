import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Button } from '@/components/Button';

export default function Profile() {
    const theme = useTheme();
    const { t, languageChoice, setLanguageChoice } = useTranslations();

    const toggleLanguage = () => {
        const newLang = languageChoice === 'en' ? 'al' : 'en';
        setLanguageChoice(newLang);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1 justify-center items-center px-4">
                <Text className="text-2xl font-bold mb-8" style={{ color: theme.colors.text }}>
                    {t.profile.title}
                </Text>

                <View className="w-full max-w-xs mb-8">
                    <Button
                        title={t.profile.language_toggle}
                        onPress={toggleLanguage}
                        variant="primary"
                        size="lg"
                        className="mb-2"
                    />
                    <Text className="text-sm text-center" style={{ color: theme.colors.subtext }}>
                        {t.profile.current_language}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
