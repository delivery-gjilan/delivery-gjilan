import admin from 'firebase-admin';
import logger from '@/lib/logger';

let firebaseApp: admin.app.App | null = null;

/**
 * Initializes Firebase Admin SDK.
 * Expects FIREBASE_SERVICE_ACCOUNT_KEY env var to contain the service account JSON as a string,
 * or uses GOOGLE_APPLICATION_CREDENTIALS for ADC if not provided.
 */
export function initializeFirebase(): admin.app.App {
    if (firebaseApp) return firebaseApp;

    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccountKey) {
            // Parse the JSON string from env var
            const serviceAccount = JSON.parse(serviceAccountKey);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            // Fall back to Application Default Credentials
            firebaseApp = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
        }

        logger.info('Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        logger.error({ error }, 'Failed to initialize Firebase Admin SDK');
        throw error;
    }
}

/**
 * Returns the current Firebase Admin app instance, initializing if needed.
 */
export function getFirebaseApp(): admin.app.App {
    if (!firebaseApp) {
        return initializeFirebase();
    }
    return firebaseApp;
}

/**
 * Returns a Firebase Messaging instance.
 */
export function getMessaging(): admin.messaging.Messaging {
    return getFirebaseApp().messaging();
}
