import { View, Text, TouchableOpacity, Image } from 'react-native';
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
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
                <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 }}>
                    {activeProduct.name}
                </Text>

                {(activeProduct.description || product.description) && (
                    <Text style={{ color: theme.colors.subtext, fontSize: 15, lineHeight: 22, marginTop: 6 }}>
                        {activeProduct.description || product.description}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
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
                        <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: '800' }}>
                            €{effectivePrice.toFixed(2)}
                        </Text>
                    )}
                </View>
            </View>

            {/* ── Size / Variant Picker ── */}
            {selectableVariants.length > 1 && (
                <View style={{ marginTop: 20 }}>
                    <SectionHeader
                        title={t.product.choose_size}
                        badge={t.product.required_badge}
                        badgeColor={theme.colors.primary}
                        theme={theme}
                    />
                    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10 }}>
                        {selectableVariants.map((v) => {
                            const isActive = selectedVariantId === v.id;
                            const variantPrice = getEffectiveProductPrice(v);
                            return (
                                <TouchableOpacity
                                    key={v.id}
                                    onPress={() => setSelectedVariantId(v.id)}
                                    activeOpacity={0.7}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 14,
                                        paddingHorizontal: 10,
                                        borderRadius: 16,
                                        borderWidth: 2,
                                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                        backgroundColor: isActive ? theme.colors.primary + '12' : theme.colors.card,
                                        alignItems: 'center',
                                    }}
                                >
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
                                            marginTop: 2,
                                        }}
                                    >
                                        €{variantPrice.toFixed(2)}
                                    </Text>
                                    {isActive && (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: -1,
                                                right: -1,
                                                width: 22,
                                                height: 22,
                                                borderRadius: 11,
                                                backgroundColor: theme.colors.primary,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* ── Option Groups ── */}
            {optionGroupsForSelection.map((group) => {
                const isRequired = group.minSelections > 0;
                const isSingleSelect = group.maxSelections === 1;
                const count = selectedCount(group.id);

                return (
                    <View key={group.id} style={{ marginTop: 24 }}>
                        <SectionHeader
                            title={group.name}
                            badge={
                                isRequired
                                    ? count >= group.minSelections
                                        ? undefined
                                        : t.product.required_badge
                                    : t.product.optional_badge
                            }
                            badgeColor={
                                isRequired && count < group.minSelections
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

                        <View style={{ paddingHorizontal: 20, gap: 6 }}>
                            {group.options.map((option, idx: number) => {
                                const isSelected = selectedOptions[group.id]?.includes(option.id);
                                const isFirst = idx === 0;
                                const isLast = idx === group.options.length - 1;

                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        onPress={() => handleOptionToggle(group.id, option.id, group.maxSelections)}
                                        activeOpacity={0.65}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: option.imageUrl ? 10 : 15,
                                            paddingHorizontal: 16,
                                            backgroundColor: isSelected ? theme.colors.primary + '0D' : theme.colors.card,
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                            borderTopLeftRadius: isFirst ? 16 : 6,
                                            borderTopRightRadius: isFirst ? 16 : 6,
                                            borderBottomLeftRadius: isLast ? 16 : 6,
                                            borderBottomRightRadius: isLast ? 16 : 6,
                                        }}
                                    >
                                        {/* Radio / Checkbox indicator */}
                                        <View
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: isSingleSelect ? 12 : 7,
                                                borderWidth: 2,
                                                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                                backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: option.imageUrl ? 12 : 14,
                                            }}
                                        >
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={15} color="#fff" />
                                            )}
                                        </View>

                                        {/* Option thumbnail */}
                                        {option.imageUrl && (
                                            <Image
                                                source={{ uri: option.imageUrl }}
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    marginRight: 12,
                                                    backgroundColor: theme.colors.background,
                                                }}
                                                resizeMode="cover"
                                            />
                                        )}

                                        {/* Option name */}
                                        <Text
                                            style={{
                                                flex: 1,
                                                fontSize: 15,
                                                fontWeight: isSelected ? '600' : '500',
                                                color: isSelected ? theme.colors.text : theme.colors.text,
                                            }}
                                        >
                                            {option.name}
                                        </Text>

                                        {/* Price badge */}
                                        {option.extraPrice > 0 && (
                                            <View
                                                style={{
                                                    backgroundColor: isSelected ? theme.colors.primary + '18' : theme.colors.background,
                                                    paddingHorizontal: 10,
                                                    paddingVertical: 4,
                                                    borderRadius: 10,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: isSelected ? theme.colors.primary : theme.colors.subtext,
                                                        fontWeight: '700',
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    +€{option.extraPrice.toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                        {option.extraPrice === 0 && (
                                            <Text style={{ color: theme.colors.subtext, fontSize: 12, fontWeight: '500' }}>
                                                {t.product.included}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
                    {title}
                </Text>
                {badge && (
                    <View
                        style={{
                            backgroundColor: (badgeColor ?? theme.colors.primary) + '18',
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
