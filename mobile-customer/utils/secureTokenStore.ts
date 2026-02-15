import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

/**
 * Save authentication token to storage
 */
export async function saveToken(token: string): Promise<void> {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving token to storage:', error);
        throw error;
    }
}

/**
 * Get authentication token from storage
 */
export async function getToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token from storage:', error);
        return null;
    }
}

/**
 * Delete authentication token from storage
 */
export async function deleteToken(): Promise<void> {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error deleting token from storage:', error);
        throw error;
    }
}
