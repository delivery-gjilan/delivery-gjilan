import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OrdersLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                presentation: 'card',
                gestureEnabled: false,
                animationDuration: 250,
            }}
        />
    );
}
