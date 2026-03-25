import React from 'react';
import { View, Text, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.75);
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.52);

// Curated restaurant placeholder images
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
];

const getPlaceholderImage = (id: string): string => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
};

interface CompactRestaurantCardProps {
    id: string;
    name: string;
    imageUrl?: string | null;
    description?: string;
    isOpen: boolean;
    onPress: (id: string) => void;
    deliveryFee?: number;
    deliveryTime?: string;
    rating?: number;
    activePromotion?: {
        id: string;
        name: string;
        description?: string | null;
        type: string;
        discountValue?: number | null;
    } | null;
}

export const CompactRestaurantCard = React.memo(function CompactRestaurantCard({
    id,
    name,
    imageUrl,
    description,
    isOpen,
    onPress,
    deliveryFee,
    deliveryTime,
    rating,
    activePromotion,
}: CompactRestaurantCardProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <TouchableOpacity
            onPress={isOpen ? () => onPress(id) : undefined}
            disabled={!isOpen}
            activeOpacity={0.9}
            style={{
                width: CARD_WIDTH,
                marginRight: CARD_GAP,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: theme.colors.card,
                opacity: isOpen ? 1 : 0.6,
                ...(Platform.OS === 'ios' && {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                }),
                ...(Platform.OS === 'android' && {
                    elevation: 2,
                }),
            }}
        >
            {/* Image */}
            <View style={{ position: 'relative' }}>
                <Image
                    source={{ uri: imageUrl || getPlaceholderImage(id) }}
                    style={{ width: '100%', height: IMAGE_HEIGHT, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                />

                {/* Promotion Badge */}
                {activePromotion && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: theme.colors.primary,
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 5,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                        }}
                    >
                        <Ionicons name="pricetag" size={9} color="black" />
                        <Text style={{ color: 'black', fontWeight: '600', fontSize: 9 }}>
                            {activePromotion.type === 'PERCENTAGE' && activePromotion.discountValue
                                ? `-${Math.round(activePromotion.discountValue)}%`
                                : activePromotion.type === 'FIXED_AMOUNT' && activePromotion.discountValue
                                  ? `-€${activePromotion.discountValue.toFixed(2)}`
                                  : activePromotion.type === 'FREE_DELIVERY'
                                    ? t.business.free_delivery
                                    : activePromotion.type === 'SPEND_X_GET_FREE'
                                      ? t.business.free_delivery
                                      : activePromotion.type === 'SPEND_X_PERCENT' && activePromotion.discountValue
                                        ? `-${Math.round(activePromotion.discountValue)}%`
                                        : activePromotion.type === 'SPEND_X_FIXED' && activePromotion.discountValue
                                          ? `-€${activePromotion.discountValue.toFixed(2)}`
                                          : activePromotion.name}
                        </Text>
                    </View>
                )}

                {/* Closed overlay */}
                {!isOpen && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 11 }}>{t.restaurants.closed}</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
                <Text
                    style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}
                    numberOfLines={1}
                >
                    {name}
                </Text>
                {description && (
                    <Text
                        style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 2 }}
                        numberOfLines={1}
                    >
                        {description}
                    </Text>
                )}

                {/* Delivery info row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                    <Ionicons name="bicycle-outline" size={14} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                        €{(deliveryFee ?? 0).toFixed(2)}
                    </Text>
                    {deliveryTime && (
                        <>
                            <Text style={{ color: theme.colors.subtext, fontSize: 12 }}> · </Text>
                            <Ionicons name="time-outline" size={13} color={theme.colors.subtext} />
                            <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                {deliveryTime} {t.common.min}
                            </Text>
                        </>
                    )}
                    {rating != null && (
                        <>
                            <Text style={{ color: theme.colors.subtext, fontSize: 12 }}> · </Text>
                            <Ionicons name="star" size={12} color="#facc15" />
                            <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                {rating.toFixed(1)}
                            </Text>
                        </>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});
