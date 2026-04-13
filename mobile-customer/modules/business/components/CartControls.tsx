import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, BusinessType } from '@/gql/graphql';
import { useTheme } from '@/hooks/useTheme';
import { useProductInCart } from '@/modules/cart/hooks/useProductInCart';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CartControlsProps {
    product: Partial<Product>;
    businessType?: BusinessType;
}

export function CartControls({ product, businessType }: CartControlsProps) {
    const theme = useTheme();
    const { quantity, addToCart, incrementQuantity, decrementQuantity } = useProductInCart(product, businessType);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [showFloatingNumber, setShowFloatingNumber] = useState(false);
    const floatingOpacity = useRef(new Animated.Value(0)).current;
    const floatingTranslateY = useRef(new Animated.Value(0)).current;

    const triggerFloatingAnimation = () => {
        setShowFloatingNumber(true);
        floatingOpacity.setValue(1);
        floatingTranslateY.setValue(0);

        Animated.parallel([
            Animated.timing(floatingOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(floatingTranslateY, {
                toValue: -40,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowFloatingNumber(false);
        });
    };

    const handleAddPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        
        // Bounce animation
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1.2,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
        
        triggerFloatingAnimation();
        addToCart();
    };

    const handleIncrementPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        triggerFloatingAnimation();
        incrementQuantity();
    };

    const handleDecrementPress = (e: GestureResponderEvent) => {
        e.stopPropagation();
        decrementQuantity();
    };

    // Show only + button if product is not in cart
    if (quantity === 0) {
        return (
            <View>
                <AnimatedTouchable
                    onPress={handleAddPress}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ 
                        backgroundColor: theme.colors.primary,
                        transform: [{ scale: scaleAnim }]
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={24} color="#ffffff" />
                </AnimatedTouchable>
                
                {showFloatingNumber && (
                    <Animated.Text
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: -5,
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: theme.colors.primary,
                            opacity: floatingOpacity,
                            transform: [{ translateY: floatingTranslateY }],
                        }}
                    >
                        +1
                    </Animated.Text>
                )}
            </View>
        );
    }

    // Show quantity controls if product is in cart
    return (
        <View style={{ position: 'relative' }}>
            <View className="flex-row items-center bg-card border border-border rounded-full">
                <TouchableOpacity
                    onPress={handleDecrementPress}
                    className="w-9 h-9 items-center justify-center"
                    activeOpacity={0.7}
                >
                    <Ionicons name="remove" size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                <View className="px-3 min-w-[40px] items-center">
                    <Text className="text-foreground text-base font-semibold">{quantity}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleIncrementPress}
                    className="w-9 h-9 items-center justify-center"
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>
            
            {showFloatingNumber && (
                <Animated.Text
                    style={{
                        position: 'absolute',
                        top: -15,
                        right: 5,
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: theme.colors.primary,
                        opacity: floatingOpacity,
                        transform: [{ translateY: floatingTranslateY }],
                    }}
                >
                    +1
                </Animated.Text>
            )}
        </View>
    );
}
