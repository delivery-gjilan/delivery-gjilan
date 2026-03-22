import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { GET_ORDERS } from '@/graphql/operations/orders';
import { useQuery, useMutation } from '@apollo/client/react';
import { ProfileRow } from '@/components/ProfileRow';
import { useAuthStore } from '@/store/authStore';
import { useTranslations } from '@/hooks/useTranslations';
import { DELETE_MY_ACCOUNT_MUTATION, SET_MY_PREFERRED_LANGUAGE_MUTATION } from '@/graphql/operations/auth';
import { AppLanguage } from '@/gql/graphql';

export default function Profile() {
    const theme = useTheme();
    const router = useRouter();
    const { logout } = useAuth();
    const user = useAuthStore((state) => state.user);
    // Read from Apollo cache only — the root subscription already keeps it fresh
    const { data: ordersData } = useQuery(GET_ORDERS, { fetchPolicy: 'cache-only' });
    const orders: any[] = (ordersData as any)?.orders ?? [];

    // Get user initials
    const getInitials = () => {
        if (!user?.email) return 'U';
        return user.email.substring(0, 2).toUpperCase();
    };

    // Get greeting name
    const getUserName = () => {
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return t.profile.user_fallback;
    };

    const handleLogout = () => {
        logout();
    };

    const [deleteMyAccount, { loading: deletingAccount }] = useMutation(DELETE_MY_ACCOUNT_MUTATION);
    const [setMyPreferredLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE_MUTATION);

    const handleDeleteAccount = () => {
        Alert.alert(
            profileText.delete_account_title || 'Delete account',
            profileText.delete_account_message || 'Are you sure you want to delete your account?',
            [
                { text: t.common?.cancel || 'Cancel', style: 'cancel' },
                {
                    text: profileText.delete_account_confirm || 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMyAccount();
                            logout();
                        } catch (error) {
                            Alert.alert(
                                t.common?.error || 'Error',
                                profileText.delete_account_error || 'Failed to delete account'
                            );
                        }
                    },
                },
            ]
        );
    };

    const { t, languageChoice, setLanguageChoice } = useTranslations();
    const profileText = t.profile as any;

    const handleLanguageChoice = async (choice: 'en' | 'al') => {
        setLanguageChoice(choice);

        try {
            await setMyPreferredLanguage({
                variables: {
                    language: choice === 'al' ? AppLanguage.Al : AppLanguage.En,
                },
            });
        } catch (error) {
            console.error('[Profile] Failed to sync language preference:', error);
        }
    };

    const handleOrderHistoryPress = () => {
        router.push('/orders/history');
    };

    const ordersSubtitle =
        orders.length > 0
            ? `${orders.length} ${orders.length !== 1 ? t.profile.order_count_plural : t.profile.order_count}`
            : t.profile.no_orders;

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View className="px-5 pt-6 pb-6">
                    <Text style={{ color: theme.colors.text, fontSize: 32, fontWeight: '700' }}>
                        Hi {getUserName()}!
                    </Text>
                </View>

                {/* Main Actions List */}
                <View className="mb-6">
                    <ProfileRow 
                        title={t.profile.order_history} 
                        subtitle={ordersSubtitle} 
                        icon="receipt-outline" 
                        onPress={handleOrderHistoryPress} 
                    />
                    <ProfileRow 
                        title={t.profile.credits} 
                        icon="wallet-outline" 
                        onPress={() => {}} 
                        showDivider={false}
                    />
                </View>

                {/* Admin Portal — only for ADMIN / SUPER_ADMIN */}
                {isAdmin && (
                    <View className="mb-6">
                        <ProfileRow
                            title="Admin Portal"
                            subtitle="Manage orders, drivers & more"
                            icon="shield-checkmark-outline"
                            onPress={() => router.push('/admin' as any)}
                            showDivider={false}
                        />
                    </View>
                )}

                {/* Language Selection */}
                <View className="px-5 mb-6">
                    <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
                        Language / Gjuha
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => handleLanguageChoice('en')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 8,
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderColor: languageChoice === 'en' ? '#22C55E' : '#2A2A2A',
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>🇬🇧</Text>
                            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                                English
                            </Text>
                            {languageChoice === 'en' && (
                                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleLanguageChoice('al')}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 8,
                                backgroundColor: 'transparent',
                                borderWidth: 1.5,
                                borderColor: languageChoice === 'al' ? '#22C55E' : '#2A2A2A',
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Text style={{ fontSize: 18 }}>🇦🇱</Text>
                            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                                Shqip
                            </Text>
                            {languageChoice === 'al' && (
                                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Links */}
                <View className="mb-6">
                    <ProfileRow title={t.profile.my_addresses} icon="location-outline" onPress={() => router.push('/addresses')} />
                    <ProfileRow title={t.profile.invite_friends} icon="gift-outline" onPress={() => router.push('/invite-friends')} />
                    <ProfileRow title={t.profile.redeem_code} icon="ticket-outline" onPress={() => {}} />
                    <ProfileRow title={t.profile.contact_support} icon="chatbubble-outline" onPress={() => {}} />
                    <ProfileRow title="🐛 Debug Notifications" icon="bug-outline" onPress={() => router.push('/debug-notifications')} showDivider={false} />
                </View>

                {/* Account Actions */}
                <View className="mb-6">
                    <ProfileRow
                        title={profileText.delete_account || 'Delete account'}
                        icon="trash-outline"
                        onPress={handleDeleteAccount}
                        showDivider={false}
                    />
                </View>

                {/* Logout Button */}
                <View className="px-5 pb-8">
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            paddingVertical: 14,
                            borderRadius: 8,
                            alignItems: 'center',
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: '#2A2A2A',
                        }}
                    >
                        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>
                            {t.profile.logout}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
