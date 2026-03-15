import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Product, OptionGroup, Option, BusinessType } from '@/gql/graphql';
import { useTranslations } from '@/hooks/useTranslations';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

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
    const { t } = useTranslations();
    const theme = useTheme();

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
        <View className="px-6 py-6" style={{ paddingBottom: 100 }}>
            {/* Product Name */}
            <Text className="text-foreground text-3xl font-bold mb-2">{activeProduct.name}</Text>

            {/* Price Section */}
            <View className="flex-row items-center mb-6">
                {activeProduct.isOnSale && activeProduct.salePrice ? (
                    <>
                        <Text className="text-expense text-3xl font-bold mr-3">€{activeProduct.salePrice.toFixed(2)}</Text>
                        <Text className="text-subtext text-xl line-through">€{activeProduct.price.toFixed(2)}</Text>
                    </>
                ) : (
                    <Text className="text-primary text-3xl font-bold">€{activeProduct.price.toFixed(2)}</Text>
                )}
            </View>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
                <View className="mb-8">
                    <Text className="text-foreground text-lg font-bold mb-4">Select Variant</Text>
                    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                        {product.variants.map((v: any) => (
                            <TouchableOpacity
                                key={v.id}
                                onPress={() => setSelectedVariantId(v.id)}
                                className={`px-4 py-2 rounded-xl border-2 ${
                                    selectedVariantId === v.id ? 'border-primary bg-primary/5' : 'border-border'
                                }`}
                            >
                                <Text
                                    className={`font-semibold ${selectedVariantId === v.id ? 'text-primary' : 'text-subtext'}`}
                                >
                                    {v.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Option Groups */}
            {activeProduct.optionGroups?.length > 0 && (
                <View>
                    {activeProduct.optionGroups.map((group: any) => (
                        <View key={group.id} className="mb-8">
                            <View className="flex-row items-baseline justify-between mb-4">
                                <Text className="text-foreground text-lg font-bold">{group.name}</Text>
                                <Text className="text-subtext text-xs uppercase font-semibold">
                                    {group.minSelections > 0 ? 'Required' : 'Optional'} 
                                    {group.maxSelections > 1 ? ` (Max ${group.maxSelections})` : ''}
                                </Text>
                            </View>
                            
                            <View className="gap-3">
                                {group.options.map((option: any) => {
                                    const isSelected = selectedOptions[group.id]?.includes(option.id);
                                    return (
                                        <TouchableOpacity
                                            key={option.id}
                                            onPress={() => handleOptionToggle(group.id, option.id, group.maxSelections)}
                                            className="flex-row items-center justify-between py-3 px-4 rounded-xl border border-border bg-card"
                                        >
                                            <View className="flex-row items-center flex-1">
                                                <Ionicons
                                                    name={isSelected 
                                                        ? (group.maxSelections === 1 ? 'radio-button-on' : 'checkbox') 
                                                        : (group.maxSelections === 1 ? 'radio-button-off' : 'square-outline')
                                                    }
                                                    size={22}
                                                    color={isSelected ? theme.colors.primary : theme.colors.subtext}
                                                />
                                                <Text className="text-foreground text-base ml-3 flex-1">{option.name}</Text>
                                            </View>
                                            {option.extraPrice > 0 && (
                                                <Text className="text-primary font-semibold">
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
            <View className="h-px bg-border mb-6" />

            {/* Description */}
            {(activeProduct.description || product.description) && (
                <View className="mb-6">
                    <Text className="text-foreground text-lg font-semibold mb-3">{t.product.description}</Text>
                    <Text className="text-subtext text-base leading-6">
                        {activeProduct.description || product.description}
                    </Text>
                </View>
            )}
        </View>
    );
}
