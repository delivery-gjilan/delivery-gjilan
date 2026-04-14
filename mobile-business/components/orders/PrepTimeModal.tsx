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
import { PREP_PRESET_OPTIONS } from './types';

interface PrepTimeModalProps {
    visible: boolean;
    selectedTime: number;
    customTime: string;
    loading: boolean;
    onClose: () => void;
    onSelectTime: (time: number) => void;
    onChangeCustomTime: (value: string) => void;
    onConfirm: () => void;
}

export function PrepTimeModal({
    visible,
    selectedTime,
    customTime,
    loading,
    onClose,
    onSelectTime,
    onChangeCustomTime,
    onConfirm,
}: PrepTimeModalProps) {
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
                            {t('orders.avg_prep_time', 'Average Preparation Time')}
                        </Text>
                        <Text className="text-subtext mt-1">
                            {t('orders.avg_prep_hint', 'Used as default when accepting new orders.')}
                        </Text>
                    </View>

                    <View className="p-5 pt-4 flex-row flex-wrap justify-center gap-2">
                        {PREP_PRESET_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                className="px-4 py-2.5 rounded-xl"
                                style={{
                                    backgroundColor: selectedTime === option ? '#3b82f6' : '#374151',
                                    minWidth: 72,
                                    alignItems: 'center',
                                }}
                                onPress={() => onSelectTime(option)}
                            >
                                <Text
                                    className="font-bold"
                                    style={{ color: selectedTime === option ? '#fff' : '#9ca3af' }}
                                >
                                    {option}m
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
                            className="flex-1 py-3 rounded-xl bg-primary items-center"
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white font-bold">
                                    {t('common.save', 'Save')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
