import { useCallback, MutableRefObject } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { ASSIGN_DRIVER_TO_ORDER } from '@/graphql/operations/orders';
import { useAuthStore } from '@/store/authStore';
import { useOrderAcceptStore } from '@/store/orderAcceptStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useNavigationLocationStore } from '@/store/navigationLocationStore';
import type { NavigationPhase } from '@/store/navigationStore';

interface UseAcceptOrderMutationOptions {
    currentDriverId: string | undefined;
    lastOrdersRefreshAt: MutableRefObject<number>;
    refetchOrders: () => Promise<void>;
}

/**
 * Encapsulates the order accept/skip/navigate mutation logic.
 *
 * - executeAcceptMutation: shared accept guard + GraphQL mutation call
 * - handleAcceptOrder: accept and navigate to drive tab
 * - handleSkipOrder: skip the pending order
 * - handleAcceptAndNavigate: accept and immediately start turn-by-turn navigation
 */
export function useAcceptOrderMutation({
    currentDriverId,
    lastOrdersRefreshAt,
    refetchOrders,
}: UseAcceptOrderMutationOptions) {
    const router = useRouter();
    const startNavigation = useNavigationStore((s) => s.startNavigation);
    const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);

    const executeAcceptMutation = useCallback(async (
        orderId: string,
        onSuccess: () => void,
    ): Promise<void> => {
        if (!currentDriverId) return;
        if (!useOrderAcceptStore.getState().tryLockAccept()) return;

        const { isOnline, isNetworkConnected } = useAuthStore.getState();
        if (!isOnline || !isNetworkConnected) {
            useOrderAcceptStore.getState().setAcceptError('You are offline. Please check your connection.');
            useOrderAcceptStore.getState().setAccepting(false);
            (useOrderAcceptStore.getState() as any)._acceptingRef = false;
            return;
        }

        useOrderAcceptStore.getState().setAcceptError(null);
        useOrderAcceptStore.getState().setAccepting(true);
        try {
            await assignDriver({ variables: { id: orderId, driverId: currentDriverId } });
            useOrderAcceptStore.getState().setPendingOrder(null);
            lastOrdersRefreshAt.current = 0;
            void refetchOrders();
            onSuccess();
        } catch (err: any) {
            const msg = (err?.message ?? '').toLowerCase();
            console.error('[accept] assignDriverToOrder failed:', err?.message, err?.graphQLErrors);
            if (msg.includes('already') || msg.includes('assigned') || msg.includes('taken')) {
                useOrderAcceptStore.getState().setTakenByOther(true);
            } else {
                useOrderAcceptStore.getState().setPendingOrder(null);
                if (msg.includes('maximum') || msg.includes('max active')) {
                    useOrderAcceptStore.getState().setAcceptError('You have reached your maximum active orders.');
                } else if (msg.includes('not available') || msg.includes('not available for driver')) {
                    useOrderAcceptStore.getState().setAcceptError('This order is no longer available.');
                } else {
                    useOrderAcceptStore.getState().setAcceptError(`Failed to accept: ${err?.message ?? 'Please try again.'}`);
                }
            }
        } finally {
            useOrderAcceptStore.getState().setAccepting(false);
        }
    }, [currentDriverId, assignDriver, lastOrdersRefreshAt, refetchOrders]);

    const handleAcceptOrder = useCallback(async (orderId: string) => {
        await executeAcceptMutation(orderId, () => {
            router.push('/(tabs)/drive' as any);
        });
    }, [executeAcceptMutation, router]);

    const handleSkipOrder = useCallback(() => {
        useOrderAcceptStore.getState().skipOrder();
    }, []);

    const handleAcceptAndNavigate = useCallback(async (orderId: string) => {
        const order = useOrderAcceptStore.getState().pendingOrder;
        if (!order) return;

        await executeAcceptMutation(orderId, () => {
            const bizLoc = order.businesses?.[0]?.business?.location;
            const dropLoc = order.dropOffLocation;
            if (!bizLoc) return;

            const loc =
                useNavigationLocationStore.getState().location ??
                useNavigationLocationStore.getState().lastKnownCoords;
            if (!loc) return;

            const pickup = {
                latitude: Number(bizLoc.latitude),
                longitude: Number(bizLoc.longitude),
                label: order.businesses?.[0]?.business?.name ?? 'Pickup',
            };
            const dropoff = dropLoc
                ? {
                    latitude: Number(dropLoc.latitude),
                    longitude: Number(dropLoc.longitude),
                    label: dropLoc.address ?? 'Drop-off',
                }
                : null;
            const customerName = order.user
                ? `${order.user.firstName} ${order.user.lastName}`
                : 'Customer';

            const navOrder = {
                id: order.id,
                status: order.status,
                businessName: order.businesses?.[0]?.business?.name ?? 'Business',
                customerName,
                customerPhone: order.user?.phoneNumber ?? null,
                pickup,
                dropoff,
            };

            const phase: NavigationPhase =
                order.status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';

            startNavigation(navOrder, phase, loc);
            router.push('/navigation' as any);
        });
    }, [executeAcceptMutation, startNavigation, router]);

    return { handleAcceptOrder, handleSkipOrder, handleAcceptAndNavigate, executeAcceptMutation };
}
