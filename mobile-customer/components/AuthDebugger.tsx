import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/utils/secureTokenStore';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Temporary debugging component to monitor auth state
 * Remove this after fixing auth issues
 * 
 * NOTE: Token is stored ONLY in SecureStore (not persisted in Zustand)
 * Zustand keeps it in memory during the session
 */
export function AuthDebugger() {
    const { token, user, isAuthenticated, hasHydrated } = useAuthStore();
    const [secureStoreToken, setSecureStoreToken] = useState<string | null>(null);
    const theme = useTheme();

    const checkSecureStore = async () => {
        const t = await getToken();
        setSecureStoreToken(t);
        console.log('[AuthDebugger] SecureStore check:', t ? 'Token exists' : 'No token');
    };

    return (
        <View style={{ 
            position: 'absolute', 
            bottom: 100, 
            right: 10, 
            backgroundColor: theme.colors.card,
            padding: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            maxWidth: 220,
            opacity: 0.9,
        }}>
            <Text style={{ color: theme.colors.text, fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>🔐 Auth Debug</Text>
            <Text style={{ color: theme.colors.text, fontSize: 9 }}>Hydrated: {hasHydrated ? '✅' : '❌'}</Text>
            <Text style={{ color: theme.colors.text, fontSize: 9 }}>Authenticated: {isAuthenticated ? '✅' : '❌'}</Text>
            <Text style={{ color: theme.colors.text, fontSize: 9 }}>Memory Token: {token ? '✅' : '❌'}</Text>
            <Text style={{ color: theme.colors.text, fontSize: 9 }}>User: {user?.email || 'None'}</Text>
            {secureStoreToken !== null && (
                <Text style={{ color: theme.colors.text, fontSize: 9 }}>SecureStore: {secureStoreToken ? '✅' : '❌'}</Text>
            )}
            <TouchableOpacity 
                onPress={checkSecureStore}
                style={{ 
                    backgroundColor: theme.colors.primary, 
                    padding: 5, 
                    borderRadius: 4, 
                    marginTop: 5 
                }}
            >
                <Text style={{ color: '#fff', fontSize: 9, textAlign: 'center' }}>Check SecureStore</Text>
            </TouchableOpacity>
        </View>
    );
}
