import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';

import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { GET_MY_ADDRESSES, DELETE_USER_ADDRESS, SET_DEFAULT_ADDRESS } from '@/graphql/operations/addresses';
import { toast } from '@/store/toastStore';

export default function AddressesScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();

    const { data, loading, refetch } = useQuery(GET_MY_ADDRESSES, {
        // Show cached addresses immediately; refresh in background.
        fetchPolicy: 'cache-and-network',
    });

    const [deleteAddress] = useMutation(DELETE_USER_ADDRESS, {
        onCompleted: () => {
            refetch();
            toast.success((t.addresses as any).deleted_success || 'Address deleted');
        },
        onError: () => {
            toast.error(t.common.error);
        },
    });

    const [setDefault] = useMutation(SET_DEFAULT_ADDRESS, {
        onCompleted: () => {
            refetch();
        },
        onError: () => {
            toast.error(t.common.error);
        },
    });

    const addresses = (data as any)?.myAddresses || [];

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            t.addresses.delete_title,
            `${t.addresses.delete_confirm} "${name || t.addresses.this_address}"?`,
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.common.delete,
                    style: 'destructive',
                    onPress: () => deleteAddress({ variables: { id } }),
                },
            ]
        );
    };

    const handleSetDefault = (id: string) => {
        setDefault({ variables: { id } });
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    {t.addresses.title}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                {/* Add New Address Button */}
                <TouchableOpacity
                    onPress={() => router.push('/add-address')}
                    className="flex-row items-center justify-center p-4 rounded-2xl mb-4"
                    style={{ backgroundColor: theme.colors.primary }}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                    <Text className="text-base font-semibold text-white">{t.addresses.add_new}</Text>
                </TouchableOpacity>

                {/* Address List */}
                {addresses.length === 0 ? (
                    <View className="items-center py-12">
                        <Ionicons name="location-outline" size={64} color={theme.colors.subtext} style={{ marginBottom: 16 }} />
                        <Text className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                            {t.addresses.no_addresses}
                        </Text>
                        <Text className="text-sm text-center" style={{ color: theme.colors.subtext }}>
                            {t.addresses.no_addresses_subtitle}
                        </Text>
                    </View>
                ) : (
                    addresses.map((address: any) => (
                        <View
                            key={address.id}
                            className="p-4 rounded-2xl mb-3"
                            style={{
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: address.priority === 1 ? theme.colors.primary : theme.colors.border,
                            }}
                        >
                            {/* Address Header */}
                            <View className="flex-row items-start justify-between mb-2">
                                <View className="flex-1">
                                    <View className="flex-row items-center mb-1">
                                        <Ionicons
                                            name={
                                                address.addressName?.toLowerCase().includes('home')
                                                    ? 'home'
                                                    : address.addressName?.toLowerCase().includes('work')
                                                    ? 'briefcase'
                                                    : 'location'
                                            }
                                            size={20}
                                            color={theme.colors.primary}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                                            {address.addressName || t.addresses.address_fallback}
                                        </Text>
                                        {address.priority === 1 && (
                                            <View
                                                className="px-2 py-1 rounded-full ml-2"
                                                style={{ backgroundColor: theme.colors.primary + '20' }}
                                            >
                                                <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                                                    {t.common.default}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                        {address.displayName || `${address.latitude.toFixed(6)}, ${address.longitude.toFixed(6)}`}
                                    </Text>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View className="flex-row gap-2 mt-3">
                                {address.priority !== 1 && (
                                    <TouchableOpacity
                                        onPress={() => handleSetDefault(address.id)}
                                        className="flex-1 flex-row items-center justify-center p-3 rounded-xl"
                                        style={{ backgroundColor: theme.colors.background }}
                                    >
                                        <Ionicons name="star-outline" size={18} color={theme.colors.text} style={{ marginRight: 6 }} />
                                        <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                            {t.addresses.set_default}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => router.push(`/edit-address?id=${address.id}`)}
                                    className="flex-1 flex-row items-center justify-center p-3 rounded-xl"
                                    style={{ backgroundColor: theme.colors.background }}
                                >
                                    <Ionicons name="create-outline" size={18} color={theme.colors.text} style={{ marginRight: 6 }} />
                                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                                        {t.common.edit}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDelete(address.id, address.addressName)}
                                    className="flex-row items-center justify-center p-3 rounded-xl"
                                    style={{ backgroundColor: theme.colors.expense + '20' }}
                                >
                                    <Ionicons name="trash-outline" size={18} color={theme.colors.expense} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
