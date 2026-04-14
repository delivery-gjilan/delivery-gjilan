import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Order, ADD_TIME_PRESETS } from './types';

interface AddTimeModalProps {
    order: Order | null;
    amount: number;
    customTime: string;
    onClose: () => void;
    onSelectAmount: (amount: number) => void;
    onChangeCustomTime: (value: string) => void;
    onConfirm: () => void;
}

export function AddTimeModal({
    order,
    amount,
    customTime,
    onClose,
    onSelectAmount,
    onChangeCustomTime,
    onConfirm,
}: AddTimeModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            visible={!!order}
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
                    <View className="p-5 border-b border-gray-700 items-center">
                        <View className="w-14 h-14 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#f59e0b22' }}>
                            <Ionicons name="add-circle-outline" size={28} color="#f59e0b" />
                        </View>
                        <Text className="text-text font-bold text-xl mb-1">
                            {t('orders.add_time_title', 'Extend Preparation Time')}
                        </Text>
                        {order && (
                            <Text className="text-subtext text-sm">
                                #{order.displayId} · {t('orders.prep_time', 'Preparation Time')}: {order.preparationMinutes ?? 0} min
                            </Text>
                        )}
                        <Text className="text-subtext text-sm text-center mt-1">
                            {t('orders.add_time_subtext', 'How many extra minutes does this order need?')}
                        </Text>
                    </View>

                    <View className="p-5 pt-4 flex-row flex-wrap justify-center gap-2">
                        {ADD_TIME_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset}
                                className="px-4 py-2.5 rounded-xl"
                                style={{
                                    backgroundColor: amount === preset ? '#f59e0b' : '#374151',
                                    minWidth: 72,
                                    alignItems: 'center',
                                }}
                                onPress={() => onSelectAmount(preset)}
                            >
                                <Text
                                    className="font-bold"
                                    style={{ color: amount === preset ? '#fff' : '#9ca3af' }}
                                >
                                    +{preset}m
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <View className="w-full mt-2">
                            <Text className="text-subtext text-sm mb-2">
                                {t('orders.custom_minutes', 'Custom minutes')}
                            </Text>
                            <TextInput
                                value={customTime}
                                onChangeText={(value) => onChangeCustomTime(value.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                                placeholder={t('orders.write_minutes', 'Write minutes...')}
                                placeholderTextColor="#6b7280"
                                className="bg-background text-text rounded-xl px-4 py-3 border border-gray-700"
                            />
                        </View>
                    </View>

                    <View className="p-5 pt-2 flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 py-3 rounded-xl bg-gray-700 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-subtext font-bold">
                                {t('common.cancel', 'Cancel')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 py-3 rounded-xl items-center"
                            style={{ backgroundColor: '#f59e0b' }}
                            onPress={onConfirm}
                        >
                            <Text className="text-white font-bold">
                                {t('orders.add_time_confirm', 'Confirm')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
