import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Ionicons } from '@expo/vector-icons';
import { useEstimatedDeliveryPrice } from '@/hooks/useEstimatedDeliveryPrice';

const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
];

const getPlaceholderImage = (id: string): string => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
};

function promoLabel(promo: NonNullable<ListRestaurantCardProps['activePromotion']>, t: any): string {
    if (promo.type === 'PERCENTAGE' && promo.discountValue)
        return t.business.item_discount.replace('{{percent}}', String(Math.round(promo.discountValue)));
    if (promo.type === 'FIXED_AMOUNT' && promo.discountValue)
        return t.business.flat_discount.replace('{{amount}}', promo.discountValue.toFixed(2));
    if (promo.type === 'FREE_DELIVERY') return t.business.free_delivery;
    if (promo.type === 'SPEND_X_GET_FREE') return t.business.free_delivery;
    if (promo.type === 'SPEND_X_PERCENT' && promo.discountValue)
        return t.business.item_discount.replace('{{percent}}', String(Math.round(promo.discountValue)));
    if (promo.type === 'SPEND_X_FIXED' && promo.discountValue)
        return t.business.flat_discount.replace('{{amount}}', promo.discountValue.toFixed(2));
    return promo.name;
}

interface ListRestaurantCardProps {
    id: string;
    name: string;
    imageUrl?: string | null;
    isOpen: boolean;
    onPress: (id: string) => void;
    locationLat: number;
    locationLng: number;
    deliveryFee?: number;
    avgPrepTimeMinutes?: number | null;
    prepTimeOverrideMinutes?: number | null;
    rating?: number;
    priceRange?: string;
    distance?: number; // in km
    isSponsored?: boolean;
    activePromotion?: {
        id: string;
        name: string;
        description?: string | null;
        type: string;
        discountValue?: number | null;
    } | null;
}

export const ListRestaurantCard = React.memo(function ListRestaurantCard({
    id,
    name,
    imageUrl,
    isOpen,
    onPress,
    locationLat,
    locationLng,
    deliveryFee,
    avgPrepTimeMinutes,
    prepTimeOverrideMinutes,
    rating = 8.6,
    priceRange = '€€',
    distance = 1.3,
    isSponsored,
    activePromotion,
}: ListRestaurantCardProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const { estimateDeliveryPrice } = useEstimatedDeliveryPrice();

    const coverImage = imageUrl || getPlaceholderImage(id);
    const calculatedDeliveryFee = estimateDeliveryPrice(locationLat, locationLng);
    const displayDeliveryFee = deliveryFee ?? calculatedDeliveryFee;

    const basePrepTime =
        typeof prepTimeOverrideMinutes === 'number' && prepTimeOverrideMinutes > 0
            ? prepTimeOverrideMinutes
            : typeof avgPrepTimeMinutes === 'number' && avgPrepTimeMinutes > 0
              ? avgPrepTimeMinutes
              : 30;
    const prepTimeLabel = `${basePrepTime}–${basePrepTime + 10} ${t.common.min}`;

    return (
        <TouchableOpacity
            onPress={isOpen ? () => onPress(id) : undefined}
            disabled={!isOpen}
            activeOpacity={0.9}
            style={[
                {
                    marginHorizontal: 16,
                    marginBottom: 16,
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.card,
                },
                Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                    },
                    android: { elevation: 3 },
                }),
            ]}
        >
            {/* ── Cover image ── */}
            <View style={{ height: 168, position: 'relative' }}>
                <Image
                    source={{ uri: coverImage }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={300}
                />

                {/* Bottom gradient for text contrast */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.45)']}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }}
                />

                {/* Closed overlay */}
                {!isOpen && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.52)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.72)',
                                paddingHorizontal: 18,
                                paddingVertical: 7,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.15)',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.6 }}>
                                {t.restaurants.closed}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Promo badge — top left */}
                {activePromotion && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            backgroundColor: theme.colors.primary,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 12,
                            gap: 4,
                        }}
                    >
                        <Ionicons name="pricetag" size={10} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                            {promoLabel(activePromotion, t)}
                        </Text>
                    </View>
                )}

                {/* Sponsored badge — top left (when no promo) */}
                {isSponsored && !activePromotion && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 12,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                            {t.common.sponsored}
                        </Text>
                    </View>
                )}

                {/* Open indicator — top right */}
                {isOpen && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                            gap: 5,
                        }}
                    >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Open</Text>
                    </View>
                )}
            </View>

            {/* ── Info area ── */}
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 }}>
                {/* Name + rating */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text
                        style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 }}
                        numberOfLines={1}
                    >
                        {name}
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            backgroundColor: theme.colors.background,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                        }}
                    >
                        <Ionicons name="star" size={11} color="#FBBF24" />
                        <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                            {rating.toFixed(1)}
                        </Text>
                    </View>
                </View>

                {/* Chips row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: theme.colors.background,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 10,
                        }}
                    >
                        <Ionicons name="bicycle-outline" size={13} color={theme.colors.subtext} />
                        <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                            €{displayDeliveryFee.toFixed(2)}
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: theme.colors.background,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 10,
                        }}
                    >
                        <Ionicons name="time-outline" size={13} color={theme.colors.subtext} />
                        <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                            {prepTimeLabel}
                        </Text>
                    </View>

                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: theme.colors.background,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 10,
                        }}
                    >
                        <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                            {distance.toFixed(1)} {t.common.km}
                        </Text>
                    </View>

                    <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500', marginLeft: 2 }}>
                        {priceRange}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});
