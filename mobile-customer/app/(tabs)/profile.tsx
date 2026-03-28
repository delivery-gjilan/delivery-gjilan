import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, Pressable, Animated, PanResponder } from 'react-native';
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
import { DELETE_MY_ACCOUNT_MUTATION, SET_MY_PREFERRED_LANGUAGE_MUTATION } from '@/graphql/operations/auth';
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
    const [deleteModalStep, setDeleteModalStep] = useState<0 | 1 | 2>(0);

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

                    {/* Stats row */}
                    <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
                        <View style={{
                            backgroundColor: theme.colors.card,
                            borderRadius: 14,
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            minWidth: 100,
                        }}>
                            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
                                {orders.length}
                            </Text>
                            <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                Orders
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: theme.colors.card,
                            borderRadius: 14,
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            minWidth: 100,
                        }}>
                            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
                                {deliveredOrders.length}
                            </Text>
                            <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                Delivered
                            </Text>
                        </View>
                    </View>
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
                    <ProfileRow title={t.profile.my_addresses} icon="location-outline" onPress={() => router.push('/addresses')} />
                    <ProfileRow title={t.profile.contact_support} icon="chatbubble-outline" onPress={() => {}} showDivider={false} />
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
                                        borderWidth: active ? 2 : 1.5,
                                        borderColor: active ? theme.colors.primary : theme.colors.border,
                                        backgroundColor: active ? theme.colors.primary + '15' : theme.colors.card,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 18 }}>{lang === 'en' ? '🇬🇧' : '🇦🇱'}</Text>
                                    <Text style={{ color: active ? theme.colors.primary : theme.colors.text, fontSize: 14, fontWeight: active ? '700' : '500' }}>
                                        {lang === 'en' ? 'English' : 'Shqip'}
                                    </Text>
                                    {active && <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />}
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
