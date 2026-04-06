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
}

export function DeliverySpeedPicker({ isPriority, prioritySurcharge, formatCurrency, onSelect }: DeliverySpeedPickerProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.header}>
                <Ionicons name="timer-outline" size={14} color={theme.colors.subtext} />
                <Text style={[styles.headerText, { color: theme.colors.subtext }]}>{t.cart.delivery_type}</Text>
            </View>

            <View style={styles.options}>
                {/* Standard */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                        styles.option,
                        {
                            backgroundColor: !isPriority ? theme.colors.primary + '10' : theme.colors.background,
                            borderColor: !isPriority ? theme.colors.primary : theme.colors.border,
                        },
                    ]}
                    onPress={() => onSelect(false)}
                >
                    <View style={styles.optionTop}>
                        <View style={[styles.iconCircle, { backgroundColor: !isPriority ? theme.colors.primary + '18' : theme.colors.border }]}>
                            <Ionicons name="time-outline" size={14} color={!isPriority ? theme.colors.primary : theme.colors.subtext} />
                        </View>
                        <Text style={[styles.optionTitle, { color: !isPriority ? theme.colors.primary : theme.colors.text }]}>
                            {t.cart.standard_delivery}
                        </Text>
                    </View>
                    <Text style={[styles.optionTime, { color: theme.colors.subtext }]}>{t.cart.estimated_time_standard}</Text>
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
                            backgroundColor: isPriority ? theme.colors.primary + '10' : theme.colors.background,
                            borderColor: isPriority ? theme.colors.primary : theme.colors.border,
                        },
                    ]}
                    onPress={() => {
                        onSelect(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                >
                    <View style={styles.optionTop}>
                        <View style={[styles.iconCircle, { backgroundColor: isPriority ? theme.colors.primary + '18' : theme.colors.border }]}>
                            <Ionicons name="flash" size={14} color={isPriority ? theme.colors.primary : theme.colors.subtext} />
                        </View>
                        <Text style={[styles.optionTitle, { color: isPriority ? theme.colors.primary : theme.colors.text }]}>
                            {t.cart.priority_delivery}
                        </Text>
                    </View>
                    <Text style={[styles.optionTime, { color: theme.colors.subtext }]}>{t.cart.estimated_time_priority}</Text>
                    <Text style={[styles.optionPrice, { color: isPriority ? theme.colors.primary : theme.colors.subtext }]}>
                        +{formatCurrency(prioritySurcharge)}
                    </Text>
                </TouchableOpacity>
            </View>
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
        borderRadius: 14,
        padding: 12,
        borderWidth: 1.5,
    },
    optionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    iconCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    optionTitle: { fontSize: 13, fontWeight: '700' },
    optionTime: { fontSize: 11, marginBottom: 2 },
    optionPrice: { fontSize: 11, fontWeight: '600' },
});
