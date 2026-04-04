import React, { useMemo } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { ApprovalReason } from '@/gql/graphql';

interface AwaitingApprovalModalProps {
    visible: boolean;
    onClose: () => void;
    approvalReasons?: Array<ApprovalReason | string> | null;
    locked?: boolean;
}

export default function AwaitingApprovalModal({ visible, onClose, approvalReasons, locked = false }: AwaitingApprovalModalProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const reasons = useMemo(() => {
        const mapReasonToLabel = (reason: ApprovalReason | string) => {
            switch (reason) {
                case ApprovalReason.FirstOrder:
                case 'FIRST_ORDER':
                    return t.orders.awaiting_approval_modal.reason_first_order;
                case ApprovalReason.HighValue:
                case 'HIGH_VALUE':
                    return t.orders.awaiting_approval_modal.reason_high_value;
                case ApprovalReason.OutOfZone:
                case 'OUT_OF_ZONE':
                    return t.orders.awaiting_approval_modal.reason_out_of_zone;
                default:
                    return null;
            }
        };

        const mappedReasons = (approvalReasons ?? [])
            .map(mapReasonToLabel)
            .filter((reason): reason is string => Boolean(reason));

        if (mappedReasons.length > 0) {
            return Array.from(new Set(mappedReasons));
        }

        return [
            t.orders.awaiting_approval_modal.reason_first_order,
            t.orders.awaiting_approval_modal.reason_high_value,
            t.orders.awaiting_approval_modal.reason_out_of_zone,
        ];
    }, [approvalReasons, t]);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: 'rgba(15,23,42,0.62)' }}>
                <View
                    className="w-full rounded-3xl px-6 pt-7 pb-6"
                    style={{
                        backgroundColor: theme.colors.card,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        minHeight: '72%',
                    }}
                >
                    <View className="items-center mb-4">
                        <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: '#F59E0B26' }}>
                            <Ionicons name="shield-checkmark-outline" size={30} color="#F59E0B" />
                        </View>
                    </View>

                    <Text className="text-2xl font-bold text-center" style={{ color: theme.colors.text }}>
                        {t.orders.awaiting_approval_modal.title}
                    </Text>
                    <Text className="text-base text-center mt-3" style={{ color: theme.colors.subtext }}>
                        {t.orders.awaiting_approval_modal.subtitle}
                    </Text>

                    <View className="mt-6 gap-3 flex-1">
                        {reasons.map((reason, index) => (
                            <View
                                key={`${reason}-${index}`}
                                className="flex-row items-start rounded-2xl px-4 py-4"
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#F59E0B66',
                                    backgroundColor: '#F59E0B14',
                                }}
                            >
                                <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#F59E0B' }}>
                                    <Text className="text-white font-extrabold text-sm">{index + 1}</Text>
                                </View>
                                <Text className="text-base font-semibold flex-1" style={{ color: theme.colors.text }}>
                                    {reason}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <Text className="text-sm mt-5" style={{ color: theme.colors.subtext }}>
                        {t.orders.awaiting_approval_modal.agent_call_note}
                    </Text>

                    <Pressable
                        onPress={onClose}
                        className="mt-6 py-4 rounded-2xl items-center"
                        style={{ backgroundColor: locked ? theme.colors.card : theme.colors.primary, borderWidth: locked ? 1 : 0, borderColor: theme.colors.border }}
                    >
                        <Text className="font-bold text-base" style={{ color: locked ? theme.colors.subtext : '#fff' }}>
                            {locked ? t.orders.awaiting_approval_modal.dismiss_locked ?? t.orders.awaiting_approval_modal.dismiss : t.orders.awaiting_approval_modal.dismiss}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}