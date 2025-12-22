import { View, ActivityIndicator } from 'react-native';

export default function LoadingScreen() {
    return (
        <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator size="large" color="#3B82F6" />
        </View>
    );
}
