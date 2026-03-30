import { useQuery } from '@apollo/client/react';
import { GET_ORDERS } from '@/graphql/operations/orders';

const ACTIVE_STATUSES = new Set(['AWAITING_APPROVAL', 'PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);

/**
 * Returns true if the user currently has at least one active (non-terminal) order.
 * Used to suppress the out-of-zone modal while an order is in flight.
 */
export function useHasActiveOrder(): boolean {
    const { data } = useQuery(GET_ORDERS, {
        variables: { limit: 10, offset: 0 },
        fetchPolicy: 'cache-and-network',
    });

    const orders: Array<{ status: string }> = (data as any)?.orders ?? [];
    return orders.some((o) => ACTIVE_STATUSES.has(o.status));
}
