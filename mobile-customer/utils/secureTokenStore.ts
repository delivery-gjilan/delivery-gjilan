import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

/**
 * Save authentication token to secure storage
 */
export async function saveToken(token: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving token to secure storage:', error);
        throw error;
    }
}

/**
 * Get authentication token from secure storage
 */
export async function getToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token from secure storage:', error);
        return null;
    }
}

/**
 * Delete authentication token from secure storage
 */
export async function deleteToken(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
        console.error('Error deleting token from secure storage:', error);
        throw error;
    }
}
