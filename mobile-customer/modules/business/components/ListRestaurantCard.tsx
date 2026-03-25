import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Ionicons } from '@expo/vector-icons';
import { useEstimatedDeliveryPrice } from '@/hooks/useEstimatedDeliveryPrice';

const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
];

const getPlaceholderImage = (id: string): string => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
};

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

    const calculatedDeliveryFee = estimateDeliveryPrice(locationLat, locationLng);
    const displayDeliveryFee = deliveryFee ?? calculatedDeliveryFee;

    const basePrepTime =
        typeof prepTimeOverrideMinutes === 'number' && prepTimeOverrideMinutes > 0
            ? prepTimeOverrideMinutes
            : typeof avgPrepTimeMinutes === 'number' && avgPrepTimeMinutes > 0
              ? avgPrepTimeMinutes
              : 30;
    const prepTimeLabel = `${basePrepTime}-${basePrepTime + 10} ${t.common.min}`;

    return (
        <TouchableOpacity
            onPress={isOpen ? () => onPress(id) : undefined}
            disabled={!isOpen}
            activeOpacity={0.7}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: theme.colors.background,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
                opacity: isOpen ? 1 : 0.6,
            }}
        >
            {/* Restaurant Logo */}
            <Image
                source={{ uri: imageUrl || getPlaceholderImage(id) }}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    backgroundColor: theme.colors.card,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
            />

            {/* Content */}
            <View style={{ flex: 1, marginLeft: 12 }}>
                {/* Restaurant Name */}
                <Text
                    style={{
                        color: theme.colors.text,
                        fontSize: 16,
                        fontWeight: '600',
                        marginBottom: 4,
                    }}
                    numberOfLines={1}
                >
                    {name}
                </Text>

                {/* Metadata Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="bicycle-outline" size={14} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.subtext, fontSize: 13, marginLeft: 4 }}>
                        €{displayDeliveryFee.toFixed(2)}
                    </Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 13, marginHorizontal: 6 }}>•</Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>
                        {distance.toFixed(1)} {t.common.km}
                    </Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 13, marginHorizontal: 6 }}>•</Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>
                        {prepTimeLabel}
                    </Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 13, marginHorizontal: 6 }}>•</Text>
                    <Ionicons name="happy-outline" size={14} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.subtext, fontSize: 13, marginLeft: 2 }}>
                        {rating.toFixed(1)}
                    </Text>
                </View>

                {/* Promotion Badge */}
                {activePromotion && (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            backgroundColor: theme.colors.primary,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                            marginTop: 2,
                        }}
                    >
                        <Ionicons name="pricetag" size={11} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                            {activePromotion.type === 'PERCENTAGE' && activePromotion.discountValue
                                ? t.business.item_discount.replace('{{percent}}', String(Math.round(activePromotion.discountValue)))
                                : activePromotion.type === 'FIXED_AMOUNT' && activePromotion.discountValue
                                  ? t.business.flat_discount.replace('{{amount}}', activePromotion.discountValue.toFixed(2))
                                  : activePromotion.type === 'FREE_DELIVERY'
                                    ? t.business.free_delivery
                                    : activePromotion.type === 'SPEND_X_GET_FREE'
                                      ? t.business.free_delivery
                                      : activePromotion.type === 'SPEND_X_PERCENT' && activePromotion.discountValue
                                        ? t.business.item_discount.replace('{{percent}}', String(Math.round(activePromotion.discountValue)))
                                        : activePromotion.type === 'SPEND_X_FIXED' && activePromotion.discountValue
                                          ? t.business.flat_discount.replace('{{amount}}', activePromotion.discountValue.toFixed(2))
                                          : activePromotion.name}
                        </Text>
                    </View>
                )}

                {/* Sponsored Label */}
                {isSponsored && (
                    <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 2 }}>
                        {t.common.sponsored}
                    </Text>
                )}
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );
});
