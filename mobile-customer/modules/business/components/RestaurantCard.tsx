import React from 'react';
import { View, Text, TouchableOpacity, Pressable, Platform, Image, Dimensions, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useEstimatedDeliveryPrice } from '@/hooks/useEstimatedDeliveryPrice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 192; // h-48 equivalent

// Curated restaurant placeholder images from Unsplash
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', // Restaurant interior
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', // Restaurant dishes
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80', // Fine dining
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', // Food spread
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', // Delicious food
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', // Pizza
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80', // Burger
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80', // Pancakes
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', // Salad bowl
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', // Healthy food
];

// Generate consistent random image based on ID
const getPlaceholderImage = (id: string): string => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
};

interface RestaurantCardProps {
    id: string;
    name: string;
    imageUrl?: string | null;
    businessType: string;
    isOpen: boolean;
    onPress: (id: string) => void;
    locationLat: number;
    locationLng: number;
    description?: string;
    deliveryFee?: number;
    avgPrepTimeMinutes?: number | null;
    prepTimeOverrideMinutes?: number | null;
    rating?: number;
    priceRange?: string;
    discount?: number;
    isNew?: boolean;
    isSponsored?: boolean;
    activePromotion?: {
        id: string;
        name: string;
        description?: string | null;
        type: string;
        discountValue?: number | null;
    } | null;
}

export function RestaurantCard({
    id,
    name,
    imageUrl,
    businessType,
    isOpen,
    onPress,
    locationLat,
    locationLng,
    description,
    deliveryFee,
    avgPrepTimeMinutes,
    prepTimeOverrideMinutes,
    rating = 8.6,
    priceRange = '$$$$',
    discount,
    isNew,
    isSponsored,
    activePromotion,
}: RestaurantCardProps) {
    const theme = useTheme();
    const isFavorite = useFavoritesStore((state) => state.isFavorite(id));
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
    const { estimateDeliveryPrice } = useEstimatedDeliveryPrice();

    // Calculate estimated delivery price based on user's location
    const calculatedDeliveryFee = estimateDeliveryPrice(locationLat, locationLng);
    const displayDeliveryFee = deliveryFee ?? calculatedDeliveryFee;

    // Entrance animations
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

    React.useEffect(() => {
        // Stagger animation on mount
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim, slideAnim]);

    const basePrepTime =
        typeof prepTimeOverrideMinutes === 'number' && prepTimeOverrideMinutes > 0
            ? prepTimeOverrideMinutes
            : typeof avgPrepTimeMinutes === 'number' && avgPrepTimeMinutes > 0
              ? avgPrepTimeMinutes
              : null;
    const prepTimeLabel = basePrepTime ? `${basePrepTime}-${basePrepTime + 10}` : '—';

    const handleFavoritePress = () => {
        // Bounce animation on tap
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1.05,
                tension: 100,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();
        toggleFavorite(id);
    };

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            }}
        >
            <TouchableOpacity
                onPress={() => onPress(id)}
                className="mb-5"
                activeOpacity={0.95}
                style={{
                    ...(Platform.OS === 'ios' && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                    }),
                    ...(Platform.OS === 'android' && {
                        elevation: 3,
                    }),
                }}
            >
            {/* Image Container with Badges */}
            <View className="relative rounded-2xl overflow-hidden">
                {/* Restaurant Image */}
                <View className="h-48 bg-gray-800">
                    <Image
                        source={{ uri: imageUrl || getPlaceholderImage(id) }}
                        style={{ width: '100%', height: IMAGE_HEIGHT }}
                        resizeMode="cover"
                    />
                </View>

                {/* Top Left Badges */}
                <View className="absolute top-3 left-3 flex-col gap-2">
                    {activePromotion && (
                        <View className="bg-cyan-500 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5">
                            <Ionicons name="pricetag" size={14} color="black" />
                            <Text className="text-black font-semibold text-xs">
                                {activePromotion.type === 'PERCENTAGE' && activePromotion.discountValue
                                    ? `${Math.round(activePromotion.discountValue)}% Zbritje`
                                    : activePromotion.type === 'FIXED_AMOUNT' && activePromotion.discountValue
                                      ? `€${activePromotion.discountValue.toFixed(2)} Zbritje`
                                      : activePromotion.type === 'FREE_DELIVERY'
                                        ? 'Transporti Falas'
                                        : activePromotion.name}
                            </Text>
                        </View>
                    )}
                    {discount && (
                        <View className="bg-cyan-500 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5">
                            <Ionicons name="pricetag" size={14} color="black" />
                            <Text className="text-black font-semibold text-xs">-{discount}% Item Discount</Text>
                        </View>
                    )}
                    {isNew && (
                        <View className="bg-cyan-500 px-3 py-1.5 rounded-lg">
                            <Text className="text-black font-semibold text-xs">New</Text>
                        </View>
                    )}
                </View>

                {/* Favorite Heart - Top Right */}
                <Pressable
                    onPress={handleFavoritePress}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                >
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isFavorite ? '#ef4444' : '#1f2937'}
                    />
                </Pressable>

                {/* Image Carousel Dots (placeholder for multiple images) */}
                <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
                    <View className="w-1.5 h-1.5 rounded-full bg-white opacity-100" />
                    <View className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                    <View className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                    <View className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                    <View className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                </View>
            </View>

            {/* Content Section */}
            <View className="rounded-2xl mt-[-16] pt-4 px-4 pb-4" style={{ backgroundColor: theme.colors.card }}>
                {/* Restaurant Name & Delivery Time */}
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                        <Text className="text-lg font-bold" style={{ color: theme.colors.text }} numberOfLines={1}>
                            {name}
                        </Text>
                        {(description || isSponsored) && (
                            <Text className="text-sm mt-0.5" style={{ color: theme.colors.subtext }} numberOfLines={1}>
                                {description || businessType}
                                {isSponsored && ' · Sponsored'}
                            </Text>
                        )}
                    </View>

                    {/* Delivery Time Pill */}
                    <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                        <Text className="text-sm font-semibold" style={{ color: theme.colors.primary }}>
                            {prepTimeLabel} min
                        </Text>
                    </View>
                </View>

                {/* Metadata Row: Delivery Fee, Price Range, Rating */}
                <View className="flex-row items-center gap-3 mt-1">
                    {/* Delivery Fee */}
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="bicycle-outline" size={16} color={theme.colors.subtext} />
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            €{displayDeliveryFee.toFixed(2)}
                        </Text>
                    </View>

                    <Text style={{ color: theme.colors.subtext }}>•</Text>

                    {/* Price Range */}
                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                        {priceRange}
                    </Text>

                    <Text style={{ color: theme.colors.subtext }}>•</Text>

                    {/* Rating */}
                    <View className="flex-row items-center gap-1">
                        <Ionicons name="happy-outline" size={16} color={theme.colors.subtext} />
                        <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                            {rating.toFixed(1)}
                        </Text>
                    </View>
                </View>

                {/* Open/Closed Status (if closed, show it prominently) */}
                {!isOpen && (
                    <View className="mt-2 flex-row items-center">
                        <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                        <Text className="text-xs font-medium text-red-500">Currently Closed</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
        </Animated.View>
    );
}
