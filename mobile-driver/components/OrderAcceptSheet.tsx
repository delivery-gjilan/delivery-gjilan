import React from 'react';
import { OrderInspectSheet } from '@/components/OrderInspectSheet';
import type { DriverOrder } from '@/utils/types';

interface Props {
    order: DriverOrder;
    onAccept: (orderId: string) => void;
    onAcceptAndNavigate?: (orderId: string) => void;
    onSkip: () => void;
    accepting?: boolean;
    autoCountdown?: boolean;
    onHeightChange?: (h: number) => void;
    takenByOther?: boolean;
    hasActiveOrder?: boolean;
}

export function OrderAcceptSheet({
    order,
    onAccept,
    onAcceptAndNavigate,
    onSkip,
    accepting = false,
    autoCountdown = true,
    onHeightChange,
    takenByOther = false,
    hasActiveOrder = false,
}: Props) {
    return (
        <OrderInspectSheet
            mode="available"
            order={order}
            onClose={onSkip}
            onAccept={onAccept}
            onAcceptAndNavigate={onAcceptAndNavigate}
            accepting={accepting}
            autoCountdown={autoCountdown}
            onHeightChange={onHeightChange}
            takenByOther={takenByOther}
            hasActiveOrder={hasActiveOrder}
        />
    );
}
