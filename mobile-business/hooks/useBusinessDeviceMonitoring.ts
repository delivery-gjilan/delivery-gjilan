import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useMutation, useSubscription } from '@apollo/client/react';
import * as Battery from 'expo-battery';
import Constants from 'expo-constants';
import { resolveDeviceId } from '@/utils/deviceId';
import { useAuthStore } from '@/store/authStore';
import { getWsHealthSnapshot } from '@/lib/apollo';
import { ORDERS_SUBSCRIPTION } from '@/graphql/orders';
import { DevicePlatform } from '@/gql/graphql';
import {
  BUSINESS_DEVICE_HEARTBEAT,
  BUSINESS_DEVICE_ORDER_SIGNAL,
} from '@/graphql/deviceHealth';

const HEARTBEAT_INTERVAL_MS = 30_000;
const ORDER_SIGNAL_THROTTLE_MS = 4_000;

export function useBusinessDeviceMonitoring() {
  const { isAuthenticated, user } = useAuthStore();
  const [appState, setAppState] = useState(AppState.currentState);
  const lastOrderSignalAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sendHeartbeat] = useMutation(BUSINESS_DEVICE_HEARTBEAT);
  const [sendOrderSignal] = useMutation(BUSINESS_DEVICE_ORDER_SIGNAL);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => setAppState(nextState));
    return () => sub.remove();
  }, []);

  useSubscription(ORDERS_SUBSCRIPTION, {
    skip: !isAuthenticated,
    onData: ({ data }) => {
      const now = Date.now();
      if (now - lastOrderSignalAtRef.current < ORDER_SIGNAL_THROTTLE_MS) {
        return;
      }

      const firstOrder = data.data?.allOrdersUpdated?.[0];
      const orderId = firstOrder?.id;
      lastOrderSignalAtRef.current = now;

      sendOrderSignal({
        variables: {
          deviceId: resolveDeviceId(),
          orderId,
        },
      }).catch((error) => {
        console.warn('[BusinessDeviceMonitoring] Failed to send order signal', error);
      });
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.businessId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const reportHeartbeat = async () => {
      try {
        const ws = getWsHealthSnapshot();
        const batteryLevelRaw = await Battery.getBatteryLevelAsync();
        const powerState = await Battery.getPowerStateAsync();

        await sendHeartbeat({
          variables: {
            input: {
              deviceId: resolveDeviceId(),
              platform: Platform.OS === 'ios' ? DevicePlatform.Ios : DevicePlatform.Android,
              appVersion: Constants.expoConfig?.version ?? null,
              appState,
              networkType: null,
              batteryLevel: Math.round(Math.max(0, Math.min(100, batteryLevelRaw * 100))),
              isCharging: powerState.batteryState === Battery.BatteryState.CHARGING,
              subscriptionAlive: ws.isConnected,
              metadata: {
                wsReconnectAttempts: ws.reconnectAttempts,
                wsLastConnectedAt: ws.lastConnectedAt,
                wsLastDisconnectedAt: ws.lastDisconnectedAt,
              },
            },
          },
        });
      } catch (error) {
        console.warn('[BusinessDeviceMonitoring] Heartbeat failed', error);
      }
    };

    reportHeartbeat();
    timerRef.current = setInterval(reportHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.businessId, appState, sendHeartbeat]);
}
