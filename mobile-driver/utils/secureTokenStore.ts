import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'driver_auth_token';

export async function saveToken(token: string): Promise<void> {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving token to storage:', error);
        throw error;
    }
}

export async function getToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token from storage:', error);
        return null;
    }
}

export async function deleteToken(): Promise<void> {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error deleting token from storage:', error);
        throw error;
    }
}
