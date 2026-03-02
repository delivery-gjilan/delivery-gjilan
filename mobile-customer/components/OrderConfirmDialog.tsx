import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface OrderConfirmDialogProps {
    visible: boolean;
    total: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function OrderConfirmDialog({
    visible,
    total,
    loading,
    onConfirm,
    onCancel,
}: OrderConfirmDialogProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.backdrop}>
                <View
                    style={[
                        styles.dialog,
                        {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    {/* Icon */}
                    <View
                        style={[
                            styles.iconCircle,
                            { backgroundColor: theme.colors.primary + '15' },
                        ]}
                    >
                        <Ionicons
                            name="bag-check-outline"
                            size={28}
                            color={theme.colors.primary}
                        />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {t.cart.confirm_order_title}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, { color: theme.colors.subtext }]}>
                        {t.cart.confirm_order_message.replace('{total}', total)}
                    </Text>

                    {/* Note with phone icon */}
                    <View
                        style={[
                            styles.noteBox,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        <Ionicons
                            name="call-outline"
                            size={16}
                            color={theme.colors.subtext}
                            style={{ marginTop: 2 }}
                        />
                        <Text style={[styles.noteText, { color: theme.colors.subtext }]}>
                            {t.cart.confirm_order_note}
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                { backgroundColor: theme.colors.primary },
                                loading && { opacity: 0.7 },
                            ]}
                            onPress={onConfirm}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmText}>
                                    {t.cart.confirm_order_yes}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.cancelText,
                                    { color: theme.colors.subtext },
                                ]}
                            >
                                {t.cart.confirm_order_cancel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    dialog: {
        width: '100%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 16,
    },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
        width: '100%',
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    buttons: {
        width: '100%',
        gap: 10,
    },
    confirmButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
