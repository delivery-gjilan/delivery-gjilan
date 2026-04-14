import type { NavigationOrder, NavigationPhase } from '@/store/navigationStore';
import type { DriverOrder } from './types';

/**
 * Maps a raw GraphQL order object to a NavigationOrder suitable for navigationStore.
 * Used by drive.tsx (handleStartNavigation, handleMarkPickedUp) and navigation.tsx (switchToOrder).
 */
export function buildNavOrder(order: DriverOrder): NavigationOrder | null {
    const bizLoc = order.businesses?.[0]?.business?.location;
    if (!bizLoc) return null;

    const dropLoc = order.dropOffLocation;

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

    return {
        id: order.id,
        status: order.status,
        businessName: order.businesses?.[0]?.business?.name ?? 'Business',
        customerName,
        customerPhone: order.user?.phoneNumber ?? null,
        pickup,
        dropoff,
    };
}

/**
 * Derives the correct NavigationPhase from order status.
 */
export function orderToPhase(status: string): NavigationPhase {
    return status === 'OUT_FOR_DELIVERY' ? 'to_dropoff' : 'to_pickup';
}
