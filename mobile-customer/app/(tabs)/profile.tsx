import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, Pressable, Animated, PanResponder, Linking, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { GET_ORDERS } from '@/graphql/operations/orders';
import { useQuery, useMutation } from '@apollo/client/react';
import { ProfileRow } from '@/components/ProfileRow';
import { useAuthStore } from '@/store/authStore';
import { useTranslations } from '@/hooks/useTranslations';
import { DELETE_MY_ACCOUNT_MUTATION, SET_MY_PREFERRED_LANGUAGE_MUTATION, UPDATE_MY_PROFILE_MUTATION } from '@/graphql/operations/auth';
import { AppLanguage } from '@/gql/graphql';

const SLIDER_TRACK_WIDTH = 272;
const THUMB_SIZE = 52;
const MAX_SLIDE = SLIDER_TRACK_WIDTH - THUMB_SIZE - 8;

function SlideToDelete({ onConfirmed }: { onConfirmed: () => void }) {
    const pan = useRef(new Animated.Value(0)).current;
    const confirmed = useRef(false);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
            pan.setValue(Math.max(0, Math.min(g.dx, MAX_SLIDE)));
        },
        onPanResponderRelease: (_, g) => {
            if (g.dx >= MAX_SLIDE * 0.8 && !confirmed.current) {
                confirmed.current = true;
                Animated.spring(pan, { toValue: MAX_SLIDE, useNativeDriver: false }).start();
                onConfirmed();
            } else {
                Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
            }
        },
    });

    const trackFill = pan.interpolate({ inputRange: [0, MAX_SLIDE], outputRange: ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.45)'], extrapolate: 'clamp' });

    return (
        <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Text style={{ color: 'rgba(239,68,68,0.55)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                Slide to confirm
            </Text>
            <Animated.View style={{
                width: SLIDER_TRACK_WIDTH,
                height: THUMB_SIZE + 8,
                borderRadius: 999,
                backgroundColor: trackFill,
                borderWidth: 1.5,
                borderColor: 'rgba(239,68,68,0.3)',
                justifyContent: 'center',
                overflow: 'hidden',
            }}>
                {/* ghost text */}
                <Animated.Text style={{
                    position: 'absolute',
                    alignSelf: 'center',
                    color: '#EF4444',
                    opacity: pan.interpolate({ inputRange: [0, MAX_SLIDE * 0.4], outputRange: [0.45, 0], extrapolate: 'clamp' }),
                    fontSize: 13,
                    fontWeight: '600',
                    letterSpacing: 0.3,
                }}>
                    Delete Account
                </Animated.Text>
                {/* thumb */}
                <Animated.View
                    {...panResponder.panHandlers}
                    style={{
                        position: 'absolute',
                        left: 4,
                        width: THUMB_SIZE,
                        height: THUMB_SIZE,
                        borderRadius: THUMB_SIZE / 2,
                        backgroundColor: '#EF4444',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#EF4444',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.4,
                        shadowRadius: 6,
                        elevation: 4,
                        transform: [{ translateX: pan }],
                    }}
                >
                    <Ionicons name="chevron-forward" size={22} color="#fff" />
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#DB2777', '#EA580C', '#16A34A', '#0891B2'];

function getAvatarColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Profile() {
    const theme = useTheme();
    const router = useRouter();
    const { logout } = useAuth();
    const user = useAuthStore((state) => state.user);
    const { data: ordersData } = useQuery(GET_ORDERS, { fetchPolicy: 'cache-only' });
    const orders: any[] = (ordersData as any)?.orders ?? [];
    const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED');

    const firstName = user?.firstName ?? '';
    const lastName = user?.lastName ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const displayName = fullName || user?.email?.split('@')[0] || 'User';
    const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
        : (user?.email?.substring(0, 2) ?? 'U').toUpperCase();
    const avatarColor = getAvatarColor(user?.id ?? user?.email ?? 'user');

    const handleLogout = () => { logout(); };

    const [deleteMyAccount, { loading: deletingAccount }] = useMutation(DELETE_MY_ACCOUNT_MUTATION);
    const [setMyPreferredLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE_MUTATION);
    const [updateMyProfile, { loading: savingProfile }] = useMutation(UPDATE_MY_PROFILE_MUTATION);
    const [deleteModalStep, setDeleteModalStep] = useState<0 | 1 | 2>(0);
    const updateUser = useAuthStore((state) => state.updateUser);

    const [editProfileVisible, setEditProfileVisible] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editPhone, setEditPhone] = useState('');

    const openEditProfile = () => {
        setEditFirstName(user?.firstName ?? '');
        setEditLastName(user?.lastName ?? '');
        setEditPhone(user?.phoneNumber ?? '');
        setEditProfileVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editFirstName.trim() || !editLastName.trim()) {
            Alert.alert('Error', 'First name and last name are required');
            return;
        }
        try {
            const result = await updateMyProfile({
                variables: {
                    input: {
                        firstName: editFirstName.trim(),
                        lastName: editLastName.trim(),
                        phoneNumber: editPhone.trim() || null,
                    },
                },
            });
            if (result.data?.updateMyProfile && user) {
                updateUser({ ...user, ...result.data.updateMyProfile } as any);
            }
            setEditProfileVisible(false);
        } catch {
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    const handleDeleteAccount = () => setDeleteModalStep(1);

    const handleDeleteConfirmed = async () => {
        setDeleteModalStep(0);
        try {
            await deleteMyAccount();
            logout();
        } catch {
            Alert.alert(t.common?.error || 'Error', (t.profile as any).delete_account_error || 'Failed to delete account');
        }
    };

    const { t, languageChoice, setLanguageChoice } = useTranslations();

    const handleLanguageChoice = async (choice: 'en' | 'al') => {
        setLanguageChoice(choice);
        try {
            await setMyPreferredLanguage({
                variables: { language: choice === 'al' ? AppLanguage.Al : AppLanguage.En },
            });
        } catch {}
    };

    const ordersSubtitle =
        orders.length > 0
            ? `${orders.length} ${orders.length !== 1 ? t.profile.order_count_plural : t.profile.order_count}`
            : t.profile.no_orders;

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* ── Avatar + Name Header ──────────────────────────── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, alignItems: 'center' }}>
                    {/* Avatar */}
                    <View
                        style={{
                            width: 84,
                            height: 84,
                            borderRadius: 42,
                            backgroundColor: avatarColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 14,
                            shadowColor: avatarColor,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.35,
                            shadowRadius: 10,
                            elevation: 8,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>
                            {initials}
                        </Text>
                    </View>

                    {/* Name */}
                    <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}>
                        {displayName}
                    </Text>
                    {/* Email */}
                    {user?.email ? (
                        <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 3, textAlign: 'center' }}>
                            {user.email}
                        </Text>
                    ) : null}
                    {/* Phone */}
                    {user?.phoneNumber ? (
                        <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 2, textAlign: 'center' }}>
                            {user.phoneNumber}
                        </Text>
                    ) : null}
                </View>

                {/* ── Orders Section ──────────────────────────────────── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <ProfileRow
                        title={t.profile.order_history}
                        subtitle={ordersSubtitle}
                        icon="receipt-outline"
                        onPress={() => router.push('/orders/history')}
                        showDivider={false}
                    />
                </View>

                {/* ── Account Section ─────────────────────────────────── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <ProfileRow title="Edit Profile" icon="person-outline" onPress={openEditProfile} />
                    <ProfileRow title={t.profile.my_addresses} icon="location-outline" onPress={() => router.push('/addresses')} />
                    <ProfileRow title={t.profile.contact_support} icon="chatbubble-outline" onPress={() => Linking.openURL('mailto:support@zippdelivery.com')} />
                    <ProfileRow title="Privacy Policy" icon="shield-checkmark-outline" onPress={() => Linking.openURL('https://zippdelivery.com/privacy')} />
                    <ProfileRow title="Terms of Service" icon="document-text-outline" onPress={() => Linking.openURL('https://zippdelivery.com/terms')} showDivider={false} />
                </View>

                {/* ── Language ─────────────────────────────────────────── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
                    <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>
                        Language / Gjuha
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {(['en', 'al'] as const).map((lang) => {
                            const active = languageChoice === lang;
                            return (
                                <TouchableOpacity
                                    key={lang}
                                    onPress={() => handleLanguageChoice(lang)}
                                    activeOpacity={0.75}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 14,
                                        borderWidth: 1.5,
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.card,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 18 }}>{lang === 'en' ? '🇬🇧' : '🇦🇱'}</Text>
                                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
                                        {lang === 'en' ? 'English' : 'Shqip'}
                                    </Text>
                                    {active && <Ionicons name="checkmark" size={16} color="#16A34A" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Danger Zone ──────────────────────────────────────── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#EF444430', backgroundColor: theme.colors.card }}>
                    <ProfileRow
                        title={(t.profile as any).delete_account || 'Delete Account'}
                        icon="trash-outline"
                        onPress={handleDeleteAccount}
                        showDivider={false}
                    />
                </View>

                {/* ── Logout ────────────────────────────────────────────── */}
                <View style={{ marginHorizontal: 16, marginBottom: 36 }}>
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.8}
                        style={{
                            paddingVertical: 15,
                            borderRadius: 14,
                            alignItems: 'center',
                            backgroundColor: '#EF444415',
                            borderWidth: 1.5,
                            borderColor: '#EF444440',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '700' }}>
                            {t.profile.logout}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* ── Edit Profile Modal ── */}
            <Modal
                visible={editProfileVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditProfileVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                        onPress={() => setEditProfileVisible(false)}
                    >
                        <Pressable onPress={() => {}}>
                            <View style={{
                                backgroundColor: theme.colors.card,
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                paddingHorizontal: 20,
                                paddingTop: 20,
                                paddingBottom: 40,
                            }}>
                                {/* Handle */}
                                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 20 }} />
                                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 20 }}>Edit Profile</Text>

                                {/* First Name */}
                                <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>First Name</Text>
                                <TextInput
                                    value={editFirstName}
                                    onChangeText={setEditFirstName}
                                    placeholder="First name"
                                    placeholderTextColor={theme.colors.subtext}
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                        fontSize: 15,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        marginBottom: 14,
                                    }}
                                />

                                {/* Last Name */}
                                <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Last Name</Text>
                                <TextInput
                                    value={editLastName}
                                    onChangeText={setEditLastName}
                                    placeholder="Last name"
                                    placeholderTextColor={theme.colors.subtext}
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                        fontSize: 15,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        marginBottom: 14,
                                    }}
                                />

                                {/* Phone */}
                                <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Phone Number</Text>
                                <TextInput
                                    value={editPhone}
                                    onChangeText={setEditPhone}
                                    placeholder="Phone number (optional)"
                                    placeholderTextColor={theme.colors.subtext}
                                    keyboardType="phone-pad"
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        color: theme.colors.text,
                                        fontSize: 15,
                                        paddingHorizontal: 14,
                                        paddingVertical: 12,
                                        marginBottom: 24,
                                    }}
                                />

                                {/* Save button */}
                                <TouchableOpacity
                                    onPress={handleSaveProfile}
                                    disabled={savingProfile}
                                    activeOpacity={0.8}
                                    style={{
                                        backgroundColor: theme.colors.primary,
                                        borderRadius: 14,
                                        paddingVertical: 15,
                                        alignItems: 'center',
                                        opacity: savingProfile ? 0.6 : 1,
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                                        {savingProfile ? 'Saving...' : 'Save Changes'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Delete Account Modal ── */}
            <Modal
                visible={deleteModalStep > 0}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalStep(0)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
                    onPress={() => setDeleteModalStep(0)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: theme.colors.card,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            paddingHorizontal: 24,
                            paddingTop: 12,
                            paddingBottom: 40,
                            borderTopWidth: 1,
                            borderColor: theme.colors.border,
                        }}
                    >
                        {/* Drag handle */}
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 24 }} />

                        {/* Icon */}
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF444418', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
                            <Ionicons name="trash-outline" size={34} color="#EF4444" />
                        </View>

                        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 }}>
                            Delete Account?
                        </Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
                            This will permanently erase your account, order history, and all personal data. This cannot be undone.
                        </Text>

                        {deleteModalStep === 1 ? (
                            <View style={{ marginTop: 28, gap: 12 }}>
                                <TouchableOpacity
                                    onPress={() => setDeleteModalStep(2)}
                                    activeOpacity={0.8}
                                    style={{
                                        backgroundColor: '#EF444415',
                                        borderRadius: 14,
                                        paddingVertical: 15,
                                        alignItems: 'center',
                                        borderWidth: 1.5,
                                        borderColor: '#EF444440',
                                    }}
                                >
                                    <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>I understand, continue</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setDeleteModalStep(0)}
                                    activeOpacity={0.7}
                                    style={{
                                        backgroundColor: theme.colors.background,
                                        borderRadius: 14,
                                        paddingVertical: 15,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                    }}
                                >
                                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <SlideToDelete onConfirmed={handleDeleteConfirmed} />
                                <TouchableOpacity
                                    onPress={() => setDeleteModalStep(0)}
                                    activeOpacity={0.7}
                                    style={{ marginTop: 16, paddingVertical: 14, alignItems: 'center' }}
                                >
                                    <Text style={{ color: theme.colors.subtext, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
