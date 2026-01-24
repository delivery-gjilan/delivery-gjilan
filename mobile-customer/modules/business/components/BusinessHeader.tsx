import React from 'react';
import { View, Text, TouchableOpacity, Platform, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Business } from '@/gql/graphql';
import { useRouter } from 'expo-router';

export function BusinessHeader({ business, scrollY }: { business: Business; scrollY?: Animated.Value }) {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Animation constants
    const HEADER_MAX_HEIGHT = 256;
    const HEADER_MIN_HEIGHT = 60 + insets.top; // Collapsed nav bar height
    const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

    // Image opacity - completely fades out
    const imageOpacity = scrollY
        ? scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
          })
        : new Animated.Value(1);

    // Image scale - zoom effect while fading
    const imageScale = scrollY
        ? scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE],
              outputRange: [1, 1.2],
              extrapolate: 'clamp',
          })
        : new Animated.Value(1);

    // Info card opacity - fades out completely
    const cardOpacity = scrollY
        ? scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE * 0.3, SCROLL_DISTANCE * 0.6],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
          })
        : new Animated.Value(1);

    // Info card scale - shrinks while fading
    const cardScale = scrollY
        ? scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE],
              outputRange: [1, 0.85],
              extrapolate: 'clamp',
          })
        : new Animated.Value(1);

    // Sticky nav bar opacity - appears when scrolled
    const navBarOpacity = scrollY
        ? scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE * 0.5, SCROLL_DISTANCE],
              outputRange: [0, 0, 1],
              extrapolate: 'clamp',
          })
        : new Animated.Value(0);

    // Nav bar title translation - slides in from bottom
    const navBarTitleTranslateY = scrollY
        ? scrollY.interpolate({
              inputRange: [0, SCROLL_DISTANCE * 0.7, SCROLL_DISTANCE],
              outputRange: [20, 10, 0],
              extrapolate: 'clamp',
          })
        : new Animated.Value(20);

    return (
        <View
            style={{
                height: HEADER_MAX_HEIGHT,
                backgroundColor: theme.colors.background,
                overflow: 'visible',
            }}
        >
            {/* Full Image Container - Fades & Scales */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: HEADER_MAX_HEIGHT,
                    opacity: imageOpacity,
                }}
            >
                <Animated.View
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: [{ scale: imageScale }],
                    }}
                >
                    {business.imageUrl ? (
                        <Image
                            source={{ uri: business.imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            className="w-full h-full items-center justify-center"
                            style={{ backgroundColor: theme.colors.card }}
                        >
                            <Ionicons name="restaurant-outline" size={64} color={theme.colors.subtext} />
                        </View>
                    )}
                </Animated.View>
            </Animated.View>

            {/* Sticky Navigation Bar - Appears on Scroll */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: HEADER_MIN_HEIGHT,
                    backgroundColor: theme.colors.card,
                    opacity: navBarOpacity,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.background,
                    paddingTop: insets.top,
                    ...(Platform.OS === 'ios' && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                    }),
                    ...(Platform.OS === 'android' && {
                        elevation: 4,
                    }),
                }}
            >
                <View className="flex-1 flex-row items-center px-4">
                    {/* Back Button in Nav */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.colors.background }}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>

                    {/* Restaurant Name - Slides In */}
                    <Animated.View
                        style={{
                            flex: 1,
                            transform: [{ translateY: navBarTitleTranslateY }],
                        }}
                    >
                        <Text
                            className="text-lg font-bold"
                            style={{ color: theme.colors.text }}
                            numberOfLines={1}
                        >
                            {business.name}
                        </Text>
                    </Animated.View>

                    {/* Status Badge in Nav */}
                    <View
                        className="px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: business.isOpen ? '#10b981' : '#ef4444' }}
                    >
                        <Text className="text-white text-xs font-semibold">
                            {business.isOpen ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Floating Back Button - Over Image (Fades with Image) */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: Math.max(insets.top + 8, 16),
                    left: 16,
                    opacity: imageOpacity,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        ...(Platform.OS === 'ios' && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                        }),
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
            </Animated.View>

            {/* Business Info Card - Fades & Shrinks on Scroll */}
            <Animated.View
                className="absolute left-4 right-4 rounded-2xl p-5"
                style={{
                    top: HEADER_MAX_HEIGHT - 40,
                    backgroundColor: theme.colors.card,
                    opacity: cardOpacity,
                    transform: [{ scale: cardScale }],
                    ...(Platform.OS === 'ios' && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 12,
                    }),
                    ...(Platform.OS === 'android' && {
                        elevation: 4,
                    }),
                }}
            >
                <View className="flex-row items-start justify-between mb-3">
                    <Text className="text-2xl font-bold flex-1 mr-3" style={{ color: theme.colors.text }}>
                        {business.name}
                    </Text>
                    <View
                        className="px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: business.isOpen ? '#10b981' : '#ef4444' }}
                    >
                        <Text className="text-white text-sm font-semibold">
                            {business.isOpen ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>

                <Text className="text-sm mb-4 capitalize" style={{ color: theme.colors.subtext }}>
                    {business.businessType.toLowerCase().replace('_', ' ')}
                </Text>

                {/* Info Row */}
                <View className="gap-3">
                    {/* Location */}
                    <View className="flex-row items-center">
                        <View
                            className="w-8 h-8 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: theme.colors.background }}
                        >
                            <Ionicons name="location" size={18} color={theme.colors.primary} />
                        </View>
                        <Text className="text-sm flex-1" style={{ color: theme.colors.text }} numberOfLines={1}>
                            {business.location.address}
                        </Text>
                    </View>

                    {/* Working Hours */}
                    <View className="flex-row items-center">
                        <View
                            className="w-8 h-8 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: theme.colors.background }}
                        >
                            <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                        </View>
                        <Text className="text-sm" style={{ color: theme.colors.text }}>
                            {business.workingHours.opensAt} - {business.workingHours.closesAt}
                        </Text>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}
