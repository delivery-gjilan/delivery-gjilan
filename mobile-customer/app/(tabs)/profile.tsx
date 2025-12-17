import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Button } from '@/components/Button';

export default function Profile() {
    const theme = useTheme();
    const { languageChoice, setLanguageChoice } = useTranslations();

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: () => {
                    // TODO: Implement logout
                    Alert.alert('Logged out', 'You have been logged out.');
                },
            },
        ]);
    };

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
                    <Button
                        title="Logout"
                        onPress={handleLogout}
                        style={{
                            backgroundColor: '#ef4444',
                            marginTop: 'auto',
                            marginBottom: 20,
                        }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
