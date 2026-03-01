import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'admin_auth_token';

// Use SecureStore on native, AsyncStorage on web (SecureStore is unavailable on web)
const isNative = Platform.OS !== 'web';

export async function saveToken(token: string): Promise<void> {
    try {
        if (isNative) {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        } else {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        }
    } catch (error) {
        console.error('Error saving token to storage:', error);
        throw error;
    }
}

export async function getToken(): Promise<string | null> {
    try {
        if (isNative) {
            return await SecureStore.getItemAsync(TOKEN_KEY);
        }
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token from storage:', error);
        return null;
    }
}

export async function deleteToken(): Promise<void> {
    try {
        if (isNative) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error deleting token from storage:', error);
        throw error;
    }
}
