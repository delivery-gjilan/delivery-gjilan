import { useMemo } from 'react';
import { View, FlatList, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useOrders } from '../hooks/useOrders';
import { Order } from '@/gql/graphql';

type StatusStyles = {
    color: string;
    background: string;
};

const getStatusStyles = (status: string, fallback: string): StatusStyles => {
    switch (status) {
        case 'PENDING':
            return { color: '#F59E0B', background: '#F59E0B20' };
        case 'PREPARING':
        case 'READY':
        case 'OUT_FOR_DELIVERY':
            return { color: '#3B82F6', background: '#3B82F620' };
        case 'DELIVERED':
            return { color: '#22C55E', background: '#22C55E20' };
        case 'CANCELLED':
            return { color: '#EF4444', background: '#EF444420' };
        default:
            return { color: fallback, background: `${fallback}20` };
    }
};

const formatOrderDate = (value?: string | null) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    
    // Show shorter format: "3 Mar" for this year, "3 Mar 2025" for other years
    const now = new Date();
    const isSameYear = parsed.getFullYear() === now.getFullYear();
    
    return parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(isSameYear ? {} : { year: 'numeric' }),
    });
};

const OrderHistoryItem = ({ order }: { order: Order }) => {
    const router = useRouter();
    const theme = useTheme();
    const status = order.status ?? 'UNKNOWN';
    const statusStyles = getStatusStyles(status, theme.colors.subtext);
    const totalItems = order.businesses.reduce(
        (sum, business) => sum + business.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
    );
    const businessesCount = order.businesses.length;
    const firstBusiness = order.businesses[0]?.business;
    const firstItem = order.businesses[0]?.items[0];

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/orders/${order.id}` as `/orders/${string}`)}
            style={{
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                marginBottom: 10,
                marginHorizontal: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.colors.border,
            }}
        >
            {/* Main Content */}
            <View style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
                {/* Order Image Preview */}
                {firstItem?.imageUrl ? (
                    <View style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        backgroundColor: theme.dark ? '#1A1A22' : '#F3F4F6',
                        overflow: 'hidden',
                        marginRight: 12,
                        position: 'relative',
                    }}>
                        <Image
                            source={{ uri: firstItem.imageUrl }}
                            style={{ width: 56, height: 56 }}
                            contentFit="cover"
                        />
                        {totalItems > 1 && (
                            <View style={{
                                position: 'absolute',
                                bottom: 4,
                                right: 4,
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                borderRadius: 8,
                                paddingHorizontal: 5,
                                paddingVertical: 2,
                            }}>
                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>+{totalItems - 1}</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        backgroundColor: statusStyles.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}>
                        <Ionicons name="restaurant" size={28} color={statusStyles.color} />
                    </View>
                )}

                {/* Order Info */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    {/* Status Badge - Smaller and more subtle */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: statusStyles.background,
                        }}>
                            <Text style={{ color: statusStyles.color, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {status.replace(/_/g, ' ')}
                            </Text>
                        </View>
                    </View>

                    {/* Business Name */}
                    <Text style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        fontWeight: '700',
                        marginBottom: 3,
                        letterSpacing: -0.2,
                    }} numberOfLines={1}>
                        {firstBusiness?.name || 'Restaurant'}
                        {businessesCount > 1 && <Text style={{ color: theme.colors.subtext, fontWeight: '500', fontSize: 14 }}> +{businessesCount - 1}</Text>}
                    </Text>

                    {/* Items and Date - More compact */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                        </Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>•</Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                            {formatOrderDate(order.orderDate)}
                        </Text>
                    </View>
                </View>

                {/* Price and Arrow - Vertical layout */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 2, letterSpacing: -0.3 }}>
                        €{order.totalPrice.toFixed(2)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600', marginRight: 2 }}>Details</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const OrderHistoryList = () => {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { orders, loading } = useOrders();

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aTime = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const bTime = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return bTime - aTime;
        });
    }, [orders]);

    if (loading && orders.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>{t.orders.order_history}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (sortedOrders.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingTop: 8 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>{t.orders.order_history}</Text>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="receipt-outline" size={80} color={theme.colors.subtext} />
                        <Text style={{ fontSize: 18, color: theme.colors.subtext, marginTop: 16, textAlign: 'center' }}>{t.orders.no_past_orders}</Text>
                        <Text style={{ fontSize: 14, color: theme.colors.subtext, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                            {t.orders.no_past_orders_subtitle}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 8, paddingHorizontal: 16 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text }}>{t.orders.order_history}</Text>
                </View>

                <FlatList
                    data={sortedOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <OrderHistoryItem order={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20, paddingTop: 4 }}
                    style={{ backgroundColor: theme.colors.background }}
                />
            </View>
        </SafeAreaView>
    );
};
