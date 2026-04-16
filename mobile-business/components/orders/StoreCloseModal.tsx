import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface StoreCloseModalProps {
    visible: boolean;
    reason: string;
    loading: boolean;
    onClose: () => void;
    onChangeReason: (reason: string) => void;
    onConfirm: () => void;
}

export function StoreCloseModal({
    visible,
    reason,
    loading,
    onClose,
    onChangeReason,
    onConfirm,
}: StoreCloseModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                onPress={onClose}
            >
                <Pressable
                    className="bg-card rounded-3xl overflow-hidden"
                    style={{ width: '92%', maxWidth: 560 }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View className="p-5 border-b border-gray-700">
                        <Text className="text-text font-bold text-xl">
                            {t('orders.close_store', 'Close Store')}
                        </Text>
                        <Text className="text-subtext mt-1">
                            {t('orders.close_store_hint', 'Customers will see your store as closed until you reopen it.')}
                        </Text>
                    </View>

                    <View className="p-5">
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                            <Text className="text-subtext text-sm">
                                {t('orders.close_reason', 'Reason')}
                            </Text>
                            <Text className="text-gray-600 text-sm ml-1">
                                {t('common.optional', '(optional)')}
                            </Text>
                        </View>
                        <TextInput
                            value={reason}
                            onChangeText={onChangeReason}
                            placeholder={t('orders.close_reason_placeholder', 'e.g. High load, kitchen maintenance...')}
                            placeholderTextColor="#6b7280"
                            className="bg-background text-text rounded-xl px-4 py-3 border border-gray-700"
                            multiline
                        />
                    </View>

                    <View className="p-5 pt-0 flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 py-3 rounded-xl bg-gray-700 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-subtext font-bold">
                                {t('common.cancel', 'Cancel')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 py-3 rounded-xl bg-danger items-center"
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-bold">
                                    {t('orders.close_store', 'Close Store')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
