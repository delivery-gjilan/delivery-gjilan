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
        return 'User';
    };

    const handleLogout = () => {
        logout();
    };

    const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const { businesses } = useBusinesses();

    const handleOrderHistoryPress = () => {
        router.push('/orders/history');
    };

    const ordersSubtitle =
        orders.length > 0
            ? `${orders.length} order${orders.length !== 1 ? 's' : ''}`
            : 'No orders';

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View className="px-4 pt-4 pb-6 flex-row justify-between items-center">
                    <View>
                        <Text className="text-4xl font-bold text-white">Hi {getUserName()}!</Text>
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
                            <ProfileRow title="Order history" subtitle={ordersSubtitle} onPress={handleOrderHistoryPress} />
                            <ProfileRow title="Credits" onPress={() => {}} />
                            <ProfileRow title="Buy gift card" onPress={() => {}} showDivider={false} />
                        </View>
                    </View>
                </View>

                {/* Favorites Section */}
                <View className="px-4 mb-8">
                    <Text className="text-2xl font-bold text-white mb-4">Your favorites</Text>
                    {favoriteIds.size === 0 ? (
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-4">
                                <Text className="text-sm leading-5" style={{ color: theme.colors.subtext }}>
                                    Add a restaurant to your favorites by tapping the heart icon. Your favorites will appear here!
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
                    <Text className="text-2xl font-bold text-white mb-4">Quick links</Text>
                    <View>
                        <ProfileRow title="Invite Friends" icon="gift" onPress={() => router.push('/invite-friends')} />
                        <ProfileRow title="Redeem code" onPress={() => {}} />
                        <ProfileRow title="Contact Support" onPress={() => {}} />
                        <ProfileRow title="Order history" onPress={handleOrderHistoryPress} showDivider={false} />
                    </View>
                </View>

                {/* Settings Section */}
                <View className="px-4 mb-8">
                    <Text className="text-2xl font-bold text-white mb-4">Settings</Text>
                    <View>
                        <ProfileRow title="My Addresses" icon="location" onPress={() => router.push('/addresses')} />
                        <ProfileRow title="Account" onPress={() => {}} showDivider={false} />
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
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
