import { useEffect, useRef } from 'react';
import * as Battery from 'expo-battery';
import { useMutation } from '@apollo/client/react';
import { DRIVER_UPDATE_BATTERY_STATUS } from '@/graphql/operations/driverTelemetry';
import { useAuthStore } from '@/store/authStore';
import type { DriverConnection, MutationDriverUpdateBatteryStatusArgs } from '@/gql/graphql';

const BATTERY_REPORT_INTERVAL_MS = 5 * 60 * 1000;

export function useDriverBatteryReporting() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [sendBatteryStatus] = useMutation<{ driverUpdateBatteryStatus: DriverConnection }, MutationDriverUpdateBatteryStatusArgs>(DRIVER_UPDATE_BATTERY_STATUS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reportBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        const powerState = await Battery.getPowerStateAsync();

        await sendBatteryStatus({
          variables: {
            level: Math.round(Math.max(0, Math.min(100, level * 100))),
            optIn: true,
            isCharging: powerState.batteryState === Battery.BatteryState.CHARGING,
          },
        });
      } catch (error) {
        console.warn('[Battery] Failed to report status', error);
      }
    };

    if (!isAuthenticated) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    reportBattery();
    timerRef.current = setInterval(reportBattery, BATTERY_REPORT_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, sendBatteryStatus]);
}
