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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ETA_OPTIONS } from './types';

interface EtaModalProps {
    visible: boolean;
    selectedEta: number;
    customEta: string;
    loading: boolean;
    onClose: () => void;
    onSelectEta: (eta: number) => void;
    onChangeCustomEta: (value: string) => void;
    onConfirm: () => void;
}

export function EtaModal({
    visible,
    selectedEta,
    customEta,
    loading,
    onClose,
    onSelectEta,
    onChangeCustomEta,
    onConfirm,
}: EtaModalProps) {
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
                    style={{ width: '95%', maxWidth: 680 }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View className="p-6 pb-4 items-center border-b border-gray-700">
                        <View className="w-16 h-16 rounded-full bg-success/20 items-center justify-center mb-4">
                            <Ionicons name="time" size={32} color="#10b981" />
                        </View>
                        <Text className="text-text font-bold text-2xl mb-1">
                            {t('orders.prep_time', 'Preparation Time')}
                        </Text>
                        <Text className="text-subtext text-base text-center">
                            {t('orders.prep_time_question', 'How long will it take to prepare this order?')}
                        </Text>
                    </View>

                    <View className="p-6 pt-5 flex-row flex-wrap justify-center gap-3">
                        {ETA_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                className="py-4 px-6 rounded-2xl items-center"
                                style={{
                                    minWidth: 100,
                                    backgroundColor: selectedEta === option.value ? '#7C3AED' : '#374151',
                                }}
                                onPress={() => {
                                    onSelectEta(option.value);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text
                                    className="font-bold text-xl"
                                    style={{ color: selectedEta === option.value ? '#fff' : '#9ca3af' }}
                                >
                                    {option.value}
                                </Text>
                                <Text
                                    className="text-sm mt-0.5"
                                    style={{ color: selectedEta === option.value ? '#fff' : '#6b7280' }}
                                >
                                    {t('orders.minutes', 'minutes')}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <View className="w-full mt-2">
                            <Text className="text-subtext text-sm mb-2">
                                {t('orders.custom_minutes', 'Custom minutes')}
                            </Text>
                            <TextInput
                                value={customEta}
                                onChangeText={(value) => onChangeCustomEta(value.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                                placeholder={t('orders.write_minutes', 'Write minutes...')}
                                placeholderTextColor="#6b7280"
                                className="bg-background text-text rounded-xl px-4 py-3 border border-gray-700"
                            />
                        </View>
                    </View>

                    <View className="p-6 pt-2 flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 py-4 rounded-2xl bg-gray-700 items-center"
                            onPress={onClose}
                        >
                            <Text className="text-subtext font-bold text-base">
                                {t('common.cancel', 'Cancel')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-[2] py-4 rounded-2xl bg-success items-center flex-row justify-center"
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text className="text-white font-bold text-base ml-2">
                                        Accept — {(customEta.trim() ? customEta : String(selectedEta))} min
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
