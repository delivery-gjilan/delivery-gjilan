import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface DeliverySpeedPickerProps {
    isPriority: boolean;
    prioritySurcharge: number;
    formatCurrency: (value: number) => string;
    onSelect: (priority: boolean) => void;
    /** When true, renders without the card wrapper (for use inside a section container) */
    flat?: boolean;
}

export function DeliverySpeedPicker({ isPriority, prioritySurcharge, formatCurrency, onSelect, flat }: DeliverySpeedPickerProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    const inner = (
        <>
            {!flat && (
                <View style={styles.header}>
                    <Ionicons name="timer-outline" size={14} color={theme.colors.subtext} />
                    <Text style={[styles.headerText, { color: theme.colors.subtext }]}>{t.cart.delivery_type}</Text>
                </View>
            )}

            <View style={styles.options}>
                {/* Standard */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                        styles.option,
                        {
                            backgroundColor: !isPriority ? theme.colors.card : theme.colors.background,
                            borderColor: theme.colors.border,
                        },
                    ]}
                    onPress={() => onSelect(false)}
                >
                    <View style={styles.optionTop}>
                        <Ionicons name="time-outline" size={14} color={!isPriority ? theme.colors.primary : theme.colors.subtext} />
                        <Text style={[styles.optionTitle, { color: !isPriority ? theme.colors.text : theme.colors.subtext }]}>
                            {t.cart.standard_delivery}
                        </Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: !isPriority ? theme.colors.primary : theme.colors.subtext }]}>
                        {t.cart.included}
                    </Text>
                </TouchableOpacity>

                {/* Priority */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                        styles.option,
                        {
                            backgroundColor: isPriority ? theme.colors.card : theme.colors.background,
                            borderColor: theme.colors.border,
                        },
                    ]}
                    onPress={() => {
                        onSelect(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                >
                    <View style={styles.optionTop}>
                        <Ionicons name="flash" size={14} color={isPriority ? theme.colors.primary : theme.colors.subtext} />
                        <Text style={[styles.optionTitle, { color: isPriority ? theme.colors.text : theme.colors.subtext }]}>
                            {t.cart.priority_delivery}
                        </Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: isPriority ? theme.colors.primary : theme.colors.subtext }]}>
                        +{formatCurrency(prioritySurcharge)}
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );

    if (flat) {
        return <View>{inner}</View>;
    }

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {inner}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    headerText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    options: { flexDirection: 'row', gap: 10 },
    option: {
        flex: 1,
        borderRadius: 12,
        padding: 10,
        borderWidth: StyleSheet.hairlineWidth,
    },
    optionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    optionTitle: { fontSize: 13, fontWeight: '600' },
    optionTime: { fontSize: 11, marginBottom: 2 },
    optionPrice: { fontSize: 11, fontWeight: '600' },
});
