import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface PromotionIssueModalProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onRemovePromotion: () => void;
}

export function PromotionIssueModal({
    visible,
    title,
    message,
    onClose,
    onRemovePromotion,
}: PromotionIssueModalProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 100}
                tint={theme.dark ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={styles.overlay}
            >
                <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
                    <View style={[styles.iconWrap, { backgroundColor: theme.colors.expense + '18' }]}>
                        <Ionicons name="warning-outline" size={20} color={theme.colors.expense} />
                    </View>

                    <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: theme.colors.subtext }]}>{message}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            activeOpacity={0.75}
                            style={[styles.secondaryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.secondaryText, { color: theme.colors.subtext }]}>{t.cart.promotion_unavailable_close}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={onRemovePromotion}
                        >
                            <Text style={styles.primaryText}>{t.cart.promotion_unavailable_remove}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    card: {
        width: '100%',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 8,
    },
    message: {
        fontSize: 13,
        lineHeight: 19,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    secondaryBtn: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
    },
    secondaryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    primaryBtn: {
        flex: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
    },
    primaryText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});
