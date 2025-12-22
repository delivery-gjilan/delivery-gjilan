import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Button } from '@/components/Button';
import { useAuth } from '@/modules/auth/hooks/useAuth';

export default function Profile() {
    const theme = useTheme();
    const { languageChoice, setLanguageChoice } = useTranslations();
    const { logout, isAuthenticated } = useAuth();

    const handleChangeLanguage = () => {
        const newLanguage = languageChoice === 'en' ? 'al' : 'en';
        setLanguageChoice(newLanguage);
        Alert.alert('Language', `Language changed to ${newLanguage === 'en' ? 'English' : 'Albanian'}`);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <View className="flex-1">
                <View className="px-4 pt-4 pb-2">
                    <Text className="text-3xl font-bold" style={{ color: theme.colors.text }}>
                        Account
                    </Text>
                </View>

                <View className="flex-1 px-4 pt-6">
                    {/* User Info Card */}
                    <View className="rounded-lg p-4 mb-6" style={{ backgroundColor: theme.colors.card }}>
                        <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                            User Account
                        </Text>
                        <Text className="text-sm mt-2" style={{ color: theme.colors.subtext }}>
                            Email: user@example.com
                        </Text>
                        <Text className="text-sm mt-1" style={{ color: theme.colors.subtext }}>
                            Phone: +1 (234) 567-8900
                        </Text>
                    </View>

                    {/* Settings */}
                    <Text className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
                        Settings
                    </Text>

                    {/* Language Button */}
                    <TouchableOpacity
                        onPress={handleChangeLanguage}
                        className="rounded-lg p-4 mb-3 flex-row justify-between items-center"
                        style={{ backgroundColor: theme.colors.card }}
                    >
                        <Text style={{ color: theme.colors.text }}>Language</Text>
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            {languageChoice === 'en' ? 'English' : 'Albanian'}
                        </Text>
                    </TouchableOpacity>

                    {/* Version */}
                    <View
                        className="rounded-lg p-4 mb-6 flex-row justify-between items-center"
                        style={{ backgroundColor: theme.colors.card }}
                    >
                        <Text style={{ color: theme.colors.text }}>App Version</Text>
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            1.0.0
                        </Text>
                    </View>

                    {/* Logout Button */}
                    {isAuthenticated && (
                        <Button
                            title="Logout"
                            onPress={logout}
                            style={{
                                backgroundColor: '#ef4444',
                                marginTop: 'auto',
                                marginBottom: 20,
                            }}
                        />
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}
