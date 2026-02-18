import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const SLIDE_HEIGHT = 180;
const AUTO_SCROLL_INTERVAL = 4000; // 4 seconds

export interface PromoBanner {
    id: string;
    imageUrl: string;
    type: 'image' | 'gif';
    onPress?: () => void;
}

interface PromoSliderProps {
    banners: PromoBanner[];
}

export function PromoSlider({ banners }: PromoSliderProps) {
    const theme = useTheme();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const scrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (banners.length <= 1 || isUserScrolling) return;

        scrollTimerRef.current = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = (prevIndex + 1) % banners.length;
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                return nextIndex;
            });
        }, AUTO_SCROLL_INTERVAL);

        return () => {
            if (scrollTimerRef.current) {
                clearInterval(scrollTimerRef.current);
            }
        };
    }, [banners.length, isUserScrolling]);

    // Handle manual scroll
    const onScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (SLIDE_WIDTH + 16));
        setCurrentIndex(index);
    };

    // Pause auto-scroll when user starts dragging
    const onScrollBeginDrag = () => {
        setIsUserScrolling(true);
        if (scrollTimerRef.current) {
            clearInterval(scrollTimerRef.current);
        }
    };

    // Resume auto-scroll after user stops dragging
    const onScrollEndDrag = () => {
        setIsUserScrolling(false);
    };

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
                    borderRadius: 16,
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
            </View>
        </TouchableOpacity>
    );

    if (banners.length === 0) return null;

    return (
        <View>
            {/* Slider */}
            <FlatList
                ref={flatListRef}
                data={banners}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
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

            {/* Pagination Dots */}
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
                            <View
                                key={index}
                                style={{
                                    width: isActive ? 20 : 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: isActive ? theme.colors.primary : theme.colors.subtext,
                                    opacity: isActive ? 1 : 0.3,
                                }}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
}
