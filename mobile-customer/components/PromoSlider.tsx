import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const SLIDE_HEIGHT = Math.round(SLIDE_WIDTH * 0.56); // Taller aspect ratio
const AUTO_SCROLL_INTERVAL = 4000;

export interface PromoBanner {
    id: string;
    imageUrl: string;
    type: 'image' | 'gif';
    title?: string;
    subtitle?: string;
    onPress?: () => void;
}

interface PromoSliderProps {
    banners: PromoBanner[];
}

export function PromoSlider({ banners }: PromoSliderProps) {
    const theme = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollPausedRef = useRef(false);
    const isLoopingRef = useRef(false);

    // Create infinite scroll data (duplicate first/last items for seamless loop)
    const infiniteData = banners.length > 1 
        ? [banners[banners.length - 1], ...banners, banners[0]]
        : banners;

    // Initialize to first real item (index 1 in infinite data)
    useEffect(() => {
        if (banners.length > 1) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: 1, animated: false });
            }, 50);
        }
    }, [banners.length]);

    // Auto-scroll
    useEffect(() => {
        if (banners.length <= 1) return;

        const interval = setInterval(() => {
            if (scrollPausedRef.current || isLoopingRef.current) return;
            setCurrentIndex((prev) => {
                const next = prev + 1;
                flatListRef.current?.scrollToIndex({ index: next + 1, animated: true });
                return next % banners.length;
            });
        }, AUTO_SCROLL_INTERVAL);

        return () => clearInterval(interval);
    }, [banners.length]);

    const onScroll = useCallback((event: any) => {
        if (banners.length <= 1 || isLoopingRef.current) return;
        
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / (SLIDE_WIDTH + 16));
        
        // Handle infinite loop wrapping
        if (index === 0) {
            // At duplicate last item, jump to real last item
            isLoopingRef.current = true;
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: banners.length, animated: false });
                setCurrentIndex(banners.length - 1);
                isLoopingRef.current = false;
            }, 50);
        } else if (index === infiniteData.length - 1) {
            // At duplicate first item, jump to real first item
            isLoopingRef.current = true;
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: 1, animated: false });
                setCurrentIndex(0);
                isLoopingRef.current = false;
            }, 50);
        } else {
            setCurrentIndex(index - 1); // Adjust for offset
        }
    }, [banners.length, infiniteData.length]);

    const onScrollBeginDrag = useCallback(() => {
        scrollPausedRef.current = true;
    }, []);

    const onScrollEndDrag = useCallback(() => {
        scrollPausedRef.current = false;
    }, []);

    const renderItem = ({ item }: { item: PromoBanner }) => (
        <TouchableOpacity
            activeOpacity={0.95}
            onPress={item.onPress}
            style={{
                width: SLIDE_WIDTH,
                height: SLIDE_HEIGHT,
                marginRight: 16,
            }}
        >
            <View
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: theme.colors.card,
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
                <Image
                    source={{ uri: item.imageUrl }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    resizeMode="cover"
                />
                {/* Text overlay */}
                {(item.title || item.subtitle) && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            paddingHorizontal: 16,
                            paddingBottom: 16,
                            paddingTop: 40,
                            borderBottomLeftRadius: 8,
                            borderBottomRightRadius: 8,
                        }}
                    >
                        {item.title && (
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20, marginBottom: 2 }}>
                                {item.title}
                            </Text>
                        )}
                        {item.subtitle && (
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' }}>
                                {item.subtitle}
                            </Text>
                        )}
                    </LinearGradient>
                )}
            </View>
        </TouchableOpacity>
    );

    if (banners.length === 0) return null;

    return (
        <View>
            {/* Slider */}
            <FlatList
                ref={flatListRef}
                data={infiniteData}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                snapToInterval={SLIDE_WIDTH + 16}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 16 }}
                onScroll={onScroll}
                onScrollBeginDrag={onScrollBeginDrag}
                onScrollEndDrag={onScrollEndDrag}
                scrollEventThrottle={16}
                getItemLayout={(data, index) => ({
                    length: SLIDE_WIDTH + 16,
                    offset: (SLIDE_WIDTH + 16) * index,
                    index,
                })}
            />

            {/* Pagination Dots + Play button */}
            {banners.length > 1 && (
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 12,
                        paddingHorizontal: 16,
                    }}
                >
                    <View style={{ flex: 1 }} />
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {banners.map((_, index) => {
                            const isActive = index === currentIndex;
                            return (
                                <View
                                    key={index}
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: isActive ? theme.colors.primary : 'rgba(255,255,255,0.4)',
                                    }}
                                />
                            );
                        })}
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (isLoopingRef.current) return;
                                const nextRealIndex = (currentIndex + 1) % banners.length;
                                const nextScrollIndex = currentIndex + 2; // +1 for offset, +1 for next
                                flatListRef.current?.scrollToIndex({ index: nextScrollIndex, animated: true });
                                setCurrentIndex(nextRealIndex);
                            }}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 16, marginLeft: 2 }}>▶</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}
