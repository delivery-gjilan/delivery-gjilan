import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OrdersLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                
                // === TRY THESE ANIMATIONS ONE BY ONE ===
                // Uncomment only ONE animation option at a time to test
                
                // 1. SLIDE FROM BOTTOM
                animation: 'slide_from_bottom',
                presentation: 'card',
                
                // 2. FADE IN
                // animation: 'fade',
                // presentation: 'card',
                
                // 3. FADE FROM BOTTOM
                // animation: 'fade_from_bottom',
                // presentation: 'card',
                
                // 4. MODAL (iOS style with background dim)
                // presentation: 'modal',
                // animation: 'default',
                
                // 5. TRANSPARENT MODAL
                // presentation: 'transparentModal',
                // animation: 'fade',
                
                // 6. SLIDE FROM RIGHT
                // animation: 'slide_from_right',
                // presentation: 'card',
                
                // 7. NO ANIMATION
                // animation: 'none',
                // presentation: 'card',
                
                animationDuration: 250,
                ...(Platform.OS === 'ios' && {
                    gestureEnabled: true,
                    gestureDirection: 'vertical',
                }),
            }}
        />
    );
}
