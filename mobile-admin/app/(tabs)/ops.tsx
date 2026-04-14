import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { deleteItemAsync } from 'expo-secure-store';
import { GET_DRIVERS } from '@/graphql/drivers';
import { ADMIN_SET_SHIFT_DRIVERS } from '@/graphql/ptt';
import { useAdminPtt } from '@/hooks/useAdminPtt';

const CHANNEL_PREFIX = 'admin-driver-ptt';

export default function OpsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { logout } = useAuthStore();

    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
    const [channelName, setChannelName] = useState(`${CHANNEL_PREFIX}-${Date.now()}`);

    const { data: driversData, refetch: refetchDrivers } = useQuery(GET_DRIVERS);
    const [setShiftDrivers, { loading: savingShift }] = useMutation(ADMIN_SET_SHIFT_DRIVERS);

    const { isTalking, isDriverTalking, pttError, startTalking, stopTalking, muteDrivers } = useAdminPtt(
        selectedDriverIds,
        channelName,
        () => setChannelName(`${CHANNEL_PREFIX}-${Date.now()}`),
    );

    const onlineDrivers = useMemo(
        () => (driversData?.drivers || []).filter((d) => d.driverConnection?.connectionStatus === 'CONNECTED'),
        [driversData],
    );

    const toggleDriver = (driverId: string) => {
        setSelectedDriverIds((prev) => (prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId]));
    };

    const handleStartPtt = async () => {
        if (selectedDriverIds.length === 0) {
            Alert.alert('Select drivers', 'Choose at least one online driver for PTT.');
            return;
        }
        try {
            await startTalking();
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error)?.message || 'Failed to start PTT');
        }
    };

    const handleStopPtt = async () => {
        try {
            await stopTalking();
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error)?.message || 'Failed to stop PTT');
        }
    };

    const handleApplyShift = async () => {
        try {
            await setShiftDrivers({ variables: { driverIds: selectedDriverIds } });
            Alert.alert('Saved', 'Shift drivers updated.');
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error)?.message || 'Failed to update shift drivers');
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Do you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    await deleteItemAsync('admin_auth_token');
                    logout();
                    router.replace('/login');
                },
            },
        ]);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
                <Text className="text-2xl font-bold mb-4" style={{ color: theme.colors.text }}>
                    Ops Center
                </Text>

                <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                        Driver PTT
                    </Text>
                    <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                        Select online drivers and control push-to-talk signaling.
                    </Text>

                    <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
                        {onlineDrivers.map((driver) => {
                            const selected = selectedDriverIds.includes(driver.id);
                            return (
                                <TouchableOpacity
                                    key={driver.id}
                                    onPress={() => toggleDriver(driver.id)}
                                    className="px-3 py-2 rounded-full"
                                    style={{
                                        backgroundColor: selected ? `${theme.colors.primary}22` : theme.colors.background,
                                        borderWidth: 1,
                                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                                    }}>
                                    <Text style={{ color: selected ? theme.colors.primary : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                        {driver.firstName} {driver.lastName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {onlineDrivers.length === 0 && (
                            <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                No drivers online.
                            </Text>
                        )}
                    </View>

                    {isDriverTalking && (
                        <View className="mt-2 rounded-lg px-3 py-2 flex-row items-center" style={{ backgroundColor: '#22c55e22' }}>
                            <Ionicons name="mic" size={12} color="#22c55e" />
                            <Text className="ml-2 text-xs font-semibold" style={{ color: '#22c55e' }}>Driver talking</Text>
                        </View>
                    )}
                    {!!pttError && (
                        <Text className="mt-2 text-xs" style={{ color: '#ef4444' }}>{pttError}</Text>
                    )}
                    <View className="flex-row mt-4" style={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={handleStartPtt}
                            disabled={isTalking}
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: isTalking ? '#166534' : '#22c55e' }}>
                            <Text className="text-white text-xs font-semibold">{isTalking ? 'Talking…' : 'Start'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleStopPtt}
                            disabled={!isTalking}
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: '#ef4444' }}>
                            <Text className="text-white text-xs font-semibold">Stop</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => muteDrivers(true)}
                            disabled={!isTalking}
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: '#f59e0b' }}>
                            <Text className="text-white text-xs font-semibold">Mute</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => muteDrivers(false)}
                            disabled={!isTalking}
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: '#3b82f6' }}>
                            <Text className="text-white text-xs font-semibold">Unmute</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                        Dispatch Admin
                    </Text>
                    <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                        New-order push notifications are enabled. Late pending alerts trigger after 15 minutes.
                    </Text>
                    <TouchableOpacity
                        className="mt-3 rounded-xl py-2.5 px-3 flex-row items-center justify-center"
                        style={{ backgroundColor: `${theme.colors.primary}18` }}
                        onPress={() => router.push('/ops-notifications')}>
                        <Ionicons name="notifications" size={14} color={theme.colors.primary} />
                        <Text className="ml-2 text-xs font-semibold" style={{ color: theme.colors.primary }}>
                            Open Notification Campaigns
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: theme.colors.card }}>
                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                        Shift Drivers
                    </Text>
                    <Text className="text-xs mt-1" style={{ color: theme.colors.subtext }}>
                        Restrict dispatch notifications to selected drivers.
                    </Text>
                    <View className="flex-row mt-3" style={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={handleApplyShift}
                            disabled={savingShift}
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: theme.colors.primary }}>
                            <Text className="text-white text-xs font-semibold">Apply Selected</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={async () => {
                                setSelectedDriverIds([]);
                                try {
                                    await setShiftDrivers({ variables: { driverIds: [] } });
                                    Alert.alert('Cleared', 'Shift restriction removed.');
                                } catch (err: unknown) {
                                    Alert.alert('Error', (err as Error)?.message || 'Failed to clear shift drivers');
                                }
                            }}
                            disabled={savingShift}
                            className="flex-1 rounded-xl py-2.5 items-center"
                            style={{ backgroundColor: '#334155' }}>
                            <Text className="text-white text-xs font-semibold">Clear Restriction</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.card }}>
                    <TouchableOpacity
                        className="rounded-xl py-2.5 items-center"
                        style={{ backgroundColor: '#ef4444' }}
                        onPress={handleLogout}>
                        <Text className="text-white text-xs font-semibold">Logout</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="mt-2 rounded-xl py-2.5 items-center"
                        style={{ backgroundColor: '#0f172a' }}
                        onPress={() => refetchDrivers()}>
                        <Text className="text-white text-xs font-semibold">Refresh Drivers</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
