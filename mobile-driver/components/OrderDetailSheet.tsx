import React from 'react';
import { OrderInspectSheet } from '@/components/OrderInspectSheet';
import type { DriverOrder } from '@/utils/types';

interface Props {
    order: DriverOrder;
    routeInfo: { distanceKm: number; durationMin: number } | null;
    previewRouteInfo: { distanceKm: number; durationMin: number } | null;
    isAssignedToMe: boolean;
    onStartNavigation: () => void;
    onMarkPickedUp?: () => Promise<void>;
    onClose: () => void;
    onHeightChange?: (h: number) => void;
}

export function OrderDetailSheet({
    order,
    routeInfo,
    previewRouteInfo,
    isAssignedToMe,
    onStartNavigation,
    onMarkPickedUp,
    onClose,
    onHeightChange,
}: Props) {
    const effectiveRouteInfo = order.status === 'OUT_FOR_DELIVERY' ? routeInfo : previewRouteInfo ?? routeInfo;

    return (
        <OrderInspectSheet
            mode="assigned"
            order={order}
            onClose={onClose}
            onNavigate={onStartNavigation}
            onMarkPickedUp={isAssignedToMe ? onMarkPickedUp : undefined}
            onHeightChange={onHeightChange}
            routeInfo={effectiveRouteInfo}
        />
    );
}
