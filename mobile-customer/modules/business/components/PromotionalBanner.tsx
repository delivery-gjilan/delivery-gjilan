import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PromotionalBannerProps {
    title: string;
    subtitle?: string;
    price?: string;
    imageUrl: string;
    businessLogo?: string | null;
    businessName?: string;
    onPress?: () => void;
}

export function PromotionalBanner({
    title,
    subtitle,
    price,
    imageUrl,
    businessLogo,
    businessName,
    onPress,
}: PromotionalBannerProps) {
    const theme = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={{
                marginHorizontal: 16,
                marginVertical: 8,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#dc2626',
            }}
        >
            <View style={{ position: 'relative', height: 180 }}>
                <Image
                    source={{ uri: imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(220, 38, 38, 0.3)',
                    }}
                />
                {/* Business Logo Circle */}
                {businessLogo && (
                    <View
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginLeft: -40,
                            marginTop: -40,
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: theme.colors.card,
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        <Image
                            source={{ uri: businessLogo }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>
                )}
                <View
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                        {price || 'Pizza 1+1 • €10,00'}
                    </Text>
                </View>
                <View
                    style={{
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        right: 16,
                    }}
                >
                    <Text
                        style={{
                            color: '#fff',
                            fontSize: 20,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            textShadowColor: 'rgba(0,0,0,0.5)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                        }}
                    >
                        {title}
                    </Text>
                    {subtitle && (
                        <Text
                            style={{
                                color: '#fff',
                                fontSize: 13,
                                marginTop: 4,
                                opacity: 0.95,
                            }}
                        >
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
