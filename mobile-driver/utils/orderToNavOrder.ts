import type { NavigationOrder, NavigationPhase } from '@/store/navigationStore';
import type { DriverOrder } from './types';
import { normalizeCoordinate } from './locationValidation';

/**
 * Maps a raw GraphQL order object to a NavigationOrder suitable for navigationStore.
 * Used by drive.tsx (handleStartNavigation, handleMarkPickedUp) and navigation.tsx (switchToOrder).
 */
export function buildNavOrder(order: DriverOrder): NavigationOrder | null {
    const bizLoc = order.businesses?.[0]?.business?.location;
    const pickupCoord = normalizeCoordinate(bizLoc);
    if (!pickupCoord) return null;

    const dropLoc = order.dropOffLocation;

    const pickup = {
        latitude: pickupCoord.latitude,
        longitude: pickupCoord.longitude,
        label: order.businesses?.[0]?.business?.name ?? 'Pickup',
    };

    const dropoffCoord = normalizeCoordinate(dropLoc);
    const dropoff = dropoffCoord
        ? {
              latitude: dropoffCoord.latitude,
              longitude: dropoffCoord.longitude,
              label: dropLoc?.address || 'Drop-off',
          }
        : null;

    const isDirectDispatch = order.channel === 'DIRECT_DISPATCH';
    const customerName = isDirectDispatch
        ? order.recipientName ?? order.recipientPhone ?? 'Direct Call'
        : order.user
        ? `${order.user.firstName} ${order.user.lastName}`
        : 'Customer';
    const customerPhone = isDirectDispatch ? order.recipientPhone ?? null : order.user?.phoneNumber ?? null;

    return {
        id: order.id,
        status: order.status,
        businessName: order.businesses?.[0]?.business?.name ?? 'Business',
        customerName,
        customerPhone,
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
