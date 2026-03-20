import { useEffect, useState } from 'react';
import { useInitializeTranslation } from './useInitializeTranslation';
import { useSyncTheme } from './useSyncTheme';
import { cacheReady } from '@/lib/graphql/apolloClient';

export function useAppSetup() {
    useSyncTheme();
    const { ready: translationsReady } = useInitializeTranslation();
    const [cacheRestored, setCacheRestored] = useState(false);

    useEffect(() => {
        void cacheReady.then(() => setCacheRestored(true));
    }, []);

    return { ready: translationsReady && cacheRestored };
}
