import { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation, useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { hasBusinessPermission } from '@/lib/rbac';
import { UserPermission } from '@/gql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useNotificationSettingsStore } from '@/store/useNotificationSettingsStore';
import { CHANGE_MY_PASSWORD } from '@/graphql/auth';
import { GET_BUSINESS_SCHEDULE, SET_BUSINESS_SCHEDULE } from '@/graphql/business';

type DayState = {
    dayOfWeek: number;
    label: string;
    enabled: boolean;
    opensAt: string;
    closesAt: string;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isValidTime(value: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export default function SettingsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { languageChoice, setLanguageChoice } = useLocaleStore();
    const { pushEnabled, setPushEnabled } = useNotificationSettingsStore();
    const canManageSettings = hasBusinessPermission(user, UserPermission.ManageSettings);

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);

    const [dayStates, setDayStates] = useState<DayState[]>(
        DAY_LABELS.map((label, dayOfWeek) => ({
            dayOfWeek,
            label,
            enabled: true,
            opensAt: '09:00',
            closesAt: '23:00',
        })),
    );

    const businessId = user?.businessId ?? '';

    const { data: scheduleData, refetch: refetchSchedule } = useQuery(GET_BUSINESS_SCHEDULE, {
        variables: { businessId },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    useEffect(() => {
        const slots: any[] = (scheduleData as any)?.business?.schedule ?? [];
        setDayStates((prev) =>
            prev.map((d) => {
                const match = slots.find((s) => Number(s.dayOfWeek) === d.dayOfWeek);
                if (!match) {
                    return { ...d, enabled: false };
                }
                return {
                    ...d,
                    enabled: true,
                    opensAt: match.opensAt,
                    closesAt: match.closesAt,
                };
            }),
        );
    }, [scheduleData]);

    const [changeMyPassword] = useMutation(CHANGE_MY_PASSWORD);
    const [setBusinessSchedule] = useMutation(SET_BUSINESS_SCHEDULE);

    const scheduleCount = useMemo(
        () => dayStates.filter((d) => d.enabled).length,
        [dayStates],
    );

    if (!canManageSettings) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <Ionicons name="lock-closed" size={42} color="#ef4444" />
                <Text className="text-text text-xl font-bold mt-4">{t('settings.access_restricted', 'Access Restricted')}</Text>
                <Text className="text-subtext text-center mt-2">
                    {t('settings.no_permission', 'You do not have permission to manage settings.')}
                </Text>
                <TouchableOpacity
                    className="bg-primary px-4 py-3 rounded-xl mt-5"
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text className="text-white font-semibold">{t('settings.back_to_orders', 'Back to Orders')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleLogout = () => {
        Alert.alert(t('settings.logout', 'Logout'), t('settings.logout_confirm', 'Are you sure you want to logout?'), [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
                text: t('settings.logout', 'Logout'),
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/login');
                },
            },
        ]);
    };

    const handleSubmitPassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert(t('common.error', 'Error'), 'Please fill all password fields.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert(t('common.error', 'Error'), 'New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(t('common.error', 'Error'), 'Password confirmation does not match.');
            return;
        }

        setSavingPassword(true);
        try {
            await changeMyPassword({
                variables: {
                    currentPassword,
                    newPassword,
                },
            });
            Alert.alert(t('common.success', 'Success'), 'Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordModalOpen(false);
        } catch (err: any) {
            Alert.alert(t('common.error', 'Error'), err?.message ?? 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleSaveSchedule = async () => {
        const payload = dayStates
            .filter((d) => d.enabled)
            .map((d) => ({
                dayOfWeek: d.dayOfWeek,
                opensAt: d.opensAt,
                closesAt: d.closesAt,
            }));

        if (payload.length === 0) {
            Alert.alert(t('common.error', 'Error'), 'At least one day must be enabled.');
            return;
        }

        for (const slot of payload) {
            if (!isValidTime(slot.opensAt) || !isValidTime(slot.closesAt)) {
                Alert.alert(t('common.error', 'Error'), 'Time format must be HH:mm');
                return;
            }
        }

        setSavingSchedule(true);
        try {
            await setBusinessSchedule({
                variables: {
                    businessId,
                    schedule: payload,
                },
            });
            await refetchSchedule();
            Alert.alert(t('common.success', 'Success'), 'Business hours updated.');
            setScheduleModalOpen(false);
        } catch (err: any) {
            Alert.alert(t('common.error', 'Error'), err?.message ?? 'Failed to update schedule');
        } finally {
            setSavingSchedule(false);
        }
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
                <Ionicons name={icon} size={20} color="#7C3AED" />
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
            <View className="px-4 py-3 border-b border-gray-800">
                <Text className="text-text text-2xl font-bold">{t('settings.title', 'Settings')}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
                <SettingSection title={t('settings.business', 'Business')}>
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
                                    <Ionicons name="storefront" size={32} color="#7C3AED" />
                                </View>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-text font-bold text-lg">{user?.business?.name}</Text>
                            <Text className="text-subtext text-sm capitalize">{user?.business?.businessType.toLowerCase()}</Text>
                        </View>
                    </View>

                    <SettingRow
                        icon="time"
                        label={t('settings.business_hours', 'Business Hours')}
                        value={`${scheduleCount} day(s) active`}
                        onPress={() => setScheduleModalOpen(true)}
                    />
                </SettingSection>

                <SettingSection title={t('settings.account', 'Account')}>
                    <View className="py-4 px-4 border-b border-gray-700">
                        <Text className="text-text font-semibold mb-1">
                            {user?.firstName} {user?.lastName}
                        </Text>
                        <Text className="text-subtext text-sm">{user?.email}</Text>
                    </View>
                    <SettingRow
                        icon="lock-closed"
                        label={t('settings.change_password', 'Change Password')}
                        onPress={() => setPasswordModalOpen(true)}
                    />
                </SettingSection>

                <SettingSection title={t('settings.notifications', 'Notifications')}>
                    <SettingRow
                        icon="notifications"
                        label={t('settings.push_notifications', 'Push Notifications')}
                        showChevron={false}
                        renderRight={() => (
                            <Switch
                                value={pushEnabled}
                                onValueChange={(next) => setPushEnabled(next)}
                                trackColor={{ false: '#6b7280', true: '#7C3AED' }}
                                thumbColor="#fff"
                            />
                        )}
                    />
                </SettingSection>

                <SettingSection title={t('settings.language', 'Language')}>
                    <View className="flex-row items-center justify-between py-4 px-4">
                        <Text className="text-text font-medium">{t('settings.language', 'Language')}</Text>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className={`px-3 py-1.5 rounded-full ${languageChoice === 'en' ? 'bg-primary' : 'bg-card'}`}
                                onPress={() => setLanguageChoice('en')}
                            >
                                <Text className={`${languageChoice === 'en' ? 'text-white' : 'text-subtext'} font-semibold`}>EN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`px-3 py-1.5 rounded-full ${languageChoice === 'al' ? 'bg-primary' : 'bg-card'}`}
                                onPress={() => setLanguageChoice('al')}
                            >
                                <Text className={`${languageChoice === 'al' ? 'text-white' : 'text-subtext'} font-semibold`}>SQ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SettingSection>

                <View className="mx-4">
                    <TouchableOpacity
                        className="bg-danger/20 py-4 rounded-xl flex-row items-center justify-center"
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out" size={20} color="#ef4444" />
                        <Text className="text-danger font-semibold ml-2">{t('settings.logout', 'Logout')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={passwordModalOpen} transparent animationType="slide" onRequestClose={() => setPasswordModalOpen(false)}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-card rounded-t-3xl p-5 border-t border-gray-700">
                        <Text className="text-text text-lg font-bold mb-4">{t('settings.change_password', 'Change Password')}</Text>
                        <TextInput
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Current password"
                            placeholderTextColor="#6b7280"
                            secureTextEntry
                            className="bg-background text-text rounded-xl px-4 py-3 mb-3"
                        />
                        <TextInput
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="New password"
                            placeholderTextColor="#6b7280"
                            secureTextEntry
                            className="bg-background text-text rounded-xl px-4 py-3 mb-3"
                        />
                        <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            placeholderTextColor="#6b7280"
                            secureTextEntry
                            className="bg-background text-text rounded-xl px-4 py-3 mb-4"
                        />

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-gray-700 rounded-xl py-3 items-center"
                                onPress={() => setPasswordModalOpen(false)}
                            >
                                <Text className="text-subtext font-semibold">{t('common.cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary rounded-xl py-3 items-center"
                                onPress={handleSubmitPassword}
                                disabled={savingPassword}
                            >
                                {savingPassword ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">{t('common.save', 'Save')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={scheduleModalOpen} transparent animationType="slide" onRequestClose={() => setScheduleModalOpen(false)}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-card rounded-t-3xl p-5 border-t border-gray-700 max-h-[85%]">
                        <Text className="text-text text-lg font-bold mb-4">{t('settings.business_hours', 'Business Hours')}</Text>

                        <ScrollView>
                            {dayStates.map((day) => (
                                <View key={day.dayOfWeek} className="mb-3 p-3 rounded-xl bg-background border border-gray-700">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="text-text font-semibold">{day.label}</Text>
                                        <Switch
                                            value={day.enabled}
                                            onValueChange={(enabled) =>
                                                setDayStates((prev) =>
                                                    prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? { ...d, enabled } : d)),
                                                )
                                            }
                                            trackColor={{ false: '#6b7280', true: '#7C3AED' }}
                                            thumbColor="#fff"
                                        />
                                    </View>

                                    {day.enabled && (
                                        <View className="flex-row gap-2">
                                            <TextInput
                                                value={day.opensAt}
                                                onChangeText={(opensAt) =>
                                                    setDayStates((prev) =>
                                                        prev.map((d) =>
                                                            d.dayOfWeek === day.dayOfWeek ? { ...d, opensAt } : d,
                                                        ),
                                                    )
                                                }
                                                placeholder="09:00"
                                                placeholderTextColor="#6b7280"
                                                className="flex-1 bg-card text-text rounded-lg px-3 py-2 border border-gray-700"
                                            />
                                            <TextInput
                                                value={day.closesAt}
                                                onChangeText={(closesAt) =>
                                                    setDayStates((prev) =>
                                                        prev.map((d) =>
                                                            d.dayOfWeek === day.dayOfWeek ? { ...d, closesAt } : d,
                                                        ),
                                                    )
                                                }
                                                placeholder="23:00"
                                                placeholderTextColor="#6b7280"
                                                className="flex-1 bg-card text-text rounded-lg px-3 py-2 border border-gray-700"
                                            />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <View className="flex-row gap-3 mt-3">
                            <TouchableOpacity
                                className="flex-1 bg-gray-700 rounded-xl py-3 items-center"
                                onPress={() => setScheduleModalOpen(false)}
                            >
                                <Text className="text-subtext font-semibold">{t('common.cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary rounded-xl py-3 items-center"
                                onPress={handleSaveSchedule}
                                disabled={savingSchedule}
                            >
                                {savingSchedule ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">{t('common.save', 'Save')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
