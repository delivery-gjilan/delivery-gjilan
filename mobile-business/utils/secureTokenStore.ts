import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'business_auth_token';
const REFRESH_TOKEN_KEY = 'business_refresh_token';

// Use SecureStore on native, AsyncStorage on web (SecureStore is unavailable on web)
const isNative = Platform.OS !== 'web';

/**
 * Save authentication token to secure storage
 */
export async function saveToken(token: string): Promise<void> {
    try {
        if (isNative) {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        } else {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        }
        console.log('[SecureStore] Token saved');
    } catch (error) {
        console.error('[SecureStore] Error saving token:', error);
        throw error;
    }
}

export async function saveRefreshToken(token: string): Promise<void> {
    try {
        if (isNative) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
        } else {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
        }
        console.log('[SecureStore] Refresh token saved');
    } catch (error) {
        console.error('[SecureStore] Error saving refresh token:', error);
        throw error;
    }
}

/**
 * Get authentication token from secure storage
 */
export async function getToken(): Promise<string | null> {
    try {
        if (isNative) {
            return await SecureStore.getItemAsync(TOKEN_KEY);
        }
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('[SecureStore] Error getting token:', error);
        return null;
    }
}

export async function getRefreshToken(): Promise<string | null> {
    try {
        if (isNative) {
            return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        }
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
        console.error('[SecureStore] Error getting refresh token:', error);
        return null;
    }
}

/**
 * Delete authentication token from secure storage
 */
export async function deleteToken(): Promise<void> {
    try {
        if (isNative) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
        }
        console.log('[SecureStore] Token deleted');
    } catch (error) {
        console.error('[SecureStore] Error deleting token:', error);
        throw error;
    }
}

export async function deleteRefreshToken(): Promise<void> {
    try {
        if (isNative) {
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        } else {
            await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        }
        console.log('[SecureStore] Refresh token deleted');
    } catch (error) {
        console.error('[SecureStore] Error deleting refresh token:', error);
        throw error;
    }
}

export async function deleteTokens(): Promise<void> {
    await Promise.all([deleteToken(), deleteRefreshToken()]);
}
