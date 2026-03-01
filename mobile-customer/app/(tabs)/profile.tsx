import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { GET_ORDERS } from '@/graphql/operations/orders';
import { useQuery } from '@apollo/client/react';
import { ProfileRow } from '@/components/ProfileRow';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { useTranslations } from '@/hooks/useTranslations';

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

    const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const { businesses } = useBusinesses();
    const { t } = useTranslations();

    const handleOrderHistoryPress = () => {
        router.push('/orders/history');
    };

    const ordersSubtitle =
        orders.length > 0
            ? `${orders.length} ${orders.length !== 1 ? t.profile.order_count_plural : t.profile.order_count}`
            : t.profile.no_orders;

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View className="px-4 pt-4 pb-6 flex-row justify-between items-center">
                    <View>
                        <Text className="text-4xl font-bold text-white">{t.profile.greeting} {getUserName()}!</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#E8DCC4',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text className="text-lg font-bold text-black">{getInitials()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Ionicons name="chevron-down" size={24} color={theme.colors.subtext} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Primary Card - Important Actions */}
                <View className="px-4 mb-6">
                    <View
                        className="rounded-2xl overflow-hidden"
                        style={{
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                        }}
                    >
                        <View className="px-4">
                            <ProfileRow title={t.profile.order_history} subtitle={ordersSubtitle} onPress={handleOrderHistoryPress} />
                            <ProfileRow title={t.profile.credits} onPress={() => {}} />
                            <ProfileRow title={t.profile.buy_gift_card} onPress={() => {}} showDivider={false} />
                        </View>
                    </View>
                </View>

                {/* Favorites Section */}
                <View className="px-4 mb-8">
                    <Text className="text-2xl font-bold text-white mb-4">{t.profile.your_favorites}</Text>
                    {favoriteIds.size === 0 ? (
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-4">
                                <Text className="text-sm leading-5" style={{ color: theme.colors.subtext }}>
                                    {t.profile.favorites_empty}
                                </Text>
                            </View>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="heart-outline" size={36} color={theme.colors.subtext} />
                            </View>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {businesses
                                .filter((b) => favoriteIds.has(b.id))
                                .map((b) => (
                                    <View
                                        key={b.id}
                                        className="flex-row items-center justify-between px-4 py-3 rounded-xl"
                                        style={{ backgroundColor: theme.colors.card }}
                                    >
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                                {b.name}
                                            </Text>
                                            <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                                {b.businessType.charAt(0) + b.businessType.slice(1).toLowerCase()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => toggleFavorite(b.id)}
                                            className="ml-3 p-2"
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="heart" size={22} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                        </View>
                    )}
                </View>

                {/* Quick Links Section */}
                <View className="px-4 mb-6">
                    <Text className="text-2xl font-bold text-white mb-4">{t.profile.quick_links}</Text>
                    <View>
                        <ProfileRow title={t.profile.invite_friends} icon="gift" onPress={() => router.push('/invite-friends')} />
                        <ProfileRow title={t.profile.redeem_code} onPress={() => {}} />
                        <ProfileRow title={t.profile.contact_support} onPress={() => {}} />
                        <ProfileRow title={t.profile.order_history} onPress={handleOrderHistoryPress} showDivider={false} />
                    </View>
                </View>

                {/* Settings Section */}
                <View className="px-4 mb-8">
                    <Text className="text-2xl font-bold text-white mb-4">{t.profile.settings}</Text>
                    <View>
                        <ProfileRow title={t.profile.my_addresses} icon="location" onPress={() => router.push('/addresses')} />
                        <ProfileRow title={t.profile.account} onPress={() => {}} showDivider={false} />
                    </View>
                </View>

                {/* Logout Button */}
                <View className="px-4 pb-8">
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="py-4 rounded-xl items-center"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    >
                        <Text className="text-base font-semibold" style={{ color: '#EF4444' }}>
                            {t.profile.logout}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
