import { useAuthStore } from '@/store/authStore';
import { deleteTokens, getRefreshToken, getToken, saveRefreshToken, saveToken } from '@/utils/secureTokenStore';
import { Buffer } from 'buffer';

const REFRESH_TOKEN_MUTATION = `
    mutation RefreshToken($refreshToken: String!) {
        refreshToken(refreshToken: $refreshToken) {
            token
            refreshToken
        }
    }
`;

let refreshInFlight: Promise<string | null> | null = null;

function getApiUrl(): string {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
        throw new Error('EXPO_PUBLIC_API_URL is not configured');
    }
    return apiUrl;
}

function parseJwtExpiryMs(token: string): number | null {
    try {
        const [, payload] = token.split('.');
        if (!payload) {
            return null;
        }

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as { exp?: number };
        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    } catch {
        return null;
    }
}

function isTokenFresh(token: string | null, minValidityMs = 60_000): boolean {
    if (!token) {
        return false;
    }

    const expiryMs = parseJwtExpiryMs(token);
    if (!expiryMs) {
        return false;
    }

    return expiryMs - Date.now() > minValidityMs;
}

export async function getStoredAccessToken(): Promise<string | null> {
    const memoryToken = useAuthStore.getState().token;
    if (memoryToken) {
        return memoryToken;
    }
    return getToken();
}

export async function getValidAccessToken(minValidityMs = 60_000): Promise<string | null> {
    const token = await getStoredAccessToken();
    if (isTokenFresh(token, minValidityMs)) {
        return token;
    }

    return refreshAccessToken(token);
}

export async function refreshAccessToken(currentToken?: string | null): Promise<string | null> {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
            return currentToken ?? null;
        }

        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                operationName: 'RefreshToken',
                query: REFRESH_TOKEN_MUTATION,
                variables: { refreshToken },
            }),
        });

        const raw = await response.text();
        let payload: any = null;
        try {
            payload = raw ? JSON.parse(raw) : null;
        } catch {
            payload = null;
        }

        const refreshed = payload?.data?.refreshToken;
        if (response.ok && refreshed?.token) {
            await saveToken(refreshed.token);
            useAuthStore.getState().setToken(refreshed.token);

            if (refreshed.refreshToken) {
                await saveRefreshToken(refreshed.refreshToken);
            }

            return refreshed.token as string;
        }

        const gqlCode = payload?.errors?.[0]?.extensions?.code;
        if (response.status === 401 || response.status === 403 || gqlCode === 'UNAUTHENTICATED') {
            await deleteTokens();
            useAuthStore.getState().setToken(null);
            return null;
        }

        console.warn('[Auth] Refresh temporarily unavailable for customer app');
        return currentToken ?? null;
    })()
        .catch(async (error) => {
            console.error('[Auth] Customer refresh failed:', error);
            return currentToken ?? (await getToken());
        })
        .finally(() => {
            refreshInFlight = null;
        });

    return refreshInFlight;
}