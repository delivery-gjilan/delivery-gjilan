import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/**
 * Initialise Sentry for mobile-customer.
 * Call once in the root _layout.tsx before any other component renders.
 *
 * When EXPO_PUBLIC_SENTRY_DSN is empty the SDK operates in noop mode.
 */
export function initSentry() {
    if (!DSN) {
        console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled');
        return;
    }

    Sentry.init({
        dsn: DSN,
        environment: __DEV__ ? 'development' : 'production',
        release: Constants.expoConfig?.version ?? '0.0.0',
        dist: Constants.expoConfig?.extra?.eas?.projectId ?? undefined,

        // Performance
        tracesSampleRate: __DEV__ ? 1.0 : 0.2,

        // Attach device, OS, and RN runtime context automatically
        enableAutoPerformanceTracing: true,
        enableNativeFramesTracking: true,

        // Strip PII from breadcrumbs
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
                // Don't log auth token headers
                delete breadcrumb.data.headers;
            }
            return breadcrumb;
        },
    });
}

/**
 * Identify the current user so Sentry events show who was affected.
 */
export function identifySentryUser(userId: string, email?: string) {
    Sentry.setUser({ id: userId, email });
}

/** Clear user on logout */
export function clearSentryUser() {
    Sentry.setUser(null);
}

export { Sentry };
