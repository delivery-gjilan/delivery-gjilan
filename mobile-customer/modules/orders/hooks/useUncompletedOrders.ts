import { useQuery } from '@apollo/client/react';
import { UNCOMPLETED_ORDERS } from '@/graphql/operations/orders';
import { useActiveOrdersStore } from '../store/activeOrdersStore';
import { useEffect } from 'react';

/**
 * Hook to fetch uncompleted orders and update the store
 * This should be called when the user logs in or when the app starts
 */
export function useUncompletedOrders() {
    const { data, loading, error, refetch } = useQuery(UNCOMPLETED_ORDERS, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
    });

    const setActiveOrders = useActiveOrdersStore((state) => state.setActiveOrders);

    // Update the store whenever data changes
    useEffect(() => {
        if (data?.uncompletedOrders) {
            setActiveOrders(data.uncompletedOrders);
        }
    }, [data, setActiveOrders]);

    return {
        orders: data?.uncompletedOrders || [],
        loading,
        error,
        refetch,
    };
}
