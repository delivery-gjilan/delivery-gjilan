import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { useMutation } from '@apollo/client/react';
import { SET_MY_PREFERRED_LANGUAGE_MUTATION, DELETE_MY_ACCOUNT_MUTATION } from '@/graphql/operations/auth';

export default function Profile() {
    const theme = useTheme();
    const router = useRouter();
    const { logout } = useAuth();
    const { t, languageChoice, setLanguageChoice } = useTranslations();
    const user = useAuthStore((state) => state.user);
    const [setMyPreferredLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE_MUTATION);
    const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT_MUTATION);
    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently erase your account and all personal data. This cannot be undone.',
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMyAccount();
                            await logout();
                            router.replace('/login');
                        } catch {
                            Alert.alert(t.common.error, 'Failed to delete account. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(t.profile.logout_title, t.profile.logout_confirm, [
            { text: t.common.cancel, style: 'cancel' },
            {
                text: t.profile.logout,
                style: 'destructive',
                onPress: async () => {
                    try {
                        await logout();
                        router.replace('/login');
                    } catch {
                        Alert.alert(t.common.error, t.profile.logout_error);
                    }
                },
            },
        ]);
    };

    const toggleLanguage = async () => {
        const newLang = languageChoice === 'en' ? 'al' : 'en';
        setLanguageChoice(newLang);

        try {
            await setMyPreferredLanguage({
                variables: {
                    language: newLang === 'al' ? 'AL' : 'EN',
                },
            });
        } catch {
            setLanguageChoice(languageChoice);
            Alert.alert('Error', 'Failed to sync language preference. Please try again.');
        }
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
                            {t.profile.driver_badge}
                        </Text>
                    </View>
                </View>

                {/* Language Toggle Card */}
                <View
                    className="rounded-3xl p-5 mb-4"
                    style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                >
                    <Text className="text-xs font-semibold uppercase mb-3" style={{ color: theme.colors.subtext }}>
                        {t.profile.language_section}
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

                {/* Legal Card */}
                <View
                    className="rounded-3xl p-5 mb-4"
                    style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                >
                    <Text className="text-xs font-semibold uppercase mb-3" style={{ color: theme.colors.subtext }}>Legal</Text>
                    <Pressable onPress={() => Linking.openURL('https://zippdelivery.com/privacy')} className="flex-row items-center gap-3 py-2">
                        <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.subtext} />
                        <Text style={{ color: theme.colors.text, fontSize: 15 }}>Privacy Policy</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL('https://zippdelivery.com/terms')} className="flex-row items-center gap-3 py-2">
                        <Ionicons name="document-text-outline" size={18} color={theme.colors.subtext} />
                        <Text style={{ color: theme.colors.text, fontSize: 15 }}>Terms of Service</Text>
                    </Pressable>
                </View>

                {/* Logout Card */}
                <Pressable
                    onPress={handleLogout}
                    style={[
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                          borderRadius: 24, padding: 16, marginBottom: 4,
                          backgroundColor: theme.colors.card,
                          borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
                    ]}
                >
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '700' }}>{t.profile.logout}</Text>
                </Pressable>

                {/* Delete Account Card */}
                <Pressable
                    onPress={handleDeleteAccount}
                    style={[
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                          borderRadius: 24, padding: 16, marginBottom: 4,
                          backgroundColor: theme.colors.card,
                          borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
                    ]}
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '700' }}>Delete Account</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}
