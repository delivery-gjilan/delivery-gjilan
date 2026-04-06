import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import type { SelectedAddress } from './AddressPicker';

interface SaveAddressModalProps {
    visible: boolean;
    pendingLocation: SelectedAddress | null;
    addressName: string;
    onChangeAddressName: (name: string) => void;
    saving: boolean;
    error: string | null;
    onSave: () => void;
    onSkip: () => void;
}

export function SaveAddressModal({
    visible,
    pendingLocation,
    addressName,
    onChangeAddressName,
    saving,
    error,
    onSave,
    onSkip,
}: SaveAddressModalProps) {
    const theme = useTheme();
    const { t } = useTranslations();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 100}
                tint={theme.dark ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={styles.blurContainer}
            >
                <View style={[styles.modalCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.primary }]}>
                    {/* Accent bar */}
                    <View style={[styles.accentBar, { backgroundColor: theme.colors.primary }]} />

                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>{t.cart.save_address_title}</Text>
                            <TouchableOpacity
                                activeOpacity={0.6}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onPress={onSkip}
                                disabled={saving}
                            >
                                <Ionicons name="close" size={22} color={theme.colors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {/* Address preview */}
                        {pendingLocation && (
                            <View style={[styles.previewRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                                <View style={[styles.previewIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Ionicons name="location" size={16} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.previewText, { color: theme.colors.subtext }]} numberOfLines={2}>
                                    {pendingLocation.address}
                                </Text>
                            </View>
                        )}

                        {/* Quick-select chips */}
                        <Text style={[styles.sectionLabel, { color: theme.colors.subtext }]}>{t.cart.quick_select}</Text>
                        <View style={styles.chips}>
                            {([
                                { key: 'Home', icon: 'home' as const, label: t.cart.home },
                                { key: 'Work', icon: 'briefcase' as const, label: t.cart.work },
                            ]).map(({ key, icon, label }) => {
                                const active = addressName === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.chip,
                                            {
                                                backgroundColor: active ? theme.colors.primary : theme.colors.background,
                                                borderColor: active ? theme.colors.primary : theme.colors.border,
                                            },
                                        ]}
                                        onPress={() => onChangeAddressName(key)}
                                    >
                                        <Ionicons
                                            name={active ? icon : (`${icon}-outline` as any)}
                                            size={14}
                                            color={active ? '#fff' : theme.colors.subtext}
                                        />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.colors.subtext }}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom name */}
                        <TextInput
                            style={[
                                styles.nameInput,
                                {
                                    backgroundColor: theme.colors.background,
                                    borderColor: addressName && addressName !== 'Home' && addressName !== 'Work' ? theme.colors.primary : theme.colors.border,
                                    color: theme.colors.text,
                                },
                            ]}
                            placeholder={t.cart.custom_name_placeholder}
                            placeholderTextColor={theme.colors.subtext + '80'}
                            value={addressName !== 'Home' && addressName !== 'Work' ? addressName : ''}
                            onChangeText={onChangeAddressName}
                            onFocus={() => {
                                if (addressName === 'Home' || addressName === 'Work') onChangeAddressName('');
                            }}
                        />

                        {/* Error */}
                        {error && (
                            <View style={[styles.errorRow, { backgroundColor: theme.colors.expense + '10', borderColor: theme.colors.expense + '30' }]}>
                                <Ionicons name="alert-circle" size={14} color={theme.colors.expense} style={{ marginTop: 1 }} />
                                <Text style={[styles.errorText, { color: theme.colors.expense }]}>{error}</Text>
                            </View>
                        )}

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={[styles.skipBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                                onPress={onSkip}
                                disabled={saving}
                            >
                                <Text style={[styles.skipText, { color: theme.colors.subtext }]}>{t.cart.skip_save}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[
                                    styles.saveBtn,
                                    {
                                        backgroundColor: addressName.trim() ? theme.colors.primary : theme.colors.border,
                                        opacity: addressName.trim() ? 1 : 0.4,
                                    },
                                ]}
                                onPress={onSave}
                                disabled={saving || !addressName.trim()}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.saveText}>{t.cart.save_as_default}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    modalCard: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    accentBar: { height: 3 },
    content: { padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { fontSize: 17, fontWeight: '700' },

    previewRow: {
        borderRadius: 14,
        padding: 12,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    previewIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    previewText: { flex: 1, fontSize: 13, lineHeight: 18 },

    sectionLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
    },

    nameInput: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        marginBottom: 20,
        fontSize: 13,
        borderWidth: 1.5,
    },

    errorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    errorText: { fontSize: 11, flex: 1, lineHeight: 16 },

    actions: { flexDirection: 'row', gap: 12 },
    skipBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    skipText: { fontWeight: '600', fontSize: 13 },
    saveBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
    },
    saveText: { color: 'white', fontWeight: '700', fontSize: 13 },
});
