import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView as RNScrollView, LayoutChangeEvent,
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
    const searchInputRef = useRef<TextInput>(null);
    const showStickySearchRef = useRef(false);
    const searchVisibilityProgress = useSharedValue(0);
    const sectionOffsetsRef = useRef<{ id: string; y: number }[]>([]);
    const productsContainerY = useRef(0);
    const stickyHeight = useRef(0);

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
                                    />
                                ))}
                            </View>
                        )}
                    </RNScrollView>
                </View>
            )}
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
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => expoRouter.push('/cart')}
                        style={{
                            backgroundColor: theme.colors.primary,
                            borderRadius: 14,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                                    {businessCartCount}
                                </Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                                {t.cart.view_cart}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                                {formatCurrency(businessCartTotal)}
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color="white" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}
