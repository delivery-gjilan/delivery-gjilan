import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useOrder } from '../hooks/useOrders';

const fmt = (v: unknown) => {
    const n = Number(v);
    return isNaN(n) ? '0.00' : n.toFixed(2);
};

const fmtDate = (v: string | null | undefined) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

interface Props {
    orderId: string | null;
    onClose: () => void;
}

export function OrderSummarySheet({ orderId, onClose }: Props) {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { order, loading } = useOrder(orderId || '');

    const isCompleted = order?.status === 'DELIVERED';
    const origPrice = (order as any)?.originalPrice;
    const origDelivery = (order as any)?.originalDeliveryPrice;
    const paymentCollection = (order as any)?.paymentCollection;
    const orderPromotions: any[] = (order as any)?.orderPromotions ?? [];
    const totalDiscount = orderPromotions.reduce(
        (sum: number, p: any) => sum + Number(p.discountAmount ?? 0),
        0,
    );

    const hasItemDiscount = origPrice != null && order && origPrice > order.orderPrice;
    const hasDeliveryDiscount =
        origDelivery != null && order && origDelivery > (order.deliveryPrice ?? 0);

    const statusConfig = isCompleted
        ? { icon: 'checkmark-circle' as const, color: '#22C55E', label: t.orders.details.order_delivered }
        : { icon: 'close-circle' as const, color: '#EF4444', label: t.orders.details.order_cancelled };

    const orderBusinesses = order?.businesses ?? [];

    return (
        <Modal
            visible={!!orderId}
            animationType="slide"
            transparent
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={{ flex: 1 }}>
                {/* Background overlay — tap to dismiss */}
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onPress={onClose}
                />

                {/* Sheet */}
                <View
                    style={{
                        backgroundColor: theme.colors.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: '88%',
                        paddingBottom: insets.bottom + 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -6 },
                        shadowOpacity: 0.18,
                        shadowRadius: 20,
                        elevation: 24,
                    }}
                >
                    {/* Drag handle */}
                    <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                        <View
                            style={{
                                width: 40,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: theme.colors.border,
                            }}
                        />
                    </View>

                    {loading && !order ? (
                        <View style={{ padding: 64, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : order ? (
                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                            {/* Status header */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20,
                                    paddingTop: 12,
                                    paddingBottom: 12,
                                }}
                            >
                                <View
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 26,
                                        backgroundColor: statusConfig.color + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 14,
                                    }}
                                >
                                    <Ionicons name={statusConfig.icon} size={30} color={statusConfig.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            fontWeight: '800',
                                            color: theme.colors.text,
                                            letterSpacing: -0.4,
                                        }}
                                    >
                                        {statusConfig.label}
                                    </Text>
                                    <Text
                                        style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 2 }}
                                    >
                                        {fmtDate(order.orderDate)}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={{ padding: 6 }} hitSlop={8}>
                                    <Ionicons name="close" size={22} color={theme.colors.subtext} />
                                </TouchableOpacity>
                            </View>

                            {/* Order # */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20,
                                    paddingBottom: 14,
                                }}
                            >
                                <Ionicons
                                    name="receipt-outline"
                                    size={13}
                                    color={theme.colors.subtext}
                                    style={{ marginRight: 5 }}
                                />
                                <Text
                                    style={{ fontSize: 12, color: theme.colors.subtext, fontWeight: '600' }}
                                >
                                    {t.orders.details.order_number}:{' '}
                                    #
                                    {(order as any).displayId ||
                                        order.id.slice(0, 8).toUpperCase()}
                                </Text>
                            </View>

                            {/* Items grouped by business */}
                            {orderBusinesses.map((biz, bizIdx) => (
                                <View
                                    key={bizIdx}
                                    style={{
                                        marginHorizontal: 16,
                                        marginBottom: 10,
                                        backgroundColor: theme.colors.card,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Business header */}
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 14,
                                            paddingVertical: 10,
                                            borderBottomWidth: 1,
                                            borderBottomColor: theme.colors.border + '30',
                                        }}
                                    >
                                        {biz?.business?.imageUrl ? (
                                            <Image
                                                source={{ uri: biz.business.imageUrl }}
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 8,
                                                    marginRight: 10,
                                                }}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={200}
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 8,
                                                    backgroundColor: theme.colors.primary + '20',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: 10,
                                                }}
                                            >
                                                <Ionicons
                                                    name="storefront"
                                                    size={14}
                                                    color={theme.colors.primary}
                                                />
                                            </View>
                                        )}
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: theme.colors.text,
                                            }}
                                        >
                                            {(biz?.business as any)?.name || 'Restaurant'}
                                        </Text>
                                    </View>

                                    {/* Items */}
                                    {(biz?.items ?? []).map((item: any, itemIdx: number) => (
                                        <View
                                            key={itemIdx}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                                borderTopWidth: itemIdx === 0 ? 0 : 1,
                                                borderTopColor: theme.colors.border + '20',
                                            }}
                                        >
                                            {item.imageUrl ? (
                                                <Image
                                                    source={{ uri: item.imageUrl }}
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 10,
                                                        marginRight: 12,
                                                    }}
                                                    contentFit="cover"
                                                />
                                            ) : (
                                                <View
                                                    style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 10,
                                                        backgroundColor: theme.colors.primary + '12',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: 12,
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="fast-food"
                                                        size={20}
                                                        color={theme.colors.primary}
                                                    />
                                                </View>
                                            )}

                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '600',
                                                        color: theme.colors.text,
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {item.name}
                                                </Text>
                                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                    <Text
                                                        style={{
                                                            fontSize: 11,
                                                            color: theme.colors.subtext,
                                                            marginTop: 2,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {item.selectedOptions
                                                            .map((o: any) => o.optionName)
                                                            .join(', ')}
                                                    </Text>
                                                )}
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: theme.colors.subtext,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {item.quantity} × €{fmt(item.unitPrice)}
                                                </Text>
                                            </View>

                                            <Text
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: '700',
                                                    color: theme.colors.text,
                                                    marginLeft: 8,
                                                }}
                                            >
                                                €{fmt(Number(item.unitPrice) * Number(item.quantity))}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {/* Price breakdown */}
                            <View
                                style={{
                                    marginHorizontal: 16,
                                    marginBottom: 16,
                                    backgroundColor: theme.colors.card,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    padding: 16,
                                }}
                            >
                                {/* Subtotal */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text style={{ fontSize: 14, color: theme.colors.subtext }}>
                                        {t.orders.details.subtotal}
                                    </Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {hasItemDiscount && (
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: theme.colors.subtext,
                                                    textDecorationLine: 'line-through',
                                                    marginBottom: 1,
                                                }}
                                            >
                                                €{fmt(origPrice)}
                                            </Text>
                                        )}
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '600',
                                                color: theme.colors.text,
                                            }}
                                        >
                                            €{fmt(order.orderPrice)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Delivery fee */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text style={{ fontSize: 14, color: theme.colors.subtext }}>
                                        {t.orders.details.delivery_fee}
                                    </Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {hasDeliveryDiscount && (
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: theme.colors.subtext,
                                                    textDecorationLine: 'line-through',
                                                    marginBottom: 1,
                                                }}
                                            >
                                                €{fmt(origDelivery)}
                                            </Text>
                                        )}
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '600',
                                                color: order.deliveryPrice === 0 ? '#22C55E' : theme.colors.text,
                                            }}
                                        >
                                            {order.deliveryPrice === 0
                                                ? 'Free'
                                                : `€${fmt(order.deliveryPrice ?? 0)}`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Promo savings */}
                                {totalDiscount > 0 && (
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 10,
                                            backgroundColor: '#22C55E12',
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                        }}
                                    >
                                        <View
                                            style={{ flexDirection: 'row', alignItems: 'center' }}
                                        >
                                            <Ionicons
                                                name="pricetag-outline"
                                                size={14}
                                                color="#22C55E"
                                                style={{ marginRight: 6 }}
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    color: '#22C55E',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                Promo savings
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: '#22C55E',
                                            }}
                                        >
                                            −€{fmt(totalDiscount)}
                                        </Text>
                                    </View>
                                )}

                                {/* Dashed divider */}
                                <View
                                    style={{
                                        borderTopWidth: 1,
                                        borderTopColor: theme.colors.border,
                                        borderStyle: 'dashed',
                                        marginVertical: 10,
                                    }}
                                />

                                {/* Total */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: '800',
                                            color: theme.colors.text,
                                        }}
                                    >
                                        Total
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 20,
                                            fontWeight: '900',
                                            color: theme.colors.text,
                                            letterSpacing: -0.5,
                                        }}
                                    >
                                        €{fmt(order.totalPrice)}
                                    </Text>
                                </View>

                                {/* Payment method */}
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons
                                        name={
                                            paymentCollection === 'CASH_TO_DRIVER'
                                                ? 'cash-outline'
                                                : 'card-outline'
                                        }
                                        size={16}
                                        color={theme.colors.subtext}
                                        style={{ marginRight: 7 }}
                                    />
                                    <Text
                                        style={{ fontSize: 13, color: theme.colors.subtext, fontWeight: '500' }}
                                    >
                                        {paymentCollection === 'CASH_TO_DRIVER'
                                            ? 'Cash on delivery'
                                            : 'Paid online'}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}
