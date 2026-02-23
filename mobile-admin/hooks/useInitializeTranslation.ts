import { useLocaleStore } from '@/store/useLocaleStore';
import { useEffect } from 'react';

export function useInitializeTranslation() {
    const { translations, loadTranslation } = useLocaleStore();

    useEffect(() => {
        loadTranslation();
    }, []);

    return { ready: translations !== null };
}
