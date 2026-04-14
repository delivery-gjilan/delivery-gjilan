import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useShallow } from 'zustand/react/shallow';
import { GET_STORE_STATUS, STORE_STATUS_UPDATED } from '@/graphql/operations/store';
import { useStoreStatusStore } from '@/store/storeStatusStore';

/**
 * Mount once in _layout.tsx — runs the query + subscription and syncs into
 * the Zustand store.  All other screens use `useStoreStatus()` which is a
 * cheap Zustand read with zero network/WS cost.
 */
export const useStoreStatusInit = () => {
    const update = useStoreStatusStore((s) => s._update);
    const setLoading = useStoreStatusStore((s) => s._setLoading);

    const { data, loading, subscribeToMore } = useQuery(GET_STORE_STATUS, {
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        setLoading(loading);
    }, [loading, setLoading]);

    useEffect(() => {
        if (data?.getStoreStatus) {
            update(data.getStoreStatus);
        }
    }, [data, update]);

    useEffect(() => {
        const unsubscribe = subscribeToMore({
            document: STORE_STATUS_UPDATED,
            updateQuery: (prev, { subscriptionData }) => {
                const next = subscriptionData.data?.storeStatusUpdated;
                if (!next) return prev;
                update(next);
                return { ...prev, getStoreStatus: next };
            },
        });
        return unsubscribe;
    }, [subscribeToMore, update]);
};

/**
 * Lightweight reader — returns store status from Zustand.
 * No query, no subscription, no network cost.
 */
export const useStoreStatus = () => {
    return useStoreStatusStore(useShallow((s) => ({
        isStoreClosed: s.isStoreClosed,
        closedMessage: s.closedMessage,
        bannerEnabled: s.bannerEnabled,
        bannerMessage: s.bannerMessage,
        bannerType: s.bannerType,
        loading: s.loading,
        wasOpenOnEntry: s.wasOpenOnEntry,
    })));
};
