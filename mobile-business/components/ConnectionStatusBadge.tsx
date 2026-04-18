import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWsHealthSnapshot } from '@/lib/apollo';
import { useTranslation } from '@/hooks/useTranslation';

interface ConnectionStatusBadgeProps {
    isAuthenticated: boolean;
}

export function ConnectionStatusBadge({ isAuthenticated }: ConnectionStatusBadgeProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [wsConnected, setWsConnected] = useState(true);
    const [reconnectedVisible, setReconnectedVisible] = useState(false);
    const wasDisconnectedRef = useRef(false);
    const hasEverBeenConnectedRef = useRef(false);
    const pollingStartedRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setWsConnected(true);
            setReconnectedVisible(false);
            wasDisconnectedRef.current = false;
            hasEverBeenConnectedRef.current = false;
            pollingStartedRef.current = false;
            return;
        }

        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let delayTimer: ReturnType<typeof setTimeout> | null = null;
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            pollingStartedRef.current = true;

            const updateWsState = () => {
                const next = getWsHealthSnapshot();
                const isConnectedNow = Boolean(next.isConnected);

                // Track that we've seen a connection
                if (isConnectedNow) {
                    hasEverBeenConnectedRef.current = true;
                }

                setWsConnected(isConnectedNow);

                if (!isConnectedNow) {
                    wasDisconnectedRef.current = true;
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                        reconnectTimer = null;
                    }
                    setReconnectedVisible(false);
                    return;
                }

                if (wasDisconnectedRef.current) {
                    wasDisconnectedRef.current = false;
                    setReconnectedVisible(true);
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                    }
                    reconnectTimer = setTimeout(() => {
                        setReconnectedVisible(false);
                        reconnectTimer = null;
                    }, 4000);
                }
            };

            updateWsState();
            interval = setInterval(updateWsState, 2000); // 2 seconds polling
        };

        // Start polling after 5 seconds (skip on cold start)
        delayTimer = setTimeout(() => {
            startPolling();
        }, 5000);

        return () => {
            if (delayTimer) {
                clearTimeout(delayTimer);
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isAuthenticated]);

    // Only show disconnect modal if:
    // 1. Authenticated
    // 2. Polling has started (5 seconds passed)
    // 3. Actually disconnected
    // 4. We've been connected before (not a cold start)
    const shouldShowDisconnectModal =
        isAuthenticated && pollingStartedRef.current && !wsConnected && hasEverBeenConnectedRef.current;

    if (!isAuthenticated || wsConnected && !reconnectedVisible) {
        return null;
    }

    if (shouldShowDisconnectModal) {
        return (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 300,
                }}
            >
                {/* Semi-transparent overlay backdrop */}
                <View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    }}
                />
                {/* Red modal card */}
                <View
                    style={{
                        backgroundColor: '#7F1D1D',
                        borderColor: '#FCA5A5',
                        borderWidth: 2,
                        borderRadius: 16,
                        paddingHorizontal: 32,
                        paddingVertical: 24,
                        shadowColor: '#000',
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 8,
                    }}
                >
                    <Text style={{ color: '#FEE2E2', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
                        {t('connection.offline', 'Offline: reconnecting...')}
                    </Text>
                </View>
            </View>
        );
    }

    if (wsConnected && reconnectedVisible) {
        return (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: insets.top + 10,
                    right: 12,
                    zIndex: 300,
                    backgroundColor: '#14532D',
                    borderColor: '#86EFAC',
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                }}
            >
                <Text style={{ color: '#DCFCE7', fontWeight: '600', fontSize: 11 }}>
                    {t('connection.reconnected', 'Reconnected')}
                </Text>
            </View>
        );
    }

    return null;
}
