import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView as RNScrollView, LayoutChangeEvent, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
    useSharedValue, useAnimatedScrollHandler,
    useAnimatedStyle, interpolate, Extrapolate, runOnJS, withTiming,
    FadeInDown, FadeIn,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router as expoRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useBusiness } from './hooks/useBusiness';
import { useProducts } from './hooks/useProducts';
import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT_CATEGORIES } from '@/graphql/operations/products';
import { GET_PROMOTION_THRESHOLDS } from '@/graphql/operations/promotions';
import { BusinessHeader, HERO_HEIGHT } from './components/BusinessHeader';
import { ProductCard } from './components/ProductCard';
import { ErrorMessage } from './components/ErrorMessage';
import { BusinessHeaderSkeleton, ProductCardSkeleton } from '@/components/Skeleton';
import { GetProductsQuery, BusinessType } from '@/gql/graphql';
import { useCart } from '@/modules/cart/hooks/useCart';
import { calculateItemTotal, calculateCartItemCount } from '@/modules/cart/utils/price';
import { PromotionProgressBar } from '@/modules/cart/components/PromotionProgressBar';

type ProductCardItem = GetProductsQuery['products'][number];

interface BusinessScreenProps {
    businessId: string;
}

type PromoLike = {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    type?: string | null;
    creatorType?: string | null;
    discountValue?: number | null;
    spendThreshold?: number | null;
    priority?: number | null;
    requiresCode?: boolean | null;
    applyMethod?: string | null;
    target?: string | null;
    maxUsagePerUser?: number | null;
    maxGlobalUsage?: number | null;
    endsAt?: string | null;
    eligibleBusinessIds?: string[] | null;
    description?: string | null;
};

// ─── Category Tabs (Underline style) ────────────────────────
function CategoryTabs({
    categories,
    activeId,
    onPress,
}: {
    categories: { id: string; name: string }[];
    activeId: string | null;
    onPress: (id: string) => void;
}) {
    const theme = useTheme();
    const scrollRef = useRef<RNScrollView>(null);
    const tabPositions = useRef<Map<string, number>>(new Map());

    const scrollToTab = useCallback((id: string) => {
        const x = tabPositions.current.get(id);
        if (x !== undefined && scrollRef.current) {
            scrollRef.current.scrollTo({ x: Math.max(0, x - 40), animated: true });
        }
    }, []);

    return (
        <RNScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            style={{ flexGrow: 0 }}
        >
            {categories.map((cat) => {
                const isActive = cat.id === activeId;
                return (
                    <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                            onPress(cat.id);
                            scrollToTab(cat.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onLayout={(e) => {
                            tabPositions.current.set(cat.id, e.nativeEvent.layout.x);
                        }}
                        activeOpacity={0.7}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            marginRight: 4,
                            borderBottomWidth: 2.5,
                            borderBottomColor: isActive ? theme.colors.primary : 'transparent',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: isActive ? '800' : '600',
                                color: isActive ? theme.colors.text : theme.colors.subtext,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </RNScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════
// ─── Main Screen ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function BusinessScreen({ businessId }: BusinessScreenProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { business, loading: businessLoading, error: businessError } = useBusiness(businessId);
    const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts(businessId);

    // ─── Cart items for this business (for progress bar) ────
    const { items: cartItems } = useCart();
    const businessCartItems = useMemo(
        () => cartItems.filter((item) => item.businessId === businessId),
        [cartItems, businessId],
    );
    const businessCartTotal = useMemo(
        () => businessCartItems.reduce((sum, item) => sum + calculateItemTotal(item), 0),
        [businessCartItems],
    );
    const businessCartCount = useMemo(
        () => calculateCartItemCount(businessCartItems),
        [businessCartItems],
    );

    // Stable minimal context — only changes when businessId changes.
    // We DON'T include cart items here to avoid creating a new reference every render,
    // which would cause Apollo to re-query in an infinite loop.
    const thresholdQueryContext = useMemo(() => ({
        items: [],
        subtotal: 0,
        deliveryPrice: 0,
        businessIds: [businessId],
    }), [businessId]);

    const { data: thresholdsData } = useQuery(GET_PROMOTION_THRESHOLDS, {
        variables: { cart: thresholdQueryContext },
        fetchPolicy: 'cache-and-network',
        context: { silentErrors: true },
        skip: !businessId,
    });

    const applicableThreshold = useMemo(() => {
        const list = thresholdsData?.getPromotionThresholds;
        if (!list || list.length === 0) return null;
        const matching = list.filter((p: any) => {
            if (!p || !p.spendThreshold) return false;
            const ids = p.eligibleBusinessIds || [];
            return ids.length === 0 || ids.includes(businessId);
        });
        if (matching.length === 0) return null;
        matching.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
        return matching[0];
    }, [thresholdsData, businessId]);

    const thresholdSpend = applicableThreshold?.spendThreshold;
    const thresholdProgress = thresholdSpend ? Math.min(Number(businessCartTotal) / Number(thresholdSpend), 1) : 0;
    const thresholdAmountRemaining = thresholdSpend ? Math.max(0, Number(thresholdSpend) - Number(businessCartTotal)) : 0;
    const formatCurrency = (value: number) => `€${Number(value).toFixed(2)}`;

    // Minimum order progress
    const minOrderAmount = Number((business as any)?.minOrderAmount ?? 0);
    const minimumMet = minOrderAmount <= 0 || businessCartTotal >= minOrderAmount;
    const minOrderProgress = minOrderAmount > 0 ? Math.min(businessCartTotal / minOrderAmount, 1) : 1;
    const amountUntilMinimum = Math.max(0, minOrderAmount - businessCartTotal);



    const { data: categoriesData, refetch: refetchCategories } = useQuery(GET_PRODUCT_CATEGORIES, {
        variables: { businessId },
        skip: !businessId,
        fetchPolicy: 'cache-and-network',
    });

    // Refetch categories and products when screen focuses (to show newly added items from admin)
    useFocusEffect(
        useCallback(() => {
            refetchCategories();
            refetchProducts();
        }, [refetchCategories, refetchProducts])
    );

    const scrollY = useSharedValue(0);
    const scrollRef = useRef<any>(null);

    // ─── State ──────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [showStickySearch, setShowStickySearch] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [showPromoDetails, setShowPromoDetails] = useState(false);
    const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
    const searchInputRef = useRef<TextInput>(null);
    const showStickySearchRef = useRef(false);
    const searchVisibilityProgress = useSharedValue(0);
    const sectionOffsetsRef = useRef<{ id: string; y: number }[]>([]);
    const productsContainerY = useRef(0);
    const stickyHeight = useRef(0);

    const formatPromotionLabel = useCallback(
        (promotion: PromoLike) => {
            if (promotion.type === 'PERCENTAGE' && promotion.discountValue) {
                return t.business.item_discount.replace('{{percent}}', String(Math.round(promotion.discountValue)));
            }
            if (promotion.type === 'FIXED_AMOUNT' && promotion.discountValue) {
                return t.business.flat_discount.replace('{{amount}}', promotion.discountValue.toFixed(2));
            }
            if (promotion.type === 'FREE_DELIVERY') {
                return t.business.free_delivery;
            }
            if (promotion.type === 'SPEND_X_GET_FREE' && promotion.spendThreshold) {
                return t.business.free_delivery_over.replace('{{threshold}}', String(Math.round(promotion.spendThreshold)));
            }
            if (promotion.type === 'SPEND_X_GET_FREE') {
                return t.business.free_delivery;
            }
            if (promotion.type === 'SPEND_X_PERCENT' && promotion.discountValue) {
                return promotion.spendThreshold
                    ? t.business.percent_off_over
                        .replace('{{percent}}', String(Math.round(promotion.discountValue)))
                        .replace('{{threshold}}', String(Math.round(promotion.spendThreshold)))
                    : t.business.item_discount.replace('{{percent}}', String(Math.round(promotion.discountValue)));
            }
            if (promotion.type === 'SPEND_X_FIXED' && promotion.discountValue) {
                return promotion.spendThreshold
                    ? t.business.flat_off_over
                        .replace('{{amount}}', promotion.discountValue.toFixed(2))
                        .replace('{{threshold}}', String(Math.round(promotion.spendThreshold)))
                    : t.business.flat_discount.replace('{{amount}}', promotion.discountValue.toFixed(2));
            }

            return promotion.name || t.business.promo_details_title;
        },
        [t],
    );

    const formatPromotionCondition = useCallback(
        (promotion: PromoLike) => {
            const parts: string[] = [];

            if (typeof promotion.spendThreshold === 'number' && promotion.spendThreshold > 0) {
                parts.push(`€${Number(promotion.spendThreshold).toFixed(2)} ${t.business.promo_condition_min_spend}`);
            }

            if (promotion.code) {
                parts.push(t.business.promo_badge_code_required);
            } else {
                parts.push(t.business.promo_badge_auto_apply);
            }

            if (typeof promotion.maxUsagePerUser === 'number' && promotion.maxUsagePerUser > 0) {
                if (promotion.maxUsagePerUser === 1) {
                    parts.push(t.business.promo_chip_one_time_only);
                } else {
                    parts.push(
                        t.business.promo_chip_usage_per_user.replace(
                            '{{count}}',
                            String(promotion.maxUsagePerUser),
                        ),
                    );
                }
            }

            return parts.join(' • ');
        },
        [t],
    );

    const getPromotionBreakdownChips = useCallback(
        (promotion: PromoLike) => {
            const chips: string[] = [];
            const applyMethod = (promotion.applyMethod ?? '').toUpperCase();
            const target = (promotion.target ?? '').toUpperCase();

            chips.push(t.business.promo_scope_business);
            chips.push(
                applyMethod === 'CODE_REQUIRED' || promotion.code
                    ? t.business.promo_badge_code_required
                    : t.business.promo_badge_auto_apply,
            );

            if (target === 'FIRST_ORDER') {
                chips.push(t.business.promo_target_first_order);
            } else if (target === 'SPECIFIC_USERS') {
                chips.push(t.business.promo_target_specific_users);
            }

            if (typeof promotion.spendThreshold === 'number' && promotion.spendThreshold > 0) {
                chips.push(
                    t.business.promo_chip_min_spend.replace(
                        '{{amount}}',
                        `€${Number(promotion.spendThreshold).toFixed(2)}`,
                    ),
                );
            }

            if (
                typeof promotion.discountValue === 'number' &&
                promotion.discountValue > 0 &&
                (promotion.type === 'FIXED_AMOUNT' || promotion.type === 'SPEND_X_FIXED')
            ) {
                chips.push(
                    t.business.promo_chip_max_discount.replace(
                        '{{amount}}',
                        `€${Number(promotion.discountValue).toFixed(2)}`,
                    ),
                );
            }

            if (typeof promotion.maxUsagePerUser === 'number' && promotion.maxUsagePerUser > 0) {
                if (promotion.maxUsagePerUser === 1) {
                    chips.push(t.business.promo_chip_one_time_only);
                } else {
                    chips.push(
                        t.business.promo_chip_usage_per_user.replace(
                            '{{count}}',
                            String(promotion.maxUsagePerUser),
                        ),
                    );
                }
            }

            if (typeof promotion.maxGlobalUsage === 'number' && promotion.maxGlobalUsage > 0) {
                chips.push(
                    t.business.promo_chip_global_limit.replace(
                        '{{count}}',
                        String(promotion.maxGlobalUsage),
                    ),
                );
            }

            if (promotion.endsAt) {
                const date = new Date(promotion.endsAt);
                if (!Number.isNaN(date.getTime())) {
                    chips.push(
                        t.business.promo_chip_ends_on.replace(
                            '{{date}}',
                            date.toLocaleDateString(),
                        ),
                    );
                }
            }

            return chips.slice(0, 6);
        },
        [t],
    );

    // ─── Derived Data ───────────────────────────────────────
    const categories = useMemo(() => {
        return (categoriesData?.productCategories ?? [])
            .map((c: any) => ({ id: c.id, name: c.name }));
    }, [categoriesData]);

    const productsByCategory = useMemo(() => {
        const allProductCards = products ?? [];

        // Extract offer products into their own group
        const offerProducts = allProductCards.filter((p) => p.isOffer);
        const nonOfferProducts = allProductCards.filter((p) => !p.isOffer);

        const grouped = new Map<string, ProductCardItem[]>();

        // Add offers as a special category at the beginning
        if (offerProducts.length > 0) {
            grouped.set('__offers', offerProducts);
        }

        categories.forEach((cat) => {
            const catProducts = nonOfferProducts.filter((p) => p.product?.categoryId === cat.id);
            if (catProducts.length > 0) {
                grouped.set(cat.id, catProducts);
            }
        });

        // Uncategorized
        const categorizedIds = new Set(categories.map((c: any) => c.id));
        const uncategorized = nonOfferProducts.filter((p) => {
            const categoryId = p.product?.categoryId;
            return !categoryId || !categorizedIds.has(categoryId);
        });
        if (uncategorized.length > 0) {
            grouped.set('__uncategorized', uncategorized);
        }
        return grouped;
    }, [products, categories]);

    const visibleCategories = useMemo(() => {
        return categories.filter((cat) => productsByCategory.has(cat.id));
    }, [categories, productsByCategory]);

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return (products ?? []).filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                p.product?.description?.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    // Only highlight the top N products by orderCount on this business page.
    const popularProductIds = useMemo(() => {
        const TOP_POPULAR_COUNT = 2;
        return new Set(
            (products ?? [])
                .filter((p) => (p.orderCount ?? 0) > 0)
                .sort((a, b) => {
                    const countDiff = (b.orderCount ?? 0) - (a.orderCount ?? 0);
                    if (countDiff !== 0) return countDiff;
                    return (a.name ?? '').localeCompare(b.name ?? '');
                })
                .slice(0, TOP_POPULAR_COUNT)
                .map((p) => p.id),
        );
    }, [products]);

    const isSearching = searchQuery.trim().length > 0;

    // Set initial active category
    useEffect(() => {
        if (visibleCategories.length > 0 && !activeCategoryId) {
            setActiveCategoryId(visibleCategories[0].id);
            activeCategoryRef.current = visibleCategories[0].id;
        }
    }, [visibleCategories]);

    // ─── Scroll spy ─────────────────────────────────────────
    const activeCategoryRef = useRef<string | null>(null);

    useEffect(() => {
        searchVisibilityProgress.value = withTiming(showStickySearch ? 1 : 0, {
            duration: showStickySearch ? 260 : 320,
        });
    }, [showStickySearch, searchVisibilityProgress]);

    const resolveActiveCategory = useCallback((offsetY: number) => {
        const positions = sectionOffsetsRef.current;
        if (positions.length === 0) {
            if (showStickySearchRef.current) {
                showStickySearchRef.current = false;
                setShowStickySearch(false);
            }
            return;
        }

        const firstCategoryY = positions[0]?.y ?? Number.POSITIVE_INFINITY;
        const triggerOffsetY = firstCategoryY - stickyHeight.current;
        const shouldShowSearch = showStickySearchRef.current
            ? offsetY >= triggerOffsetY - 12
            : offsetY >= triggerOffsetY + 12;
        if (shouldShowSearch !== showStickySearchRef.current) {
            showStickySearchRef.current = shouldShowSearch;
            setShowStickySearch(shouldShowSearch);
        }

        const threshold = offsetY + stickyHeight.current + 30;
        let activeId: string | null = positions[0]?.id ?? null;

        for (let i = positions.length - 1; i >= 0; i--) {
            if (positions[i].y <= threshold) {
                activeId = positions[i].id;
                break;
            }
        }

        if (activeId && activeId !== activeCategoryRef.current) {
            activeCategoryRef.current = activeId;
            setActiveCategoryId(activeId);
        }
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
            runOnJS(resolveActiveCategory)(event.contentOffset.y);
        },
    });

    // ─── Scroll to category ─────────────────────────────────
    const scrollToY = useCallback((y: number) => {
        const target = Math.max(0, y);
        scrollRef.current?.scrollTo({ y: target, animated: true });
    }, []);

    const scrollToCategory = useCallback((categoryId: string) => {
        setActiveCategoryId(categoryId);
        activeCategoryRef.current = categoryId;
        const scrollToResolvedSection = () => {
            const section = sectionOffsetsRef.current.find((s) => s.id === categoryId);
            if (!section) return false;
            const targetY = section.y - stickyHeight.current;
            scrollToY(targetY);
            return true;
        };

        if (scrollToResolvedSection()) return;

        requestAnimationFrame(() => {
            if (!scrollToResolvedSection()) {
                setTimeout(() => {
                    scrollToResolvedSection();
                }, 120);
            }
        });
    }, [scrollToY]);

    const handleSectionLayout = useCallback((categoryId: string, e: LayoutChangeEvent) => {
        const y = productsContainerY.current + e.nativeEvent.layout.y;
        const existingIdx = sectionOffsetsRef.current.findIndex((s) => s.id === categoryId);
        if (existingIdx >= 0) {
            sectionOffsetsRef.current[existingIdx].y = y;
        } else {
            sectionOffsetsRef.current.push({ id: categoryId, y });
        }
        sectionOffsetsRef.current.sort((a, b) => a.y - b.y);
    }, []);

    // ─── Compact header animated style ──────────────────────
    // Height goes 0→full so it doesn't create a black dead zone when invisible
    const compactHeaderStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            scrollY.value,
            [HERO_HEIGHT * 0.5, HERO_HEIGHT * 0.85],
            [0, 1],
            Extrapolate.CLAMP
        );
        return {
            height: progress * (44 + insets.top),
            opacity: progress,
            overflow: 'hidden' as const,
        };
    });

    // ─── Category tabs animated style (show after scrolling) ───
    const categoryTabsStyle = useAnimatedStyle(() => {
        const infoSectionHeight = 110; // Approximate height of restaurant info section
        const showThreshold = HERO_HEIGHT + infoSectionHeight - 100;
        return {
            opacity: interpolate(
                scrollY.value,
                [showThreshold - 50, showThreshold],
                [0, 1],
                Extrapolate.CLAMP
            ),
            maxHeight: interpolate(
                scrollY.value,
                [showThreshold - 50, showThreshold],
                [0, 200],
                Extrapolate.CLAMP
            ),
        };
    });

    const stickySearchStyle = useAnimatedStyle(() => {
        const progress = searchVisibilityProgress.value;
        return {
            opacity: progress,
            maxHeight: interpolate(progress, [0, 1], [0, 48], Extrapolate.CLAMP),
            transform: [
                { translateY: interpolate(progress, [0, 1], [-10, 0], Extrapolate.CLAMP) },
            ],
            marginBottom: interpolate(progress, [0, 1], [0, 8], Extrapolate.CLAMP),
        };
    });

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        searchInputRef.current?.blur();
    }, []);

    const promoList = ((business as any)?.activePromotionsDisplay ?? []) as PromoLike[];
    const promoChips = promoList.slice(0, 3);

    useEffect(() => {
        if (promoChips.length === 0) {
            if (selectedPromoId !== null) {
                setSelectedPromoId(null);
            }
            return;
        }
        const exists = promoChips.some((promo) => promo.id === selectedPromoId);
        if (!exists) {
            setSelectedPromoId(String(promoChips[0].id));
        }
    }, [promoChips, selectedPromoId]);

    const selectedPromo = useMemo(() => {
        if (promoChips.length === 0) return null;
        const found = promoChips.find((promo) => promo.id === selectedPromoId);
        return found ?? promoChips[0];
    }, [promoChips, selectedPromoId]);

    const selectedPromoLabel = selectedPromo ? formatPromotionLabel(selectedPromo) : null;
    const selectedPromoCondition = selectedPromo ? formatPromotionCondition(selectedPromo) : null;
    const selectedPromoBreakdownChips = selectedPromo ? getPromotionBreakdownChips(selectedPromo) : [];
    const promoRequiresCode = Boolean(selectedPromo?.requiresCode ?? selectedPromo?.code);

    // ─── Loading / Error States ─────────────────────────────
    const isLoading = businessLoading || productsLoading;
    const error = businessError || productsError;

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                >
                    <BusinessHeaderSkeleton />
                    <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <ProductCardSkeleton key={i} />
                        ))}
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <ErrorMessage message={error.message} />
            </SafeAreaView>
        );
    }

    if (!business) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <ErrorMessage message={t.business.not_found} />
            </SafeAreaView>
        );
    }

    const avgPrepTime = (business as any)?.avgPrepTimeMinutes ?? null;
    const overridePrepTime = (business as any)?.prepTimeOverrideMinutes ?? null;
    const deliveryTimeMin = overridePrepTime ?? avgPrepTime ?? 30;
    const deliveryTimeMax = deliveryTimeMin + 10;

    // Today's schedule
    const today = new Date().getDay();
    const todaySchedule = business.schedule?.filter((s) => s.dayOfWeek === today) ?? [];
    const scheduleLabel = todaySchedule.length > 0
        ? todaySchedule.map((s) => `${s.opensAt}–${s.closesAt}`).join(', ')
        : null;

    // ─── Render ─────────────────────────────────────────────
    return (<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
            <Animated.ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={scrollHandler}
                keyboardShouldPersistTaps="handled"
                stickyHeaderIndices={[2]}
                bounces={false}
                overScrollMode="never"
            >
                {/* ═══ 0: Hero Image ═══ */}
                <BusinessHeader business={business} scrollY={scrollY} />

                {/* ═══ 1: Restaurant Info (centered) ═══ */}
                <Animated.View
                    entering={FadeIn.delay(80).duration(350)}
                    style={{ backgroundColor: theme.colors.background }}
                >
                    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, alignItems: 'center' }}>
                        {/* Name – centered */}
                        <Animated.Text
                            entering={FadeInDown.delay(200).duration(400).springify().damping(28).stiffness(140)}
                            style={{
                                fontSize: 24,
                                fontWeight: '800',
                                color: theme.colors.text,
                                letterSpacing: -0.5,
                                textAlign: 'center',
                            }}
                        >
                            {business.name}
                        </Animated.Text>

                        {/* Description */}
                        {(business as any).description ? (
                            <Animated.Text
                                entering={FadeInDown.delay(240).duration(400).springify().damping(28).stiffness(140)}
                                style={{
                                    fontSize: 13,
                                    color: theme.colors.subtext,
                                    textAlign: 'center',
                                    marginTop: 4,
                                    lineHeight: 18,
                                }}
                                numberOfLines={2}
                            >
                                {(business as any).description}
                            </Animated.Text>
                        ) : null}

                        {/* Open status · schedule · delivery */}
                        <Animated.View
                            entering={FadeInDown.delay(280).duration(400).springify().damping(28).stiffness(140)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}
                        >
                            <View
                                style={{
                                    backgroundColor: business.isOpen ? '#1B873520' : '#D32F2F20',
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 4,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: business.isOpen ? '#1B8735' : '#D32F2F',
                                    }}
                                >
                                    {business.isOpen ? 'Open' : 'Closed'}
                                </Text>
                            </View>
                            {scheduleLabel && (
                                <>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>·</Text>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>
                                        {scheduleLabel}
                                    </Text>
                                </>
                            )}
                        </Animated.View>

                        {!business.isOpen && business.temporaryClosureReason && (
                            <Animated.View
                                entering={FadeInDown.delay(320).duration(350).springify().damping(28).stiffness(140)}
                                style={{
                                    marginTop: 8,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: '#D32F2F20',
                                    borderWidth: 1,
                                    borderColor: '#D32F2F45',
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#D32F2F',
                                        fontSize: 12,
                                        fontWeight: '600',
                                        textAlign: 'center',
                                    }}
                                >
                                    {business.temporaryClosureReason}
                                </Text>
                            </Animated.View>
                        )}

                        {/* Delivery info card */}
                        <Animated.View entering={FadeInDown.delay(340).duration(400).springify().damping(28).stiffness(140)}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                alignSelf: 'center',
                                marginTop: 10,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: 24,
                                paddingHorizontal: 18,
                                paddingVertical: 9,
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            <Ionicons name="bicycle-outline" size={16} color={theme.colors.primary} />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
                                Delivery {deliveryTimeMin}–{deliveryTimeMax} min
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={theme.colors.subtext} />
                        </TouchableOpacity>
                        </Animated.View>

                        {/* Minimum order badge */}
                        {Number((business as any)?.minOrderAmount ?? 0) > 0 && (
                            <Animated.View
                                entering={FadeInDown.delay(360).duration(350).springify().damping(28).stiffness(140)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    alignSelf: 'center',
                                    marginTop: 6,
                                    gap: 4,
                                    backgroundColor: theme.colors.card,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    borderRadius: 20,
                                    paddingHorizontal: 12,
                                    paddingVertical: 5,
                                }}
                            >
                                <Ionicons name="cart-outline" size={13} color={theme.colors.subtext} />
                                <Text style={{ fontSize: 12, color: theme.colors.subtext }}>
                                    Min. order €{Number((business as any).minOrderAmount).toFixed(2)}
                                </Text>
                            </Animated.View>
                        )}

                        {promoChips.length > 0 && (
                            <Animated.View
                                entering={FadeInDown.delay(380).duration(350).springify().damping(28).stiffness(140)}
                                style={{ width: '100%', marginTop: 8 }}
                            >
                                <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
                                    {promoChips.map((promo, idx) => {
                                        const isSelected = (promo.id ?? null) === (selectedPromo?.id ?? null);
                                        const promoLabel = formatPromotionLabel(promo);
                                        const promoCondition = formatPromotionCondition(promo);
                                        const promoBreakdownChips = getPromotionBreakdownChips(promo);
                                        const isCodePromo = Boolean(promo.requiresCode ?? promo.code);

                                        return (
                                            <TouchableOpacity
                                                key={promo.id ?? `promo-${idx}`}
                                                activeOpacity={0.9}
                                                onPress={() => {
                                                    setSelectedPromoId(String(promo.id));
                                                    setShowPromoDetails(true);
                                                }}
                                                style={{
                                                    width: 258,
                                                    marginRight: idx === promoChips.length - 1 ? 0 : 10,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? theme.colors.primary + '55' : theme.colors.border,
                                                    backgroundColor: isSelected ? theme.colors.primary + '12' : theme.colors.card,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 10,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                                                    <View
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 14,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            backgroundColor: theme.colors.primary + '22',
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        <Ionicons name="pricetag" size={14} color={theme.colors.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                                                            {promoLabel}
                                                        </Text>
                                                        <Text style={{ color: theme.colors.subtext, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                                                            {promoCondition}
                                                        </Text>
                                                        {promoBreakdownChips.length > 0 && (
                                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
                                                                {promoBreakdownChips.map((chip, chipIdx) => (
                                                                    <View
                                                                        key={`${promo.id ?? idx}-chip-${chipIdx}`}
                                                                        style={{
                                                                            borderRadius: 999,
                                                                            borderWidth: 1,
                                                                            borderColor: theme.colors.border,
                                                                            backgroundColor: theme.colors.background,
                                                                            paddingHorizontal: 7,
                                                                            paddingVertical: 2,
                                                                        }}
                                                                    >
                                                                        <Text style={{ color: theme.colors.subtext, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                                                                            {chip}
                                                                        </Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        )}
                                                        {!!promo.description && (
                                                            <Text style={{ color: theme.colors.subtext, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                                                                {promo.description}
                                                            </Text>
                                                        )}
                                                        {!promo.description && (
                                                            <Text style={{ color: theme.colors.subtext, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                                                                {t.business.promo_tap_for_details}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                                    <View
                                                        style={{
                                                            borderRadius: 999,
                                                            borderWidth: 1,
                                                            borderColor: theme.colors.primary + '55',
                                                            backgroundColor: theme.colors.primary + '18',
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 3,
                                                        }}
                                                    >
                                                        <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '700' }}>
                                                            {isCodePromo ? t.business.promo_badge_code : t.business.promo_badge_auto}
                                                        </Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={15} color={theme.colors.subtext} />
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </RNScrollView>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>

                {/* ═══ 2: STICKY — Header + Search + Categories ═══ */}
                <Animated.View
                    style={[{ backgroundColor: theme.colors.background, zIndex: 50 }, compactHeaderStyle]}
                    onLayout={(e) => {
                        stickyHeight.current = e.nativeEvent.layout.height;
                    }}
                >
                    {/* Compact header (fades in as hero scrolls away) */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flex: 1,
                            paddingTop: insets.top,
                            paddingHorizontal: 16,
                            paddingBottom: 6,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => expoRouter.back()}
                            style={{ marginRight: 12 }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text
                            style={{
                                flex: 1,
                                fontSize: 16,
                                fontWeight: '700',
                                color: theme.colors.text,
                            }}
                            numberOfLines={1}
                        >
                            {business.name}
                        </Text>
                        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Search bar */}
                    <Animated.View
                        pointerEvents={showStickySearch ? 'auto' : 'none'}
                        style={[
                            {
                                paddingHorizontal: 16,
                                overflow: 'hidden',
                            },
                            stickySearchStyle,
                        ]}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: theme.colors.card,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: searchFocused
                                    ? theme.colors.primary + '50'
                                    : theme.colors.border,
                                paddingHorizontal: 12,
                                height: 40,
                            }}
                        >
                            <Ionicons name="search" size={16} color={theme.colors.subtext} />
                            <TextInput
                                ref={searchInputRef}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder={business.name ?? 'Search menu...'}
                                placeholderTextColor={theme.colors.subtext}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    fontSize: 14,
                                    color: theme.colors.text,
                                    paddingVertical: 0,
                                }}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={handleClearSearch}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={16} color={theme.colors.subtext} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>

                    {/* Category tabs */}
                    {visibleCategories.length > 0 && !isSearching && (
                        <Animated.View style={categoryTabsStyle}>
                            <CategoryTabs
                                categories={visibleCategories}
                                activeId={activeCategoryId}
                                onPress={scrollToCategory}
                            />
                        </Animated.View>
                    )}

                    {/* Bottom border */}
                    <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                </Animated.View>

                {/* ═══ 3: Products ═══ */}
                <View
                    onLayout={(e) => {
                        productsContainerY.current = e.nativeEvent.layout.y;
                    }}
                >
                    {!isSearching && (
                        <View style={{ paddingBottom: 60 }}>
                            {/* ═══ Offers section ═══ */}
                            {productsByCategory.has('__offers') && (
                                <View>
                                    <View
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingTop: 16,
                                            paddingBottom: 10,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Ionicons name="pricetag" size={18} color={theme.colors.primary} />
                                        <Text
                                            style={{
                                                fontSize: 18,
                                                fontWeight: '800',
                                                color: theme.colors.primary,
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.3,
                                            }}
                                        >
                                            {t.product.offers}
                                        </Text>
                                    </View>
                                    <View style={{ paddingHorizontal: 16 }}>
                                        {(productsByCategory.get('__offers') ?? []).map(
                                            (productCard) => (
                                                <ProductCard
                                                    key={productCard.id}
                                                    productCard={productCard}
                                                    businessType={business.businessType}
                                                    isPopular={popularProductIds.has(productCard.id)}
                                                />
                                            ),
                                        )}
                                    </View>
                                </View>
                            )}

                            {visibleCategories.map((cat, catIdx) => {
                                const catProducts = productsByCategory.get(cat.id) ?? [];
                                return (
                                    <View
                                        key={cat.id}
                                        onLayout={(e) => handleSectionLayout(cat.id, e)}
                                    >
                                        {/* Category section header */}
                                        <View
                                            style={{
                                                paddingHorizontal: 16,
                                                paddingTop: catIdx === 0 && !productsByCategory.has('__offers') ? 12 : 20,
                                                paddingBottom: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: '800',
                                                    color: theme.colors.text,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.3,
                                                }}
                                            >
                                                {cat.name}
                                            </Text>
                                        </View>

                                        {/* Products in this category */}
                                        <View style={{ paddingHorizontal: 16 }}>
                                            {catProducts.map((productCard, pIdx) => (
                                                <Animated.View key={productCard.id} entering={FadeInDown.delay(catIdx * 60 + pIdx * 40).duration(350).springify().damping(28).stiffness(160)}>
                                                <ProductCard
                                                    productCard={productCard}
                                                    businessType={business.businessType}
                                                    isPopular={popularProductIds.has(productCard.id)}
                                                />
                                                </Animated.View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Uncategorized products */}
                            {productsByCategory.has('__uncategorized') && (
                                <View>
                                    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
                                        <Text
                                            style={{
                                                fontSize: 18,
                                                fontWeight: '800',
                                                color: theme.colors.text,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Other
                                        </Text>
                                    </View>
                                    <View style={{ paddingHorizontal: 16 }}>
                                        {(productsByCategory.get('__uncategorized') ?? []).map(
                                            (productCard) => (
                                                <ProductCard
                                                    key={productCard.id}
                                                    productCard={productCard}
                                                    businessType={business.businessType}
                                                    isPopular={popularProductIds.has(productCard.id)}
                                                />
                                            )
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Empty state */}
                            {visibleCategories.length === 0 &&
                                !productsByCategory.has('__uncategorized') && (
                                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                                        <Ionicons
                                            name="fast-food-outline"
                                            size={40}
                                            color={theme.colors.subtext}
                                        />
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                fontWeight: '700',
                                                color: theme.colors.text,
                                                marginTop: 12,
                                            }}
                                        >
                                            No products available
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: theme.colors.subtext,
                                                marginTop: 4,
                                            }}
                                        >
                                            Check back later for menu items
                                        </Text>
                                    </View>
                                )}
                        </View>
                    )}
                </View>
            </Animated.ScrollView>

            {/* ═══ Search Results Overlay ═══ */}
            {isSearching && (
                <View
                    style={{
                        position: 'absolute',
                        top: stickyHeight.current,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: theme.colors.background,
                        zIndex: 100,
                    }}
                >
                    <RNScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 60 }}
                    >
                        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                            <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>
                                {searchResults.length} result
                                {searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                            </Text>
                        </View>
                        {searchResults.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                                <Ionicons name="search" size={40} color={theme.colors.subtext} />
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: '700',
                                        color: theme.colors.text,
                                        marginTop: 12,
                                    }}
                                >
                                    No results found
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: theme.colors.subtext,
                                        marginTop: 4,
                                    }}
                                >
                                    Try a different search term
                                </Text>
                            </View>
                        ) : (
                            <View style={{ paddingHorizontal: 16 }}>
                                {searchResults.map((productCard) => (
                                    <ProductCard
                                        key={productCard.id}
                                        productCard={productCard}
                                        businessType={business.businessType}
                                        isPopular={popularProductIds.has(productCard.id)}
                                    />
                                ))}
                            </View>
                        )}
                    </RNScrollView>
                </View>
            )}

            <Modal
                visible={showPromoDetails}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPromoDetails(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setShowPromoDetails(false)}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        justifyContent: 'center',
                        paddingHorizontal: 24,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.card,
                            padding: 16,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '800', flex: 1 }}>
                                {t.business.promo_details_title}
                            </Text>
                            <TouchableOpacity onPress={() => setShowPromoDetails(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={20} color={theme.colors.subtext} />
                            </TouchableOpacity>
                        </View>

                        {selectedPromoLabel && (
                            <View
                                style={{
                                    marginTop: 12,
                                    borderRadius: 10,
                                    backgroundColor: theme.colors.primary + '15',
                                    borderWidth: 1,
                                    borderColor: theme.colors.primary + '45',
                                    paddingHorizontal: 10,
                                    paddingVertical: 8,
                                    alignSelf: 'flex-start',
                                }}
                            >
                                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '700' }}>
                                    {selectedPromoLabel}
                                </Text>
                            </View>
                        )}

                        {selectedPromoCondition && (
                            <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 10 }}>
                                {selectedPromoCondition}
                            </Text>
                        )}

                        {selectedPromoBreakdownChips.length > 0 && (
                            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {selectedPromoBreakdownChips.map((chip, idx) => (
                                    <View
                                        key={`selected-chip-${idx}`}
                                        style={{
                                            borderRadius: 999,
                                            borderWidth: 1,
                                            borderColor: theme.colors.border,
                                            backgroundColor: theme.colors.background,
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: '600' }}>
                                            {chip}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ marginTop: 12, gap: 10 }}>
                            <View>
                                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                                    {t.business.promo_section_value_title}
                                </Text>
                                <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 5, lineHeight: 18 }}>
                                    {selectedPromoLabel || t.business.promo_auto_apply_hint}
                                </Text>
                            </View>

                            <View>
                                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                                    {t.business.promo_section_conditions_title}
                                </Text>
                                <View style={{ marginTop: 6, gap: 6 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>{t.business.promo_scope_label}</Text>
                                        <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>{t.business.promo_scope_business}</Text>
                                    </View>
                                    {typeof selectedPromo?.spendThreshold === 'number' && selectedPromo.spendThreshold > 0 && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>{t.business.promo_minimum_label}</Text>
                                            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                                €{Number(selectedPromo.spendThreshold).toFixed(2)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>{t.business.promo_apply_method_label}</Text>
                                        <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                                            {promoRequiresCode ? t.business.promo_badge_code_required : t.business.promo_badge_auto_apply}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {promoRequiresCode && selectedPromo?.code && (
                                <View
                                    style={{
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.background,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                    }}
                                >
                                    <Text style={{ color: theme.colors.subtext, fontSize: 11 }}>{t.business.promo_code_label}</Text>
                                    <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', marginTop: 2 }}>
                                        {selectedPromo.code}
                                    </Text>
                                </View>
                            )}

                            {!!selectedPromo?.description && (
                                <View>
                                    <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                                        {t.business.promo_section_details_title}
                                    </Text>
                                    <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 5, lineHeight: 18 }}>
                                        {selectedPromo.description}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ marginTop: 12, gap: 8 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
                                {t.business.promo_how_it_works_title}
                            </Text>
                            <Text style={{ color: theme.colors.subtext, fontSize: 12, lineHeight: 18 }}>
                                {promoRequiresCode ? t.business.promo_how_it_works_body_code : t.business.promo_how_it_works_body}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* ═══ Bottom Action Panel — View Cart + Progress Bar ═══ */}
            {businessCartItems.length > 0 && (
                <Animated.View
                    entering={FadeInDown.duration(280)}
                    style={{
                        backgroundColor: theme.colors.card,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: 12,
                    }}
                >
                    {applicableThreshold && thresholdSpend && (
                        <View style={{ marginBottom: 10 }}>
                            <PromotionProgressBar
                                progress={thresholdProgress}
                                amountRemaining={thresholdAmountRemaining}
                                spendThreshold={thresholdSpend}
                                promoName={applicableThreshold.name || 'Promo'}
                                isUnlocked={thresholdProgress >= 1}
                                isApplied={false}
                                formatCurrency={formatCurrency}
                            />
                        </View>
                    )}
                    {minOrderAmount > 0 && !minimumMet && (
                        <View style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 12, color: theme.colors.subtext, fontWeight: '600' }}>
                                    {t.cart.minimum_order_label}
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.expense }}>
                                    {formatCurrency(minOrderAmount)}
                                </Text>
                            </View>
                            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
                                <View
                                    style={{
                                        height: 5,
                                        borderRadius: 3,
                                        width: `${minOrderProgress * 100}%`,
                                        backgroundColor: theme.colors.expense,
                                    }}
                                />
                            </View>
                            <Text style={{ fontSize: 11, color: theme.colors.subtext, marginTop: 3 }}>
                                {t.cart.minimum_not_met.replace('{amount}', formatCurrency(amountUntilMinimum))}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity
                        activeOpacity={minimumMet ? 0.9 : 1}
                        onPress={() => { if (minimumMet) expoRouter.push('/cart'); }}
                        style={{
                            backgroundColor: minimumMet ? theme.colors.primary : theme.colors.border,
                            borderRadius: 14,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            opacity: minimumMet ? 1 : 0.7,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                                    {businessCartCount}
                                </Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                                {minimumMet ? t.cart.view_cart : t.cart.minimum_order_label}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                                {formatCurrency(businessCartTotal)}
                            </Text>
                            <Ionicons name={minimumMet ? 'chevron-forward' : 'lock-closed-outline'} size={18} color="white" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}
