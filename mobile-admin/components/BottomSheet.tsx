import React from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    snapPoints?: string[];
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
    const theme = useTheme();

    return (
        <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable className="flex-1 bg-black/40" onPress={onClose}>
                <View className="flex-1" />
                <Pressable
                    className="rounded-t-3xl max-h-[85%]"
                    style={{ backgroundColor: theme.colors.background }}
                    onPress={(e) => e.stopPropagation()}>
                    {/* Handle bar */}
                    <View className="items-center pt-3 pb-2">
                        <View className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.colors.border }} />
                    </View>

                    {/* Header */}
                    {title && (
                        <View className="flex-row items-center justify-between px-5 pb-3">
                            <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                {title}
                            </Text>
                            <TouchableOpacity onPress={onClose} hitSlop={8}>
                                <Ionicons name="close" size={24} color={theme.colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Content */}
                    <ScrollView className="px-5 pb-8" showsVerticalScrollIndicator={false}>
                        {children}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </RNModal>
    );
}
