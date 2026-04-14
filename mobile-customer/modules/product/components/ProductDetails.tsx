import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { getEffectiveProductPrice, getPreDiscountProductPrice } from '@/modules/product/utils/pricing';
import type { FullProduct, ProductOrVariant } from '../hooks/useProductActions';

interface ProductDetailsProps {
    product: FullProduct;
    activeProduct: ProductOrVariant;
    selectedVariantId: string | null;
    setSelectedVariantId: (id: string) => void;
    selectedOptions: Record<string, string[]>;
    setSelectedOptions: (options: Record<string, string[]>) => void;
}

export function ProductDetails({
    product,
    activeProduct,
    selectedVariantId,
    setSelectedVariantId,
    selectedOptions,
    setSelectedOptions,
}: ProductDetailsProps) {
    const selectableVariants = [product, ...(product.variants ?? [])].filter(
        (v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx,
    );

    const optionGroupsForSelection =
        activeProduct.optionGroups && activeProduct.optionGroups.length > 0
            ? activeProduct.optionGroups
            : (product.optionGroups ?? []);

    const { t } = useTranslations();
    const theme = useTheme();
    const effectivePrice = getEffectiveProductPrice(activeProduct);
    const preDiscountPrice = getPreDiscountProductPrice(activeProduct);

    const handleOptionToggle = (groupId: string, optionId: string, maxSelections: number) => {
        const current = selectedOptions[groupId] || [];
        let updated: string[];

        if (current.includes(optionId)) {
            updated = current.filter((id) => id !== optionId);
        } else {
            if (maxSelections === 1) {
                updated = [optionId];
            } else if (current.length < maxSelections) {
                updated = [...current, optionId];
            } else {
                return;
            }
        }

        setSelectedOptions({
            ...selectedOptions,
            [groupId]: updated,
        });
    };

    const selectedCount = (groupId: string) => (selectedOptions[groupId] || []).length;

    return (
        <View style={{ paddingBottom: 120 }}>
            {/* ── Name + Price + Description ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
                <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 }}>
                    {activeProduct.name}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    {preDiscountPrice != null ? (
                        <>
                            <Text style={{ color: theme.colors.expense, fontSize: 22, fontWeight: '800' }}>
                                €{effectivePrice.toFixed(2)}
                            </Text>
                            <Text style={{ color: theme.colors.subtext, fontSize: 16, textDecorationLine: 'line-through', marginLeft: 10 }}>
                                €{preDiscountPrice.toFixed(2)}
                            </Text>
                        </>
                    ) : (
                        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
                            €{effectivePrice.toFixed(2)}
                        </Text>
                    )}
                </View>

                {(activeProduct.description || product.description) && (
                    <Text style={{ color: theme.colors.subtext, fontSize: 14, lineHeight: 21, marginTop: 10 }}>
                        {activeProduct.description || product.description}
                    </Text>
                )}
            </View>

            {/* ── Size / Variant Picker ── */}
            {selectableVariants.length > 1 && (
                <View style={{ marginTop: 24 }}>
                    <SectionHeader
                        title={t.product.choose_size}
                        badge={t.product.required_badge}
                        badgeColor={theme.colors.primary}
                        theme={theme}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                    >
                        {selectableVariants.map((v) => {
                            const isActive = selectedVariantId === v.id;
                            const variantPrice = getEffectiveProductPrice(v);
                            return (
                                <TouchableOpacity
                                    key={v.id}
                                    onPress={() => setSelectedVariantId(v.id)}
                                    activeOpacity={0.7}
                                    style={{
                                        minWidth: 100,
                                        paddingVertical: 12,
                                        paddingHorizontal: 16,
                                        borderRadius: 14,
                                        borderWidth: 2,
                                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                        backgroundColor: isActive ? theme.colors.primary + '12' : theme.colors.card,
                                        alignItems: 'center',
                                    }}
                                >
                                    {/* Check indicator */}
                                    {isActive && (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: 6,
                                                right: 6,
                                                width: 18,
                                                height: 18,
                                                borderRadius: 9,
                                                backgroundColor: theme.colors.primary,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                        </View>
                                    )}
                                    <Text
                                        style={{
                                            fontWeight: '700',
                                            fontSize: 15,
                                            color: isActive ? theme.colors.primary : theme.colors.text,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {v.name}
                                    </Text>
                                    <Text
                                        style={{
                                            fontWeight: '600',
                                            fontSize: 13,
                                            color: isActive ? theme.colors.primary : theme.colors.subtext,
                                            marginTop: 3,
                                        }}
                                    >
                                        €{variantPrice.toFixed(2)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── Option Groups ── */}
            {optionGroupsForSelection.map((group) => {
                const isRequired = group.minSelections > 0;
                const isSingleSelect = group.maxSelections === 1;
                const count = selectedCount(group.id);
                const isSatisfied = count >= group.minSelections;

                return (
                    <View key={group.id} style={{ marginTop: 28 }}>
                        <SectionHeader
                            title={group.name}
                            badge={
                                isRequired
                                    ? isSatisfied
                                        ? undefined
                                        : t.product.required_badge
                                    : t.product.optional_badge
                            }
                            badgeColor={
                                isRequired && !isSatisfied
                                    ? theme.colors.expense
                                    : theme.colors.subtext
                            }
                            subtitle={
                                isSingleSelect
                                    ? t.product.select_one
                                    : group.maxSelections > 1
                                        ? t.product.select_up_to.replace('{{max}}', String(group.maxSelections))
                                        : undefined
                            }
                            theme={theme}
                        />

                        <View style={{ paddingHorizontal: 20 }}>
                            <View
                                style={{
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                }}
                            >
                                {group.options.map((option, idx: number) => {
                                    const isSelected = selectedOptions[group.id]?.includes(option.id);
                                    const isLast = idx === group.options.length - 1;

                                    return (
                                        <TouchableOpacity
                                            key={option.id}
                                            onPress={() => handleOptionToggle(group.id, option.id, group.maxSelections)}
                                            activeOpacity={0.65}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: option.imageUrl ? 10 : 14,
                                                paddingHorizontal: 16,
                                                backgroundColor: isSelected
                                                    ? theme.colors.primary + '0A'
                                                    : theme.colors.card,
                                                borderBottomWidth: isLast ? 0 : 1,
                                                borderBottomColor: theme.colors.border,
                                            }}
                                        >
                                            {/* Option thumbnail */}
                                            {option.imageUrl && (
                                                <Image
                                                    source={{ uri: option.imageUrl }}
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: 10,
                                                        marginRight: 12,
                                                        backgroundColor: theme.colors.background,
                                                    }}
                                                    resizeMode="cover"
                                                />
                                            )}

                                            {/* Option name + price */}
                                            <View style={{ flex: 1, marginRight: 12 }}>
                                                <Text
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: isSelected ? '600' : '400',
                                                        color: theme.colors.text,
                                                    }}
                                                >
                                                    {option.name}
                                                </Text>
                                                {option.extraPrice > 0 ? (
                                                    <Text
                                                        style={{
                                                            color: theme.colors.subtext,
                                                            fontWeight: '500',
                                                            fontSize: 13,
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        +€{option.extraPrice.toFixed(2)}
                                                    </Text>
                                                ) : (
                                                    <Text
                                                        style={{
                                                            color: theme.colors.subtext,
                                                            fontSize: 12,
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {t.product.included}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Radio / Checkbox indicator */}
                                            <View
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: isSingleSelect ? 12 : 6,
                                                    borderWidth: 2,
                                                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

/* ── Section Header ── */
function SectionHeader({
    title,
    badge,
    badgeColor,
    subtitle,
    theme,
}: {
    title: string;
    badge?: string;
    badgeColor?: string;
    subtitle?: string;
    theme: ReturnType<typeof useTheme>;
}) {
    return (
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
                    {title}
                </Text>
                {badge && (
                    <View
                        style={{
                            backgroundColor: (badgeColor ?? theme.colors.primary) + '15',
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: 8,
                        }}
                    >
                        <Text
                            style={{
                                color: badgeColor ?? theme.colors.primary,
                                fontSize: 11,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            {badge}
                        </Text>
                    </View>
                )}
            </View>
            {subtitle && (
                <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 3 }}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
}
