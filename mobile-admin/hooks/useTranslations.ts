import { useLocaleStore } from '@/store/useLocaleStore';
import { Translation } from '@/localization/schema';

export function useTranslations(): { t: Translation } {
    const translations = useLocaleStore((s) => s.translations);
    if (!translations) {
        throw new Error('Translations not loaded. Wrap component tree with translation initialization.');
    }
    return { t: translations };
}
