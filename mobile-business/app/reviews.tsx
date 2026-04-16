import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GET_BUSINESS_ORDER_REVIEWS } from '@/graphql/orders';
import { useTranslation } from '@/hooks/useTranslation';

const PAGE_SIZE = 20;

const STAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function Stars({ rating }: { rating: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                    key={star}
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={16}
                    color={star <= rating ? STAR_COLORS[Math.min(rating - 1, 4)] : '#475569'}
                />
            ))}
        </View>
    );
}

function timeAgo(dateStr: string): string {
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
}

type Review = {
    id: string;
    orderId: string;
    rating: number;
    comment?: string | null;
    quickFeedback: string[];
    createdAt: string;
    user?: { id: string; firstName: string; lastName: string; phoneNumber?: string | null } | null;
};

export default function ReviewsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [offset, setOffset] = useState(0);
    const [allReviews, setAllReviews] = useState<Review[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { loading, refetch, fetchMore } = useQuery(GET_BUSINESS_ORDER_REVIEWS, {
        variables: { limit: PAGE_SIZE, offset: 0 },
        fetchPolicy: 'network-only',
        onCompleted: (data) => {
            const rows = (data?.businessOrderReviews as Review[]) ?? [];
            setAllReviews(rows);
            setOffset(rows.length);
            setHasMore(rows.length === PAGE_SIZE);
        },
    });

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        const result = await refetch({ limit: PAGE_SIZE, offset: 0 });
        const rows = (result.data?.businessOrderReviews as Review[]) ?? [];
        setAllReviews(rows);
        setOffset(rows.length);
        setHasMore(rows.length === PAGE_SIZE);
        setRefreshing(false);
    }, [refetch]);

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || loading) return;
        const result = await fetchMore({ variables: { limit: PAGE_SIZE, offset } });
        const rows = (result.data?.businessOrderReviews as Review[]) ?? [];
        setAllReviews((prev) => [...prev, ...rows]);
        setOffset((prev) => prev + rows.length);
        setHasMore(rows.length === PAGE_SIZE);
    }, [hasMore, loading, fetchMore, offset]);

    // Summary stats
    const avgRating =
        allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;
    const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: allReviews.filter((r) => r.rating === star).length,
    }));

    const renderHeader = () => (
        <View>
            {/* Summary card */}
            {allReviews.length > 0 && (
                <View
                    style={{
                        margin: 12,
                        padding: 16,
                        backgroundColor: '#1E293B',
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#334155',
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', lineHeight: 44 }}>
                                {avgRating.toFixed(1)}
                            </Text>
                            <Stars rating={Math.round(avgRating)} />
                            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                                {allReviews.length} {allReviews.length === 1 ? 'review' : 'reviews'}
                            </Text>
                        </View>
                        <View style={{ flex: 2, gap: 4 }}>
                            {ratingCounts.map(({ star, count }) => (
                                <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 11, width: 8 }}>{star}</Text>
                                    <Ionicons name="star" size={10} color="#eab308" />
                                    <View style={{ flex: 1, height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                                        <View
                                            style={{
                                                height: '100%',
                                                width: allReviews.length > 0 ? `${(count / allReviews.length) * 100}%` : '0%',
                                                backgroundColor: STAR_COLORS[star - 1],
                                                borderRadius: 3,
                                            }}
                                        />
                                    </View>
                                    <Text style={{ color: '#64748b', fontSize: 11, width: 20, textAlign: 'right' }}>{count}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: Review }) => {
        const quick = Array.isArray(item.quickFeedback) ? item.quickFeedback : [];
        const comment = String(item.comment ?? '').trim();
        return (
            <View
                style={{
                    marginHorizontal: 12,
                    marginBottom: 10,
                    padding: 14,
                    backgroundColor: '#1E293B',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#334155',
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View>
                        <Stars rating={item.rating} />
                        <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                            {item.user ? `${item.user.firstName} ${item.user.lastName}` : 'Anonymous'}
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>
                            Order #{item.orderId.slice(0, 8).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={{ color: '#475569', fontSize: 12 }}>{timeAgo(item.createdAt)}</Text>
                </View>

                {quick.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: comment ? 8 : 0 }}>
                        {quick.map((tag, i) => (
                            <View
                                key={i}
                                style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#7C3AED22', borderRadius: 20, borderWidth: 1, borderColor: '#7C3AED44' }}
                            >
                                <Text style={{ color: '#a78bfa', fontSize: 12 }}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {comment ? (
                    <Text style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 20 }}>"{comment}"</Text>
                ) : null}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#1E293B',
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ padding: 4, marginRight: 8 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', flex: 1 }}>
                    {t('reviews.title', 'Customer Reviews')}
                </Text>
            </View>

            {loading && allReviews.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={allReviews}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7C3AED" />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                            <Ionicons name="star-outline" size={48} color="#334155" />
                            <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                                {t('reviews.empty', 'No reviews yet')}
                            </Text>
                            <Text style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>
                                {t('reviews.empty_sub', 'Customer reviews will appear here')}
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        hasMore && allReviews.length > 0 ? (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <ActivityIndicator color="#7C3AED" />
                            </View>
                        ) : null
                    }
                    contentContainerStyle={{ paddingBottom: 32 }}
                />
            )}
        </SafeAreaView>
    );
}
