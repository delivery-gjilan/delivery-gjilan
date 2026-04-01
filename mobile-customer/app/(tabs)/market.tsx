import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image, FlatList,
    ScrollView as RNScrollView, LayoutChangeEvent, Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedScrollHandler,
    useAnimatedStyle, interpolate, Extrapolate, runOnJS, withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useBusinesses } from '@/modules/business/hooks/useBusinesses';
import { useProducts } from '@/modules/product/hooks/useProducts';
import { useProductCategories, useProductSubcategoriesByBusiness } from '@/modules/product/hooks/useProductCategories';
import { MarketProductCard } from '@/modules/business/components/MarketProductCard';
import { BusinessType } from '@/gql/graphql';

const HERO_HEIGHT = 200;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH;

const DISCOVER_TAB_ID = '__discover__';

// ─── Category Card (Discover grid) ─────────────────────────
function CategoryCard({
    name,
    imageUrl,
    onPress,
}: {
    name: string;
    imageUrl?: string | null;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                borderRadius: 14,
                overflow: 'hidden',
            }}
        >
            <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="grid-outline" size={36} color="#ccc" />
                    </View>
                )}
            </View>
            <View style={{ backgroundColor: '#2a2a2a', paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                    {name}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// ─── Category Tabs (Wolt underline style) ───────────────────
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
                                color: isActive ? theme.colors.primary : theme.colors.subtext,
                                letterSpacing: 0.3,
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

// ─── Subcategory Pills ──────────────────────────────────────
function SubcategoryPills({
    subcategories,
    activeId,
    onPress,
}: {
    subcategories: { id: string; name: string }[];
    activeId: string | null;
    onPress: (id: string) => void;
}) {
    const theme = useTheme();
    if (subcategories.length === 0) return null;

    return (
        <RNScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 6 }}
            style={{ flexGrow: 0 }}
        >
            {subcategories.map((sub) => {
                const isActive = sub.id === activeId;
                return (
                    <TouchableOpacity
                        key={sub.id}
                        onPress={() => onPress(sub.id)}
                        activeOpacity={0.7}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: isActive ? '#DDD6FE' : '#F3F4F6',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: '600',
                                color: isActive ? '#5B21B6' : '#71717A',
                            }}
                        >
                            {sub.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </RNScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════
// ─── Market Screen ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function Market() {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // ─── Data ───────────────────────────────────────────────
    const { businesses, loading: businessesLoading, error: businessesError } = useBusinesses();
    const marketBusiness = useMemo(
        () => (businesses || []).find((b) => b.businessType === 'MARKET'),
        [businesses],
    );
    const marketId = marketBusiness?.id ?? '';

    const { products, loading: productsLoading, error: productsError } = useProducts(marketId);
    const { categories, loading: categoriesLoading, error: categoriesError } = useProductCategories(marketId);
    const { subcategories, loading: subcategoriesLoading, error: subcategoriesError } =
        useProductSubcategoriesByBusiness(marketId);

    const isLoading = businessesLoading || (!!marketId && (productsLoading || categoriesLoading || subcategoriesLoading));
    const hasError = businessesError || productsError || categoriesError || subcategoriesError;

    // ─── Scroll / Animation ─────────────────────────────────
    const scrollY = useSharedValue(0);
    const scrollRef = useRef<any>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [showStickySearch, setShowStickySearch] = useState(false);
    const showStickySearchRef = useRef(false);
    const searchVisibilityProgress = useSharedValue(0);
    const searchInputRef = useRef<TextInput>(null);

    const sectionOffsetsRef = useRef<{ id: string; y: number }[]>([]);
    const productsContainerY = useRef(0);
    const stickyHeight = useRef(0);
    const lastScrollY = useRef(0);
    const categoryTabsHeight = useSharedValue(1);

    // ─── Active Tab State ───────────────────────────────────
    const [activeTabId, setActiveTabId] = useState<string>(DISCOVER_TAB_ID);
    const activeTabRef = useRef<string>(DISCOVER_TAB_ID);
    const isDiscover = activeTabId === DISCOVER_TAB_ID;

    // ─── Active Subcategory (for category views) ────────────
    const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
    const activeSubcategoryRef = useRef<string | null>(null);

    // ─── Swipe Animation ────────────────────────────────────
    const contentTranslateX = useSharedValue(0);
    const prevTabRef = useRef<string>(DISCOVER_TAB_ID);
    const prevSubcategoryRef = useRef<string | null>(null);
    const gestureTranslateX = useSharedValue(0);
    const isGestureActive = useSharedValue(false);

    // ─── Derived Data ───────────────────────────────────────
    const allProducts = useMemo(() => products ?? [], [products]);

    const categoryList = useMemo(() => {
        return categories.map((c: any) => ({ id: c.id, name: c.name }));
    }, [categories]);

    // Tabs: actual categories only
    const allTabs = useMemo(() => {
        return categoryList;
    }, [categoryList]);

    const subcategoryMap = useMemo(() => {
        const byCategory = new Map<string, { id: string; name: string; categoryId: string }[]>();
        const byId = new Map<string, { id: string; name: string; categoryId: string }>();

        subcategories.forEach((sub: any) => {
            byId.set(sub.id, sub);
            if (!byCategory.has(sub.categoryId)) byCategory.set(sub.categoryId, []);
            byCategory.get(sub.categoryId)!.push(sub);
        });

        return { byCategory, byId };
    }, [subcategories]);

    // Products for active category
    const activeCategoryProducts = useMemo(() => {
        if (isDiscover) return [];
        const filtered = allProducts.filter((p: any) => p.product?.categoryId === activeTabId);
        // Debug logging
        if (filtered.length === 0 && allProducts.length > 0) {
            console.log('No products found for category:', activeTabId);
            console.log('Available products:', allProducts.map((p: any) => ({ id: p.id, name: p.name, categoryId: p.product?.categoryId })));
        }
        return filtered;
    }, [allProducts, activeTabId, isDiscover]);

    // Subcategories for active category
    const activeSubcategories = useMemo(() => {
        if (isDiscover) return [];
        return subcategoryMap.byCategory.get(activeTabId) || [];
    }, [subcategoryMap, activeTabId, isDiscover]);

    // Subcategory pills for active category
    const subcategoryPillList = useMemo(() => {
        return activeSubcategories;
    }, [activeSubcategories]);

    // Sections for active category (filtered by active subcategory)
    const categorySections = useMemo(() => {
        if (isDiscover) return [];
        const result: { subcategoryId: string; subcategoryName: string; products: any[] }[] = [];

        if (activeSubcategories.length > 0) {
            // If a subcategory is selected, show only that subcategory's products
            if (activeSubcategoryId) {
                const activeSub = activeSubcategories.find((sub) => sub.id === activeSubcategoryId);
                if (activeSub) {
                    const prods = activeCategoryProducts
                        .filter((p: any) => p.product?.subcategoryId === activeSub.id)
                        .sort((a: any, b: any) => (a.product?.sortOrder ?? 0) - (b.product?.sortOrder ?? 0));
                    if (prods.length > 0) {
                        result.push({ subcategoryId: activeSub.id, subcategoryName: activeSub.name, products: prods });
                    }
                }
            } else {
                // No subcategory selected yet - show first subcategory
                const firstSub = activeSubcategories[0];
                if (firstSub) {
                    const prods = activeCategoryProducts
                        .filter((p: any) => p.product?.subcategoryId === firstSub.id)
                        .sort((a: any, b: any) => (a.product?.sortOrder ?? 0) - (b.product?.sortOrder ?? 0));
                    if (prods.length > 0) {
                        result.push({ subcategoryId: firstSub.id, subcategoryName: firstSub.name, products: prods });
                    }
                }
            }
        } else {
            // No subcategories — show all category products
            const activeCatName = categoryList.find((c) => c.id === activeTabId)?.name ?? '';
            const sorted = activeCategoryProducts.sort((a: any, b: any) => (a.product?.sortOrder ?? 0) - (b.product?.sortOrder ?? 0));
            if (sorted.length > 0) {
                result.push({ subcategoryId: `__all_${activeTabId}`, subcategoryName: activeCatName, products: sorted });
            }
        }

        return result;
    }, [isDiscover, activeSubcategories, activeSubcategoryId, activeCategoryProducts, activeTabId, categoryList, t]);

    const visibleSubcategoryPills = useMemo(
        () => subcategoryPillList.filter((sub) => {
            // Show all subcategories that have products in the active category
            const hasProducts = activeCategoryProducts.some((p: any) => p.product?.subcategoryId === sub.id);
            return hasProducts;
        }),
        [subcategoryPillList, activeCategoryProducts],
    );

    // Search
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        const source = isDiscover ? allProducts : activeCategoryProducts;
        return source.filter(
            (p: any) => p.name?.toLowerCase().includes(q) || (p.product?.description ?? '').toLowerCase().includes(q),
        );
    }, [allProducts, activeCategoryProducts, searchQuery, isDiscover]);

    const isSearching = searchQuery.trim().length > 0;

    // Category images for Discover cards
    const categoryImages = useMemo(() => {
        const map = new Map<string, string | null>();
        categoryList.forEach((cat) => {
            const catProds = allProducts.filter((p: any) => p.product?.categoryId === cat.id);
            map.set(cat.id, catProds.find((p: any) => p.imageUrl)?.imageUrl ?? null);
        });
        return map;
    }, [categoryList, allProducts]);

    // ─── Swipe Animation Effect ─────────────────────────────
    useEffect(() => {
        // Determine direction based on tab/subcategory change
        let direction = 0; // -1 = left to right (going back), 1 = right to left (going forward)

        // Check if tab changed
        if (activeTabId !== prevTabRef.current) {
            const prevIndex = allTabs.findIndex(t => t.id === prevTabRef.current);
            const newIndex = allTabs.findIndex(t => t.id === activeTabId);
            if (prevIndex !== -1 && newIndex !== -1) {
                direction = newIndex > prevIndex ? 1 : -1;
            }
            prevTabRef.current = activeTabId;
        }
        // Check if subcategory changed
        else if (activeSubcategoryId !== prevSubcategoryRef.current) {
            const prevIndex = subcategoryPillList.findIndex(s => s.id === prevSubcategoryRef.current);
            const newIndex = subcategoryPillList.findIndex(s => s.id === activeSubcategoryId);
            if (prevIndex !== -1 && newIndex !== -1) {
                direction = newIndex > prevIndex ? 1 : -1;
            }
            prevSubcategoryRef.current = activeSubcategoryId;
        }

        if (direction !== 0) {
            // Start from off-screen in the direction of change
            contentTranslateX.value = direction * SCREEN_WIDTH;
            // Animate to center (0)
            contentTranslateX.value = withTiming(0, { duration: 300 });
        }
    }, [activeTabId, activeSubcategoryId, allTabs, subcategoryPillList]);

    const contentAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: contentTranslateX.value + gestureTranslateX.value }],
        };
    });

    // ─── Tab switching ──────────────────────────────────────
    const handleTabPress = useCallback((tabId: string) => {
        setActiveTabId(tabId);
        activeTabRef.current = tabId;
        setSearchQuery('');
        setActiveSubcategoryId(null);
        activeSubcategoryRef.current = null;
        sectionOffsetsRef.current = [];

        // Scroll to top of products area
        const y = productsContainerY.current - stickyHeight.current;
        scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }, []);

    const handleCategoryCardPress = useCallback((categoryId: string) => {
        handleTabPress(categoryId);
    }, [handleTabPress]);

    // ─── Gesture Handlers ───────────────────────────────────
    const goToNextItem = useCallback(() => {
        if (activeSubcategories.length > 0 && activeSubcategoryId) {
            const currentIndex = activeSubcategories.findIndex(s => s.id === activeSubcategoryId);
            if (currentIndex < activeSubcategories.length - 1) {
                const nextSub = activeSubcategories[currentIndex + 1];
                setActiveSubcategoryId(nextSub.id);
                activeSubcategoryRef.current = nextSub.id;
                return true;
            }
        }
        // Try next category
        const currentCatIndex = allTabs.findIndex(t => t.id === activeTabId);
        if (currentCatIndex < allTabs.length - 1) {
            const nextCat = allTabs[currentCatIndex + 1];
            handleTabPress(nextCat.id);
            return true;
        }
        return false;
    }, [activeSubcategories, activeSubcategoryId, allTabs, activeTabId, handleTabPress]);

    const goToPrevItem = useCallback(() => {
        if (activeSubcategories.length > 0 && activeSubcategoryId) {
            const currentIndex = activeSubcategories.findIndex(s => s.id === activeSubcategoryId);
            if (currentIndex > 0) {
                const prevSub = activeSubcategories[currentIndex - 1];
                setActiveSubcategoryId(prevSub.id);
                activeSubcategoryRef.current = prevSub.id;
                return true;
            }
        }
        // Try previous category
        const currentCatIndex = allTabs.findIndex(t => t.id === activeTabId);
        if (currentCatIndex > 0) {
            const prevCat = allTabs[currentCatIndex - 1];
            handleTabPress(prevCat.id);
            return true;
        }
        return false;
    }, [activeSubcategories, activeSubcategoryId, allTabs, activeTabId, handleTabPress]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onStart(() => {
            isGestureActive.value = true;
        })
        .onUpdate((event) => {
            if (isGestureActive.value) {
                gestureTranslateX.value = event.translationX * 0.5;
            }
        })
        .onEnd((event) => {
            const threshold = SCREEN_WIDTH * 0.25;
            const shouldSwipe = Math.abs(event.translationX) > threshold;
            
            if (shouldSwipe) {
                if (event.translationX > 0) {
                    // Swiping right - go to previous
                    runOnJS(goToPrevItem)();
                } else {
                    // Swiping left - go to next
                    runOnJS(goToNextItem)();
                }
            }
            
            gestureTranslateX.value = withTiming(0, { duration: 200 });
            isGestureActive.value = false;
        });

    // ─── Set initial active subcategory ─────────────────────
    useEffect(() => {
        // Set initial tab to first category when categories load
        if (categoryList.length > 0 && activeTabId === DISCOVER_TAB_ID) {
            setActiveTabId(categoryList[0].id);
            activeTabRef.current = categoryList[0].id;
            prevTabRef.current = categoryList[0].id;
        }
    }, [categoryList]);

    useEffect(() => {
        if (!isDiscover && categorySections.length > 0 && !activeSubcategoryId) {
            setActiveSubcategoryId(categorySections[0].subcategoryId);
            activeSubcategoryRef.current = categorySections[0].subcategoryId;
        }
    }, [categorySections, isDiscover]);

    // Reset subcategory when switching tabs
    useEffect(() => {
        if (isDiscover) {
            setActiveSubcategoryId(null);
            activeSubcategoryRef.current = null;
        } else if (categorySections.length > 0) {
            setActiveSubcategoryId(categorySections[0].subcategoryId);
            activeSubcategoryRef.current = categorySections[0].subcategoryId;
        }
    }, [activeTabId]);

    // ─── Scroll sync ────────────────────────────────────────
    useEffect(() => {
        searchVisibilityProgress.value = withTiming(showStickySearch ? 1 : 0, {
            duration: showStickySearch ? 260 : 320,
        });
    }, [showStickySearch]);

    const resolveActiveSection = useCallback((offsetY: number) => {
        const positions = sectionOffsetsRef.current;
        if (positions.length === 0) {
            if (showStickySearchRef.current) {
                showStickySearchRef.current = false;
                setShowStickySearch(false);
            }
            return;
        }

        const firstY = positions[0]?.y ?? Number.POSITIVE_INFINITY;
        const triggerY = firstY - stickyHeight.current;
        const shouldShow = showStickySearchRef.current
            ? offsetY >= triggerY - 12
            : offsetY >= triggerY + 12;

        if (shouldShow !== showStickySearchRef.current) {
            showStickySearchRef.current = shouldShow;
            setShowStickySearch(shouldShow);
        }

        // Handle category tabs collapse/expand based on scroll direction
        const scrollDelta = offsetY - lastScrollY.current;
        const isScrollingDown = scrollDelta > 0;
        const isScrollingUp = scrollDelta < 0;

        if (offsetY < 50) {
            // Near top - always show category tabs
            categoryTabsHeight.value = withTiming(1, { duration: 200 });
        } else if (isScrollingDown && Math.abs(scrollDelta) > 5) {
            // Scrolling down - hide category tabs
            categoryTabsHeight.value = withTiming(0, { duration: 200 });
        } else if (isScrollingUp && Math.abs(scrollDelta) > 5) {
            // Scrolling up - show category tabs
            categoryTabsHeight.value = withTiming(1, { duration: 200 });
        }

        lastScrollY.current = offsetY;
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
            runOnJS(resolveActiveSection)(event.contentOffset.y);
        },
    });

    const scrollToY = useCallback((y: number) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }, []);

    const scrollToSubcategory = useCallback((subcategoryId: string) => {
        setActiveSubcategoryId(subcategoryId);
        activeSubcategoryRef.current = subcategoryId;
        // Scroll to top of products when switching subcategory
        const y = productsContainerY.current - stickyHeight.current;
        scrollToY(Math.max(0, y));
    }, [scrollToY]);

    const handleSectionLayout = useCallback((sectionId: string, e: LayoutChangeEvent) => {
        const y = productsContainerY.current + e.nativeEvent.layout.y;
        const idx = sectionOffsetsRef.current.findIndex((s) => s.id === sectionId);
        if (idx >= 0) {
            sectionOffsetsRef.current[idx].y = y;
        } else {
            sectionOffsetsRef.current.push({ id: sectionId, y });
        }
        sectionOffsetsRef.current.sort((a, b) => a.y - b.y);
    }, []);

    const handleProductPress = useCallback((_productId: string) => {
        // no-op: detail page disabled for market
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        searchInputRef.current?.blur();
    }, []);

    // ─── Animated styles ────────────────────────────────────
    const categoryTabsStyle = useAnimatedStyle(() => ({
        height: categoryTabsHeight.value * 48,
        opacity: categoryTabsHeight.value,
        overflow: 'hidden',
    }));

    const heroImageStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    scrollY.value, [-100, 0, HERO_HEIGHT], [-30, 0, HERO_HEIGHT * 0.35], Extrapolate.CLAMP,
                ),
            },
            {
                scale: interpolate(scrollY.value, [-200, 0], [1.4, 1], Extrapolate.CLAMP),
            },
        ] as any,
    }));

    const compactHeaderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [HERO_HEIGHT * 0.3, HERO_HEIGHT * 0.7], [0, 1], Extrapolate.CLAMP),
    }));

    const stickySearchStyle = useAnimatedStyle(() => {
        const progress = searchVisibilityProgress.value;
        return {
            opacity: progress,
            maxHeight: interpolate(progress, [0, 1], [0, 48], Extrapolate.CLAMP),
            transform: [{ translateY: interpolate(progress, [0, 1], [-10, 0], Extrapolate.CLAMP) }],
            marginBottom: interpolate(progress, [0, 1], [0, 8], Extrapolate.CLAMP),
        };
    });

    // ─── Schedule ───────────────────────────────────────────
    const today = new Date().getDay();
    const todaySchedule = marketBusiness?.schedule?.filter((s: any) => s.dayOfWeek === today) ?? [];
    const scheduleLabel =
        todaySchedule.length > 0
            ? todaySchedule.map((s: any) => `${s.opensAt}–${s.closesAt}`).join(', ')
            : null;

    // ─── Loading ────────────────────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
                <View style={{ flex: 1, paddingHorizontal: CARD_PADDING, paddingTop: 16 }}>
                    <View style={{ width: '100%', height: 20, backgroundColor: theme.colors.card, borderRadius: 6, marginBottom: 20, opacity: 0.5 }} />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <View
                                key={i}
                                style={{
                                    width: CARD_WIDTH, height: CARD_HEIGHT,
                                    borderRadius: 14, backgroundColor: theme.colors.card, opacity: 0.5,
                                }}
                            />
                        ))}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Error ──────────────────────────────────────────────
    if (hasError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
                    <Text style={{ color: theme.colors.text }}>{t.market.error_loading}</Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 8 }}>
                        {businessesError?.message || productsError?.message || categoriesError?.message || subcategoriesError?.message || t.common.something_went_wrong}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // ─── No market ──────────────────────────────────────────
    if (!marketBusiness) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
                    <Ionicons name="storefront-outline" size={40} color={theme.colors.subtext} />
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
                        {t.market.no_market}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // ─── Render ───────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
            <Animated.ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={scrollHandler}
                keyboardShouldPersistTaps="handled"
                stickyHeaderIndices={[0]}
                bounces={false}
                overScrollMode="never"
            >
                {/* ═══ 0: STICKY — Search Header + Category Tabs + Subcategory Pills ═══ */}
                <View
                    style={{ backgroundColor: theme.dark ? '#1a1a1a' : '#f8f8f8', zIndex: 50 }}
                    onLayout={(e) => { stickyHeight.current = e.nativeEvent.layout.height; }}
                >
                    {/* Search header bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}>
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: 16, 
                                backgroundColor: theme.dark ? '#2a2a2a' : '#f5f5f5',
                                alignItems: 'center', 
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                        </TouchableOpacity>

                        <View
                            style={{
                                flex: 1,
                                flexDirection: 'row', 
                                alignItems: 'center',
                                backgroundColor: theme.dark ? '#2a2a2a' : '#f5f5f5',
                                borderRadius: 20,
                                paddingHorizontal: 14,
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
                                placeholder={marketBusiness.name}
                                placeholderTextColor={theme.colors.subtext}
                                style={{ flex: 1, marginLeft: 10, fontSize: 14, color: theme.colors.text, paddingVertical: 0 }}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close-circle" size={16} color={theme.colors.subtext} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: 16, 
                                backgroundColor: theme.dark ? '#2a2a2a' : '#f5f5f5',
                                alignItems: 'center', 
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Category tabs (Discover + categories) */}
                    {!isSearching && (
                        <Animated.View style={categoryTabsStyle}>
                            <CategoryTabs
                                categories={allTabs}
                                activeId={activeTabId}
                                onPress={handleTabPress}
                            />
                        </Animated.View>
                    )}

                    {/* Separator line */}
                    {!isDiscover && !isSearching && visibleSubcategoryPills.length > 0 && (
                        <View style={{ height: 1, backgroundColor: theme.dark ? '#3a3a3a' : '#e0e0e0' }} />
                    )}

                    {/* Subcategory pills (only for category views with subcategories) */}
                    {!isDiscover && !isSearching && visibleSubcategoryPills.length > 0 && (
                        <SubcategoryPills
                            subcategories={visibleSubcategoryPills}
                            activeId={activeSubcategoryId}
                            onPress={scrollToSubcategory}
                        />
                    )}
                </View>

                {/* ═══ 1: Content ═══ */}
                <View onLayout={(e) => { productsContainerY.current = e.nativeEvent.layout.y; }}>
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={contentAnimatedStyle}>
                            {!isSearching && isDiscover && (
                            /* ─── Discover Content ─── */
                            <View style={{ paddingBottom: 60, paddingTop: 20 }}>
                                {/* Category cards grid */}
                                <View style={{ paddingHorizontal: CARD_PADDING }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.colors.text }}>
                                            Find what you want
                                        </Text>
                                        <TouchableOpacity>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.primary }}>Translate</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
                                        {categoryList.map((cat) => (
                                            <CategoryCard
                                                key={cat.id}
                                                name={cat.name}
                                                imageUrl={categoryImages.get(cat.id)}
                                                onPress={() => handleCategoryCardPress(cat.id)}
                                            />
                                        ))}
                                    </View>

                                    {categoryList.length === 0 && (
                                        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                                            <Text style={{ color: theme.colors.subtext, fontSize: 15 }}>
                                                {t.market.no_categories ?? 'No categories'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {!isSearching && !isDiscover && (
                            /* ─── Category Products ─── */
                            <View style={{ paddingBottom: 60 }}>
                                {categorySections.map((section, idx) => (
                                    <View
                                        key={section.subcategoryId}
                                        onLayout={(e) => handleSectionLayout(section.subcategoryId, e)}
                                    >
                                        <View style={{ paddingHorizontal: 16, paddingTop: idx === 0 ? 16 : 28, paddingBottom: 10 }}>
                                            <Text
                                                style={{
                                                    fontSize: 13, fontWeight: '600', color: theme.colors.subtext,
                                                    letterSpacing: 0.3,
                                                }}
                                            >
                                                {section.subcategoryName}
                                            </Text>
                                        </View>

                                        <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                            {section.products.map((product: any) => (
                                                <View key={product.id} style={{ width: (SCREEN_WIDTH - 44) / 2 }}>
                                                    <MarketProductCard
                                                        product={product.product ?? product}
                                                        onPress={handleProductPress}
                                                        businessType={BusinessType.Market}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}

                                {categorySections.length === 0 && (
                                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                                        <Ionicons name="storefront-outline" size={40} color={theme.colors.subtext} />
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 12 }}>
                                            {t.market.no_products ?? 'No products available'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                        </Animated.View>
                    </GestureDetector>
                </View>
            </Animated.ScrollView>

            {/* ═══ Search Results Overlay ═══ */}
            {isSearching && (
                <View
                    style={{
                        position: 'absolute', top: stickyHeight.current, left: 0, right: 0, bottom: 0,
                        backgroundColor: theme.colors.background, zIndex: 100,
                    }}
                >
                    <RNScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                            <Text style={{ color: theme.colors.subtext, fontSize: 13 }}>
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                            </Text>
                        </View>
                        {searchResults.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                                <Ionicons name="search" size={40} color={theme.colors.subtext} />
                                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 12 }}>
                                    No results found
                                </Text>
                                <Text style={{ fontSize: 13, color: theme.colors.subtext, marginTop: 4 }}>
                                    Try a different search term
                                </Text>
                            </View>
                        ) : (
                            <View style={{ paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                {searchResults.map((product: any) => (
                                    <View key={product.id} style={{ width: (SCREEN_WIDTH - 44) / 2 }}>
                                        <MarketProductCard
                                            product={product.product ?? product}
                                            onPress={handleProductPress}
                                            businessType={BusinessType.Market}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}
                    </RNScrollView>
                </View>
            )}
        </SafeAreaView>
    );
}
