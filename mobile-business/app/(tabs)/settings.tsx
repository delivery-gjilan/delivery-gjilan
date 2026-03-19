import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/authStore';
import { hasBusinessPermission } from '@/lib/rbac';
import { UserPermission } from '@/gql/graphql';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const canManageSettings = hasBusinessPermission(user, UserPermission.ManageSettings);

    if (!canManageSettings) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <Ionicons name="lock-closed" size={42} color="#ef4444" />
                <Text className="text-text text-xl font-bold mt-4">Access Restricted</Text>
                <Text className="text-subtext text-center mt-2">
                    You do not have permission to manage settings.
                </Text>
                <TouchableOpacity
                    className="bg-primary px-4 py-3 rounded-xl mt-5"
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text className="text-white font-semibold">Back to Orders</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    console.log('[Settings] Logging out...');
                    await logout();
                    console.log('[Settings] Redirecting to login');
                    router.replace('/login');
                },
            },
        ]);
    };

    const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View className="mb-6">
            <Text className="text-subtext text-xs font-semibold uppercase mb-3 px-4">{title}</Text>
            <View className="bg-card rounded-2xl mx-4">{children}</View>
        </View>
    );

    const SettingRow = ({
        icon,
        label,
        value,
        onPress,
        showChevron = true,
        renderRight,
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value?: string;
        onPress?: () => void;
        showChevron?: boolean;
        renderRight?: () => React.ReactNode;
    }) => (
        <TouchableOpacity
            className="flex-row items-center py-4 px-4 border-b border-gray-700 last:border-b-0"
            onPress={onPress}
            disabled={!onPress}
        >
            <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                <Ionicons name={icon} size={20} color="#0b89a9" />
            </View>
            <View className="flex-1">
                <Text className="text-text font-medium">{label}</Text>
                {value && <Text className="text-subtext text-sm mt-0.5">{value}</Text>}
            </View>
            {renderRight ? renderRight() : showChevron && <Ionicons name="chevron-forward" size={20} color="#6b7280" />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-800">
                <Text className="text-text text-2xl font-bold">Settings</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
                {/* Business Info */}
                <SettingSection title="Business">
                    <View className="flex-row items-center py-4 px-4 border-b border-gray-700">
                        <View className="w-16 h-16 rounded-2xl bg-background overflow-hidden mr-3">
                            {user?.business?.imageUrl ? (
                                <Image
                                    source={{ uri: user.business.imageUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                />
                            ) : (
                                <View className="flex-1 items-center justify-center">
                                    <Ionicons name="storefront" size={32} color="#0b89a9" />
                                </View>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-text font-bold text-lg">{user?.business?.name}</Text>
                            <Text className="text-subtext text-sm capitalize">
                                {user?.business?.businessType.toLowerCase()}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <View
                                    className={`w-2 h-2 rounded-full mr-2 ${
                                        user?.business?.isActive ? 'bg-success' : 'bg-danger'
                                    }`}
                                />
                                <Text className="text-subtext text-xs">
                                    {user?.business?.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <SettingRow icon="time" label="Business Hours" value="Set opening hours" onPress={() => {}} />
                    <SettingRow icon="location" label="Location & Address" value="Update location" onPress={() => {}} />
                    <SettingRow icon="call" label="Contact Information" value="Phone number" onPress={() => {}} />
                </SettingSection>

                {/* Account */}
                <SettingSection title="Account">
                    <View className="py-4 px-4 border-b border-gray-700">
                        <Text className="text-text font-semibold mb-1">
                            {user?.firstName} {user?.lastName}
                        </Text>
                        <Text className="text-subtext text-sm">{user?.email}</Text>
                        <View className="mt-2 px-2 py-1 bg-primary/20 rounded self-start">
                            <Text className="text-primary text-xs font-semibold uppercase">{user?.role.replace('_', ' ')}</Text>
                        </View>
                    </View>
                    <SettingRow icon="person" label="Profile" value="Edit profile information" onPress={() => {}} />
                    <SettingRow icon="lock-closed" label="Change Password" onPress={() => {}} />
                </SettingSection>

                {/* Notifications */}
                <SettingSection title="Notifications">
                    <SettingRow
                        icon="notifications"
                        label="Push Notifications"
                        showChevron={false}
                        renderRight={() => (
                            <Switch
                                value={true}
                                onValueChange={() => {}}
                                trackColor={{ false: '#6b7280', true: '#0b89a9' }}
                                thumbColor="#fff"
                            />
                        )}
                    />
                    <SettingRow
                        icon="volume-high"
                        label="Sound Alerts"
                        showChevron={false}
                        renderRight={() => (
                            <Switch
                                value={true}
                                onValueChange={() => {}}
                                trackColor={{ false: '#6b7280', true: '#0b89a9' }}
                                thumbColor="#fff"
                            />
                        )}
                    />
                    <SettingRow
                        icon="mail"
                        label="Email Notifications"
                        showChevron={false}
                        renderRight={() => (
                            <Switch
                                value={false}
                                onValueChange={() => {}}
                                trackColor={{ false: '#6b7280', true: '#0b89a9' }}
                                thumbColor="#fff"
                            />
                        )}
                    />
                </SettingSection>

                {/* App Settings */}
                <SettingSection title="App">
                    <SettingRow icon="help-circle" label="Help & Support" onPress={() => {}} />
                    <SettingRow icon="shield-checkmark" label="Privacy Policy" onPress={() => {}} />
                    <SettingRow icon="document-text" label="Terms of Service" onPress={() => {}} />
                    <SettingRow icon="information-circle" label="About" value="Version 1.0.0" onPress={() => {}} />
                </SettingSection>

                {/* Logout */}
                <View className="mx-4">
                    <TouchableOpacity
                        className="bg-danger/20 py-4 rounded-xl flex-row items-center justify-center"
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out" size={20} color="#ef4444" />
                        <Text className="text-danger font-semibold ml-2">Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text className="text-subtext text-xs text-center mt-8">
                    Delivery Gjilan Business Portal © 2024
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
