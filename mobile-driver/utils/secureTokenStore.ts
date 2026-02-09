import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'driver_auth_token';

export async function saveToken(token: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving token to secure storage:', error);
        throw error;
    }
}

export async function getToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token from secure storage:', error);
        return null;
    }
}

export async function deleteToken(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
        console.error('Error deleting token from secure storage:', error);
        throw error;
    }
}
