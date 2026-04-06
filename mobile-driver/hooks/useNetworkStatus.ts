import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/authStore';

const PING_INTERVAL_MS = 15_000; // 15 seconds
const PING_TIMEOUT_MS = 5_000;   // 5 second timeout per check

/**
 * JS-only network connectivity monitor — no native modules required.
 * Pings the GraphQL endpoint with a lightweight HEAD request every 15 s.
 * Updates `authStore.isNetworkConnected`.
 * Mount once at the app root (e.g. _layout.tsx).
 */
export function useNetworkStatus() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    // Derive a lightweight endpoint — HEAD to the API base (strip /graphql)
    const pingUrl = apiUrl ? apiUrl.replace(/\/graphql$/, '/health') : null;

    async function checkConnectivity() {
      if (!pingUrl) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
        const response = await fetch(pingUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        useAuthStore.getState().setNetworkConnected(response.ok || response.status < 500);
      } catch {
        useAuthStore.getState().setNetworkConnected(false);
      }
    }

    function startPolling() {
      // Immediate check
      void checkConnectivity();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(checkConnectivity, PING_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Start on mount
    startPolling();

    // Pause in background, restart on foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      if (wasBackground && nextState === 'active') {
        startPolling();
      } else if (nextState !== 'active') {
        stopPolling();
      }
      appStateRef.current = nextState;
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, []);
}
