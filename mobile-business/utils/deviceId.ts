import Constants from 'expo-constants';

/**
 * Returns a stable device identifier for telemetry and device monitoring.
 * Prefers installationId > sessionId > deviceName > 'unknown'.
 */
export function resolveDeviceId(): string {
    return (
        Constants.installationId ||
        Constants.sessionId ||
        Constants.deviceName ||
        'unknown'
    );
}
