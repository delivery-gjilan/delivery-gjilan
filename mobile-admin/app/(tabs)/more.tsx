import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { GET_STORE_STATUS, SET_MY_PREFERRED_LANGUAGE, UPDATE_STORE_STATUS } from '@/graphql/misc';
import { deleteItemAsync } from 'expo-secure-store';
import { getInitials } from '@/utils/helpers';

type MenuItem = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub?: string;
    color?: string;
    onPress: () => void;
    trailing?: React.ReactNode;
};

function MenuSection({ title, items }: { title?: string; items: MenuItem[] }) {
    const theme = useTheme();
    return (
        <View className="mb-4">
            {title && (
                <Text className="text-xs font-semibold uppercase px-5 mb-2" style={{ color: theme.colors.subtext }}>
                    {title}
                </Text>
            )}
            <View className="mx-4 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.colors.card }}>
                {items.map((item, i) => (
                    <TouchableOpacity
                        key={item.label}
                        className="flex-row items-center px-4 py-3.5"
                        style={i < items.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: theme.colors.border } : {}}
                        onPress={item.onPress}
                        activeOpacity={0.6}>
                        <View
                            className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                            style={{ backgroundColor: `${item.color || theme.colors.primary}15` }}>
                            <Ionicons name={item.icon} size={17} color={item.color || theme.colors.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-medium" style={{ color: theme.colors.text }}>
                                {item.label}
                            </Text>
                            {item.sub && (
                                <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                                    {item.sub}
                                </Text>
                            )}
                        </View>
                        {item.trailing || (
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

export default function MoreScreen() {
    const theme = useTheme();
    const { t } = useTranslations();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { themeChoice, setThemeChoice } = useThemeStore();
    const { languageChoice, setLanguageChoice } = useLocaleStore();

    const { data: storeData }: any = useQuery(GET_STORE_STATUS);
    const [updateStoreStatus] = useMutation(UPDATE_STORE_STATUS);
    const [setMyPreferredLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE);

    const isStoreOpen = storeData?.storeStatus?.isOpen ?? false;

    const handleToggleStore = async () => {
        try {
            await updateStoreStatus({ variables: { isOpen: !isStoreOpen } });
        } catch {
            Alert.alert('Error', 'Failed to update store status');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            t.more.logout,
            'Are you sure you want to log out?',
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.more.logout,
                    style: 'destructive',
                    onPress: async () => {
                        await deleteItemAsync('admin_auth_token');
                        logout();
                        router.replace('/login');
                    },
                },
            ],
        );
    };

    const handleThemeToggle = () => {
        const cycle = { light: 'dark' as const, dark: 'system' as const, system: 'light' as const };
        setThemeChoice(cycle[themeChoice]);
    };

    const handleLanguageToggle = async () => {
        const next = languageChoice === 'en' ? 'al' : 'en';
        setLanguageChoice(next);

        try {
            await setMyPreferredLanguage({
                variables: {
                    language: next === 'al' ? 'AL' : 'EN',
                },
            });
        } catch {
            setLanguageChoice(languageChoice);
            Alert.alert('Error', 'Failed to sync language preference');
        }
    };

    const themeLabel = themeChoice === 'light' ? 'Light' : themeChoice === 'dark' ? 'Dark' : 'System';
    const langLabel = languageChoice === 'en' ? 'English' : 'Shqip';

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Profile Card */}
                <TouchableOpacity
                    className="mx-4 mt-3 mb-5 rounded-2xl p-4 flex-row items-center"
                    style={{ backgroundColor: theme.colors.card }}
                    activeOpacity={0.7}
                    onPress={() => {}}>
                    <View
                        className="w-14 h-14 rounded-2xl items-center justify-center mr-3.5"
                        style={{ backgroundColor: `${theme.colors.primary}20` }}>
                        <Text className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                            {getInitials(`${user?.firstName || ''} ${user?.lastName || ''}`)}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                            {user?.firstName} {user?.lastName}
                        </Text>
                        <Text className="text-xs mt-0.5" style={{ color: theme.colors.subtext }}>
                            {user?.email}
                        </Text>
                        <View
                            className="self-start mt-1.5 px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${theme.colors.primary}15` }}>
                            <Text className="text-[10px] font-semibold" style={{ color: theme.colors.primary }}>
                                {user?.role?.replace(/_/g, ' ')}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Store Status */}
                <MenuSection
                    title="STORE"
                    items={[
                        {
                            icon: 'storefront',
                            label: t.more.storeStatus,
                            sub: isStoreOpen ? 'Store is Open' : 'Store is Closed',
                            color: isStoreOpen ? '#22c55e' : '#ef4444',
                            onPress: handleToggleStore,
                            trailing: (
                                <Switch
                                    value={isStoreOpen}
                                    onValueChange={handleToggleStore}
                                    trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}80` }}
                                    thumbColor={isStoreOpen ? theme.colors.primary : '#f4f3f4'}
                                />
                            ),
                        },
                    ]}
                />

                {/* Management */}
                <MenuSection
                    title="MANAGEMENT"
                    items={[
                        {
                            icon: 'business',
                            label: t.more.businesses,
                            sub: 'View & manage restaurants',
                            color: '#8b5cf6',
                            onPress: () => router.push('/businesses'),
                        },
                        {
                            icon: 'bicycle',
                            label: t.more.drivers,
                            sub: 'View driver activity',
                            color: '#3b82f6',
                            onPress: () => router.push('/drivers'),
                        },
                        {
                            icon: 'people',
                            label: t.more.users,
                            sub: 'Customer management',
                            color: '#22c55e',
                            onPress: () => router.push('/users'),
                        },
                    ]}
                />

                {/* Tools */}
                <MenuSection
                    title="TOOLS"
                    items={[
                        {
                            icon: 'notifications',
                            label: t.more.notifications,
                            sub: 'Push notification campaigns',
                            color: '#f59e0b',
                            onPress: () => router.push('/notifications'),
                        },
                        {
                            icon: 'wallet',
                            label: t.more.settlements,
                            sub: 'Payment settlements',
                            color: '#14b8a6',
                            onPress: () => router.push('/settlements'),
                        },
                    ]}
                />

                {/* Preferences */}
                <MenuSection
                    title="PREFERENCES"
                    items={[
                        {
                            icon: themeChoice === 'dark' ? 'moon' : themeChoice === 'light' ? 'sunny' : 'phone-portrait',
                            label: 'Theme',
                            sub: themeLabel,
                            color: '#6366f1',
                            onPress: handleThemeToggle,
                            trailing: (
                                <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                    <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                                        {themeLabel}
                                    </Text>
                                </View>
                            ),
                        },
                        {
                            icon: 'language',
                            label: 'Language',
                            sub: langLabel,
                            color: '#ec4899',
                            onPress: handleLanguageToggle,
                            trailing: (
                                <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}15` }}>
                                    <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                                        {langLabel}
                                    </Text>
                                </View>
                            ),
                        },
                    ]}
                />

                {/* Legal */}
                <MenuSection
                    title="LEGAL"
                    items={[
                        {
                            icon: 'shield-checkmark-outline',
                            label: 'Privacy Policy',
                            color: '#6b7280',
                            onPress: () => Linking.openURL('https://zippdelivery.com/privacy'),
                        },
                        {
                            icon: 'document-text-outline',
                            label: 'Terms of Service',
                            color: '#6b7280',
                            onPress: () => Linking.openURL('https://zippdelivery.com/terms'),
                        },
                    ]}
                />

                {/* Account */}
                <MenuSection
                    items={[
                        {
                            icon: 'log-out',
                            label: t.more.logout,
                            color: '#ef4444',
                            onPress: handleLogout,
                            trailing: null,
                        },
                    ]}
                />

                {/* Version */}
                <Text className="text-center text-xs mt-2 mb-4" style={{ color: theme.colors.subtext }}>
                    Delivery Admin v1.0.0
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
