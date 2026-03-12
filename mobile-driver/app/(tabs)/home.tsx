import React from 'react';
import { View, Text, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@apollo/client/react';

import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { UPDATE_DRIVER_ONLINE_STATUS } from '@/graphql/operations/driverLocation';

export default function Home() {
  const theme = useTheme();
  const isOnline = useAuthStore((state) => state.isOnline);
  const setOnline = useAuthStore((state) => state.setOnline);
  const setUser = useAuthStore((state) => state.setUser);

  const [updateOnlineStatus, { loading: updatingStatus }] = useMutation(UPDATE_DRIVER_ONLINE_STATUS);

  const handleOnlineStatusChange = async (newStatus: boolean) => {
    try {
      setOnline(newStatus);
      const result = await updateOnlineStatus({
        variables: { isOnline: newStatus },
      });

      const updatedUser = (result.data as any)?.updateDriverOnlineStatus;
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (err) {
      setOnline(!newStatus);
      Alert.alert('Error', 'Failed to update online status. Please try again.');
      console.error('[Home] Failed to update online status:', err);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <View className="flex-1 items-center justify-center px-5">
        <View
          className="w-full rounded-3xl p-5"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isOnline ? '#22c55e' : '#ef4444' }}
              />
              <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleOnlineStatusChange}
              disabled={updatingStatus}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
