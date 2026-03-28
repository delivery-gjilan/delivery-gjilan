import { useInitializeTranslation } from './useInitializeTranslation';
import { useSyncTheme } from './useSyncTheme';
import { useAuthInitialization } from './useAuthInitialization';

export function useAppSetup() {
    useSyncTheme();
    useAuthInitialization();
    const { ready } = useInitializeTranslation();
    return { ready };
}
