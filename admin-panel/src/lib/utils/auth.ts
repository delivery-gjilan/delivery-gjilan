/**
 * Returns the stored auth token for use in REST fetch calls.
 * Safe to call on the server (returns null when window is unavailable).
 */
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
}
