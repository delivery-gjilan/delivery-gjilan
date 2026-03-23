import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Product, OptionGroup, Option, BusinessType } from '@/gql/graphql';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { getEffectiveProductPrice } from '@/modules/product/utils/pricing';

interface ProductDetailsProps {
    product: any; // Using any for simplicity with complex GQL types
    activeProduct: any;
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
            (v: any, idx: number, arr: any[]) => arr.findIndex((x) => x.id === v.id) === idx,
        );

        const optionGroupsForSelection =
            activeProduct.optionGroups && activeProduct.optionGroups.length > 0
                ? activeProduct.optionGroups
                : (product.optionGroups ?? []);

    const { t } = useTranslations();
    const theme = useTheme();
    const effectivePrice = getEffectiveProductPrice(activeProduct);

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
                return; // Max reached
            }
        }

        setSelectedOptions({
            ...selectedOptions,
            [groupId]: updated,
        });
    };

    return (
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 }}>
            {/* Product Name */}
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '700', marginBottom: 6 }}>
                {activeProduct.name}
            </Text>

            {/* Price Section */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                {activeProduct.isOnSale && activeProduct.salePrice ? (
                    <>
                        <Text style={{ color: theme.colors.expense, fontSize: 22, fontWeight: '700', marginRight: 10 }}>
                            €{activeProduct.salePrice.toFixed(2)}
                        </Text>
                        <Text style={{ color: theme.colors.subtext, fontSize: 17, textDecorationLine: 'line-through' }}>
                            €{activeProduct.price.toFixed(2)}
                        </Text>
                    </>
                ) : (
                    <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: '700' }}>
                        €{effectivePrice.toFixed(2)}
                    </Text>
                )}
            </View>

            {/* Variants Selector */}
            {selectableVariants.length > 1 && (
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>
                        Select Variant
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {selectableVariants.map((v: any) => (
                            <TouchableOpacity
                                key={v.id}
                                onPress={() => setSelectedVariantId(v.id)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    borderWidth: 1.5,
                                    borderColor: selectedVariantId === v.id ? theme.colors.primary : theme.colors.border,
                                    backgroundColor: selectedVariantId === v.id ? theme.colors.primary + '10' : 'transparent',
                                }}
                            >
                                <Text
                                    style={{
                                        fontWeight: '600',
                                        fontSize: 14,
                                        color: selectedVariantId === v.id ? theme.colors.primary : theme.colors.subtext,
                                    }}
                                >
                                    {v.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Option Groups */}
            {optionGroupsForSelection.length > 0 && (
                <View>
                    {optionGroupsForSelection.map((group: any) => (
                        <View key={group.id} style={{ marginBottom: 28 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
                                    {group.name}
                                </Text>
                                <Text style={{ color: theme.colors.subtext, fontSize: 11, textTransform: 'uppercase', fontWeight: '600' }}>
                                    {group.minSelections > 0 ? 'Required' : 'Optional'}
                                    {group.maxSelections > 1 ? ` (Max ${group.maxSelections})` : ''}
                                </Text>
                            </View>

                            <View style={{ gap: 8 }}>
                                {group.options.map((option: any) => {
                                    const isSelected = selectedOptions[group.id]?.includes(option.id);
                                    return (
                                        <TouchableOpacity
                                            key={option.id}
                                            onPress={() => handleOptionToggle(group.id, option.id, group.maxSelections)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingVertical: 14,
                                                paddingHorizontal: 16,
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                                backgroundColor: isSelected ? theme.colors.primary + '08' : theme.colors.card,
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <Ionicons
                                                    name={isSelected
                                                        ? (group.maxSelections === 1 ? 'radio-button-on' : 'checkbox')
                                                        : (group.maxSelections === 1 ? 'radio-button-off' : 'square-outline')
                                                    }
                                                    size={22}
                                                    color={isSelected ? theme.colors.primary : theme.colors.subtext}
                                                />
                                                <Text style={{ color: theme.colors.text, fontSize: 15, marginLeft: 12, flex: 1 }}>
                                                    {option.name}
                                                </Text>
                                            </View>
                                            {option.extraPrice > 0 && (
                                                <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>
                                                    +€{option.extraPrice.toFixed(2)}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: theme.colors.border, marginBottom: 20 }} />

            {/* Description */}
            {(activeProduct.description || product.description) && (
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '600', marginBottom: 10 }}>
                        {t.product.description}
                    </Text>
                    <Text style={{ color: theme.colors.subtext, fontSize: 15, lineHeight: 22 }}>
                        {activeProduct.description || product.description}
                    </Text>
                </View>
            )}
        </View>
    );
}
