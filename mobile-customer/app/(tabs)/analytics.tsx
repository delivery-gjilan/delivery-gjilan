import { View, Text, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { GET_ORDERS } from '@/graphql/operations/orders';
import { useQuery } from '@apollo/client/react';
import { ProfileRow } from '@/components/ProfileRow';
import { useAuthStore } from '@/store/authStore';

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
                                backgroundColor: theme.colors.primary + '30',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text className="text-lg font-bold" style={{ color: theme.colors.primary }}>{getInitials()}</Text>
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
                            borderColor: theme.colors.border,
                        }}
                    >
                        <View className="px-4">
                            <ProfileRow title="Order history" subtitle={ordersSubtitle} onPress={handleOrderHistoryPress} />
                            {false && <ProfileRow title="Credits" onPress={() => {}} />}
                            {false && <ProfileRow title="Buy gift card" onPress={() => {}} showDivider={false} />}
                        </View>
                    </View>
                </View>

                {/* Favorites Section */}
                <View className="px-4 mb-8">
                    <Text className="text-2xl font-bold text-white mb-4">Your favorites</Text>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="text-sm leading-5" style={{ color: theme.colors.subtext }}>
                                Add a restaurant to your favorites by tapping the heart icon in the menu view. Your
                                favorites are displayed here!
                            </Text>
                        </View>
                        <View style={{ position: 'relative', width: 120, height: 120 }}>
                            <View
                                style={{
                                    width: 120,
                                    height: 120,
                                    backgroundColor: theme.colors.card,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {/* Store Icon */}
                                <View
                                    style={{
                                        width: 80,
                                        height: 60,
                                        backgroundColor: '#fff',
                                        borderRadius: 8,
                                        marginBottom: 8,
                                    }}
                                />
                                {/* Awning */}
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: 20,
                                        width: 80,
                                        height: 20,
                                        backgroundColor: theme.colors.primary,
                                        borderTopLeftRadius: 8,
                                        borderTopRightRadius: 8,
                                    }}
                                />
                            </View>
                            {/* Heart Icon */}
                            <View
                                style={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: theme.colors.expense,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="heart" size={20} color="#fff" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Links Section */}
                <View className="px-4 mb-6">
                    <Text className="text-2xl font-bold text-white mb-4">Quick links</Text>
                    <View>
                        {false && <ProfileRow title="Redeem code" onPress={() => {}} />}
                        <ProfileRow title="Contact Support" onPress={() => Linking.openURL('mailto:support@zippdelivery.com')} />
                        <ProfileRow title="Order history" onPress={handleOrderHistoryPress} showDivider={false} />
                    </View>
                </View>

                {/* Settings Section */}
                <View className="px-4 mb-8">
                    <Text className="text-2xl font-bold text-white mb-4">Settings</Text>
                    <View>
                        <ProfileRow title="My Addresses" icon="location" onPress={() => router.push('/addresses')} />
                        {false && <ProfileRow title="Account" onPress={() => {}} showDivider={false} />}
                    </View>
                </View>

                {/* Logout Button */}
                <View className="px-4 pb-8">
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="py-4 rounded-xl items-center"
                        style={{ backgroundColor: theme.colors.expense + '1A' }}
                    >
                        <Text className="text-base font-semibold" style={{ color: theme.colors.expense }}>
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
