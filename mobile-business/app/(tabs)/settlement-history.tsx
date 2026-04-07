import { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { GET_MY_SETTLEMENT_REQUESTS } from '@/graphql/settlements';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';

type HistoryStatus = 'ALL' | 'ACCEPTED' | 'REJECTED';

function formatCurrency(amount: number) {
    return `€${amount.toFixed(2)}`;
}

function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return '—';
    try {
        return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
    } catch {
        return '—';
    }
}

export default function SettlementHistoryScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuthStore();
    const [statusFilter, setStatusFilter] = useState<HistoryStatus>('ALL');
    const [refreshing, setRefreshing] = useState(false);

    const businessId = user?.businessId ?? '';

    const {
        data,
        loading,
        refetch,
    } = useQuery(GET_MY_SETTLEMENT_REQUESTS, {
        variables: { businessId, limit: 200 },
        skip: !businessId,
        fetchPolicy: 'network-only',
    });

    const allRequests: any[] = (data as any)?.settlementRequests ?? [];

    const historyRequests = useMemo(() => {
        const base = allRequests.filter((r: any) => r.status !== 'PENDING');
        if (statusFilter === 'ALL') {
            return base;
        }
        return base.filter((r: any) => String(r.status) === statusFilter);
    }, [allRequests, statusFilter]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const filters: Array<{ key: HistoryStatus; label: string }> = [
        { key: 'ALL', label: t('common.all', 'All') },
        { key: 'ACCEPTED', label: t('finances.accepted', 'Accepted') },
        { key: 'REJECTED', label: t('finances.rejected', 'Rejected') },
    ];

    return (
        <SafeAreaView className="flex-1 bg-[#0a0f1a]">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 36 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
            >
                <View className="px-5 mt-5">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>
                            {t('finances.settlement_request_history', 'Settlement Request History')}
                        </Text>
                        <Pressable onPress={() => router.back()}>
                            <Text style={{ color: '#a78bfa', fontSize: 13, fontWeight: '700' }}>
                                {t('common.back', 'Back')}
                            </Text>
                        </Pressable>
                    </View>
                    <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                        {t('finances.history_subtitle', 'Business ↔ Platform settlements and outcomes')}
                    </Text>
                </View>

                <View className="px-5 mt-4">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {filters.map((f) => {
                            const active = statusFilter === f.key;
                            return (
                                <Pressable
                                    key={f.key}
                                    onPress={() => setStatusFilter(f.key)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 7,
                                        borderRadius: 999,
                                        backgroundColor: active ? '#7C3AED' : '#1a2233',
                                        borderWidth: 1,
                                        borderColor: active ? '#7C3AED' : '#263145',
                                    }}
                                >
                                    <Text style={{ color: active ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: '700' }}>
                                        {f.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>

                <View className="px-5 mt-5">
                    {loading ? (
                        <ActivityIndicator color="#7C3AED" />
                    ) : historyRequests.length === 0 ? (
                        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#263145', backgroundColor: '#111827', padding: 14 }}>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                                {t('finances.no_settlement_request_history', 'No settlement request history yet.')}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#263145', overflow: 'hidden' }}>
                            {historyRequests.map((req: any, idx: number) => {
                                const status = String(req.status ?? 'UNKNOWN');
                                const amount = formatCurrency(Number(req.amount ?? 0));
                                const requestedAt = formatDateTime(req.createdAt);
                                const respondedAt = formatDateTime(req.respondedAt);
                                const note = req.note ? String(req.note) : null;
                                const reason = req.reason ? String(req.reason) : null;

                                const statusColor =
                                    status === 'ACCEPTED'
                                        ? '#22c55e'
                                        : status === 'REJECTED'
                                            ? '#ef4444'
                                            : '#94a3b8';

                                return (
                                    <View
                                        key={req.id}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 12,
                                            backgroundColor: idx % 2 === 0 ? '#0d1421' : '#0a0f1a',
                                            borderBottomWidth: idx < historyRequests.length - 1 ? 1 : 0,
                                            borderBottomColor: '#1a2233',
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{amount}</Text>
                                            <View
                                                style={{
                                                    borderRadius: 999,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderWidth: 1,
                                                    borderColor: `${statusColor}60`,
                                                    backgroundColor: `${statusColor}20`,
                                                }}
                                            >
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>
                                                    {status.replace('_', ' ')}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                            {t('finances.requested_on', 'Requested')}: {requestedAt}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                            {t('finances.responded_on', 'Responded')}: {respondedAt}
                                        </Text>

                                        {note ? (
                                            <Text style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6 }}>
                                                {t('finances.comment', 'Comment')}: "{note}"
                                            </Text>
                                        ) : null}

                                        {reason ? (
                                            <Text style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>
                                                {t('finances.reject_reason', 'Rejection reason')}: "{reason}"
                                            </Text>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
