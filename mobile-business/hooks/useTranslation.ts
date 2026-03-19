import { useLocaleStore } from '@/store/useLocaleStore';

function resolvePath(obj: Record<string, any> | null, path: string): any {
    if (!obj) return undefined;
    return path.split('.').reduce((acc: any, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function useTranslation() {
    const { translations } = useLocaleStore();

    const t = (path: string, fallback?: string, params?: Record<string, string | number>) => {
        const resolved = resolvePath(translations as Record<string, any> | null, path);
        const baseText = typeof resolved === 'string' ? resolved : fallback ?? path;

        if (!params) return baseText;

        return Object.entries(params).reduce((text, [key, value]) => {
            return text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
        }, baseText);
    };

    return { t };
}
