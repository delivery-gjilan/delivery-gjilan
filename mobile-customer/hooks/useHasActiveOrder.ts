import { useQuery } from '@apollo/client/react';
import { GET_ORDERS } from '@/graphql/operations/orders';

const ACTIVE_STATUSES = new Set(['AWAITING_APPROVAL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);

/**
 * Returns true if the user currently has at least one active (non-terminal) order.
 * Used to suppress the out-of-zone modal while an order is in flight.
 */
export function useHasActiveOrder(): { hasActiveOrder: boolean; isLoading: boolean } {
    const { data, loading } = useQuery(GET_ORDERS, {
        variables: { limit: 10, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    const orders: Array<{ status: string }> = (data as any)?.orders?.orders ?? [];
    return {
        hasActiveOrder: orders.some((o) => ACTIVE_STATUSES.has(o.status)),
        // Keep loading true during cache-and-network refresh so callers can avoid
        // making one-time decisions from potentially stale cached order status.
        isLoading: loading,
    };
}
