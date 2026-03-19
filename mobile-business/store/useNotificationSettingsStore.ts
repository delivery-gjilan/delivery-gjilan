import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NotificationSettingsStore {
    pushEnabled: boolean;
    setPushEnabled: (enabled: boolean) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsStore>()(
    persist(
        (set) => ({
            pushEnabled: true,
            setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
        }),
        {
            name: 'business-notification-settings',
            storage: createJSONStorage(() => AsyncStorage),
        },
    ),
);
