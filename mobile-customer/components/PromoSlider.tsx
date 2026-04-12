import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions, Platform, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const SLIDE_HEIGHT = Math.round(SLIDE_WIDTH * 0.56); // Taller aspect ratio
const AUTO_SCROLL_INTERVAL = 5000;

const GRADIENTS: [string, string][] = [
    ['#009de0', '#006da3'],
    ['#1a1a2e', '#0f3460'],
    ['#7209b7', '#3a0ca3'],
];

export interface PromoBanner {
    id: string;
    imageUrl?: string | null;
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

    const renderItem = ({ item, index }: { item: PromoBanner; index: number }) => {
        const hasImage = !!item.imageUrl;
        const gradientIndex = index % GRADIENTS.length;
        const gradient = GRADIENTS[gradientIndex];

        return (
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
                        borderRadius: 16,
                        overflow: 'hidden',
                        backgroundColor: theme.colors.card,
                        ...(Platform.OS === 'ios' && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.12,
                            shadowRadius: 10,
                        }),
                        ...(Platform.OS === 'android' && {
                            elevation: 4,
                        }),
                    }}
                >
                    {hasImage ? (
                        <>
                            <Image
                                source={{ uri: item.imageUrl! }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                }}
                                resizeMode="cover"
                            />
                            {/* Text overlay on image */}
                            {(item.title || item.subtitle) && (
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.75)']}
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        paddingHorizontal: 20,
                                        paddingBottom: 20,
                                        paddingTop: 48,
                                        borderBottomLeftRadius: 16,
                                        borderBottomRightRadius: 16,
                                    }}
                                >
                                    {item.title && (
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22, lineHeight: 28, maxWidth: SLIDE_WIDTH * 0.7 }}>
                                            {item.title}
                                        </Text>
                                    )}
                                    {item.subtitle && (
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500', marginTop: 4 }}>
                                            {item.subtitle}
                                        </Text>
                                    )}
                                </LinearGradient>
                            )}
                        </>
                    ) : (
                        /* Gradient card (no image) — matches web-customer style */
                        <LinearGradient
                            colors={gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                flex: 1,
                                justifyContent: 'flex-end',
                                padding: 24,
                            }}
                        >
                            {item.title && (
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 24, lineHeight: 30, maxWidth: SLIDE_WIDTH * 0.65 }}>
                                    {item.title}
                                </Text>
                            )}
                            {item.subtitle && (
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500', marginTop: 6 }}>
                                    {item.subtitle}
                                </Text>
                            )}
                        </LinearGradient>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

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

            {/* Pagination Dots — pill style (matching web-customer) */}
            {banners.length > 1 && (
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 12,
                        gap: 6,
                    }}
                >
                    {banners.map((_, index) => {
                        const isActive = index === currentIndex;
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    if (isLoopingRef.current) return;
                                    flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
                                    setCurrentIndex(index);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                style={{
                                    width: isActive ? 24 : 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: isActive ? theme.colors.primary : 'rgba(150,150,150,0.4)',
                                }}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
}
