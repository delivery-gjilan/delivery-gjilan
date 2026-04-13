import { useLocaleStore } from '@/store/useLocaleStore';
import { Translation } from '@/localization/schema';
import en from '@/localization/en.json';

export function useTranslations(): { t: Translation } {
    const translations = useLocaleStore((s) => s.translations);
    // Fall back to English if translations haven't loaded yet (e.g. cold start before hydration)
    return { t: translations ?? (en as Translation) };
}
