'use client';

import { useQuery } from '@apollo/client/react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, Star } from 'lucide-react';
import { GET_ADMIN_ORDER_REVIEWS } from '@/graphql/operations/orders';
import { GET_BUSINESS } from '@/graphql/operations/businesses';

const PAGE_SIZE = 20;

const STAR_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className="h-3.5 w-3.5"
                    fill={s <= rating ? STAR_COLORS[rating] : 'transparent'}
                    stroke={s <= rating ? STAR_COLORS[rating] : '#52525b'}
                    strokeWidth={1.5}
                />
            ))}
        </div>
    );
}

export default function BusinessReviewsPage() {
    const params = useParams();
    const router = useRouter();
    const businessId = params.id as string;

    const [ratingFilter, setRatingFilter] = useState<number | null>(null);
    const [offset, setOffset] = useState(0);

    const { data: businessData } = useQuery(GET_BUSINESS, { variables: { id: businessId } });
    const businessName = businessData?.business?.name ?? 'Business';

    const { data, loading, fetchMore } = useQuery(GET_ADMIN_ORDER_REVIEWS, {
        variables: {
            businessId,
            rating: ratingFilter ?? undefined,
            limit: PAGE_SIZE,
            offset: 0,
        },
        fetchPolicy: 'cache-and-network',
    });

    const reviews = data?.adminOrderReviews ?? [];

    function handleRatingFilter(r: number | null) {
        setRatingFilter(r);
        setOffset(0);
    }

    async function loadMore() {
        const nextOffset = offset + PAGE_SIZE;
        await fetchMore({
            variables: { businessId, rating: ratingFilter ?? undefined, limit: PAGE_SIZE, offset: nextOffset },
            updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) return prev;
                return {
                    adminOrderReviews: [
                        ...(prev.adminOrderReviews ?? []),
                        ...(fetchMoreResult.adminOrderReviews ?? []),
                    ],
                };
            },
        });
        setOffset(nextOffset);
    }

    const hasMore = reviews.length === offset + PAGE_SIZE;

    return (
        <div className="text-white space-y-6">
            {/* HEADER */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push(`/dashboard/businesses/${businessId}`)}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    {businessName}
                </button>
                <span className="text-zinc-700">/</span>
                <span className="text-sm font-medium text-zinc-200">Reviews</span>
            </div>

            {/* FILTER BAR */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500 mr-1">Filter by rating:</span>
                <button
                    onClick={() => handleRatingFilter(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        ratingFilter === null
                            ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                    }`}
                >
                    All
                </button>
                {[5, 4, 3, 2, 1].map((r) => (
                    <button
                        key={r}
                        onClick={() => handleRatingFilter(r)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            ratingFilter === r
                                ? 'bg-zinc-200 text-zinc-900 border-zinc-200'
                                : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500'
                        }`}
                    >
                        <Star className="h-3 w-3" fill={STAR_COLORS[r]} stroke={STAR_COLORS[r]} />
                        {r}
                    </button>
                ))}
            </div>

            {/* REVIEWS LIST */}
            {loading && reviews.length === 0 ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
                    ))}
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-sm">No reviews found.</div>
            ) : (
                <div className="space-y-3">
                    {reviews.map((review) => (
                        <div
                            key={review.id}
                            className="bg-[#111113] border border-[#1e1e22] rounded-xl p-4 space-y-2"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <StarRating rating={review.rating} />
                                        <span className="text-xs text-zinc-500">
                                            {review.user
                                                ? `${review.user.firstName} ${review.user.lastName}`
                                                : 'Anonymous'}
                                        </span>
                                        {review.user?.phoneNumber && (
                                            <span className="text-xs text-zinc-600">· {review.user.phoneNumber}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-600">
                                        Order #{review.orderId.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                                <span className="text-xs text-zinc-600 shrink-0">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            {review.quickFeedback.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {review.quickFeedback.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-0.5 text-xs rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {review.comment && (
                                <p className="text-sm text-zinc-300 leading-relaxed">"{review.comment}"</p>
                            )}
                        </div>
                    ))}

                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="w-full py-2.5 text-sm text-zinc-400 border border-zinc-800 rounded-xl hover:border-zinc-600 hover:text-zinc-200 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Loading…' : 'Load more'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
