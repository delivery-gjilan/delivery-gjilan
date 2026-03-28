import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import type { CartItem } from '@/modules/cart/types';

interface RepeatOrCustomizeModalProps {
    visible: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onRepeat: (cartItem: CartItem) => void;
    onCustomize: () => void;
}

export function RepeatOrCustomizeModal({
    visible,
    onClose,
    cartItems,
    onRepeat,
    onCustomize,
}: RepeatOrCustomizeModalProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 100}
                tint={theme.dark ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                className="flex-1 justify-center items-center px-5"
            >
                <View
                    className="w-full rounded-3xl overflow-hidden"
                    style={{
                        backgroundColor: theme.colors.card,
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.15,
                        shadowRadius: 24,
                        elevation: 12,
                    }}
                >
                    {/* Header accent bar */}
                    <View style={{ height: 3, backgroundColor: theme.colors.primary }} />

                    <View className="p-6">
                        {/* Top row: title + dismiss */}
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                {t.product.add_another}
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.6}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onPress={onClose}
                            >
                                <Ionicons name="close" size={22} color={theme.colors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {/* Existing configurations */}
                        {cartItems.map((item) => {
                            const optionsSummary = item.selectedOptions.map((o) => o.name).join(', ');
                            return (
                                <TouchableOpacity
                                    key={item.cartItemId}
                                    onPress={() => onRepeat(item)}
                                    activeOpacity={0.7}
                                    className="rounded-2xl p-3 mb-3 flex-row items-center"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                    }}
                                >
                                    <View
                                        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                                        style={{ backgroundColor: theme.colors.primary + '15' }}
                                    >
                                        <Ionicons name="repeat" size={18} color={theme.colors.primary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-sm font-semibold"
                                            style={{ color: theme.colors.text }}
                                        >
                                            {t.product.repeat_last}
                                        </Text>
                                        {optionsSummary ? (
                                            <Text
                                                className="text-xs mt-0.5"
                                                style={{ color: theme.colors.subtext }}
                                                numberOfLines={2}
                                            >
                                                {optionsSummary}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <View
                                        className="rounded-full px-2 py-1"
                                        style={{ backgroundColor: theme.colors.primary + '15' }}
                                    >
                                        <Text className="text-xs font-bold" style={{ color: theme.colors.primary }}>
                                            ×{item.quantity}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Divider */}
                        <View
                            style={{
                                height: 1,
                                backgroundColor: theme.colors.border,
                                marginVertical: 4,
                            }}
                        />

                        {/* Customize new */}
                        <TouchableOpacity
                            onPress={onCustomize}
                            activeOpacity={0.7}
                            className="rounded-2xl p-3 mt-3 flex-row items-center"
                            style={{
                                backgroundColor: theme.colors.primary + '10',
                                borderWidth: 1,
                                borderColor: theme.colors.primary + '30',
                            }}
                        >
                            <View
                                className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                                style={{ backgroundColor: theme.colors.primary + '20' }}
                            >
                                <Ionicons name="options" size={18} color={theme.colors.primary} />
                            </View>
                            <Text className="text-sm font-semibold" style={{ color: theme.colors.primary }}>
                                {t.product.customize_new}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}
