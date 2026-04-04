import { useState, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { useCart } from '@/modules/cart/hooks/useCart';
import { useCartActions } from '@/modules/cart/hooks/useCartActions';
import { Product } from '@/gql/graphql';
import { GET_BUSINESS } from '@/graphql/operations/businesses';
import { useTranslations } from '@/hooks/useTranslations';
import { getEffectiveProductPrice, getPreDiscountProductPrice } from '@/modules/product/utils/pricing';

export function useProductActions(
    product: any,
    selectedOptions: Record<string, string[]> = {},
    parentProduct?: any,
    editingCartItemId?: string,
) {
    const { items } = useCart();
    const { addItem, updateQuantity, removeItem } = useCartActions();
    const { t } = useTranslations();

    // Fetch business type (should be cached from business screen)
    const { data: businessData } = useQuery(GET_BUSINESS, {
        variables: { id: (product.businessId || parentProduct?.businessId) ?? '' },
        skip: !(product.businessId || parentProduct?.businessId),
        fetchPolicy: 'cache-first',
    });
    const businessType = businessData?.business?.businessType;

    // Generate unique cart item ID based on productId and selected options
    const cartItemId = useMemo(() => {
        const optionPart = Object.values(selectedOptions).flat().sort().join('-');
        return optionPart ? `${product.id}-${optionPart}` : product.id;
    }, [product.id, selectedOptions]);

    // Find cart item
    const cartItem = useMemo(() => {
        return items.find((item) => item.cartItemId === cartItemId);
    }, [items, cartItemId]);

    // Local quantity state
    const [localQuantity, setLocalQuantity] = useState(cartItem?.quantity || 1);

    useEffect(() => {
        setLocalQuantity(cartItem?.quantity || 1);
    }, [cartItem?.quantity]);

    const isInCart = !!cartItem;
    const hasQuantityChanged = isInCart && cartItem.quantity !== localQuantity;

    const incrementQuantity = () => {
        setLocalQuantity((prev) => prev + 1);
    };

    const decrementQuantity = () => {
        setLocalQuantity((prev) => Math.max(1, prev - 1));
    };

    const addToCart = () => {
        if (!product.id) return;

        // Build selected options and child items for CartItem
        const cartItemOptions: {
            optionGroupId: string;
            optionId: string;
            name: string;
            extraPrice: number;
        }[] = [];

        const childItems: {
            productId: string;
            name: string;
            imageUrl?: string;
            selectedOptions: any[]; // Nested options not fully supported in UI yet
        }[] = [];

        Object.entries(selectedOptions).forEach(([groupId, optionIds]) => {
            const sourceOptionGroups =
                product.optionGroups && product.optionGroups.length > 0
                    ? product.optionGroups
                    : (parentProduct?.optionGroups ?? []);
            const group = sourceOptionGroups.find((og: any) => og.id === groupId);
            if (group) {
                optionIds.forEach((oid) => {
                    const opt = group.options.find((o: any) => o.id === oid);
                    if (opt) {
                        cartItemOptions.push({
                            optionGroupId: groupId,
                            optionId: oid,
                            name: opt.name,
                            extraPrice: opt.extraPrice,
                        });

                        if (opt.linkedProductId) {
                            childItems.push({
                                productId: opt.linkedProductId,
                                name: opt.linkedProduct?.name || opt.name,
                                imageUrl: opt.linkedProduct?.imageUrl || undefined,
                                selectedOptions: [],
                            });
                        }
                    }
                });
            }
        });

        const unitPrice = getEffectiveProductPrice(product);
        const preDiscountPrice = getPreDiscountProductPrice(product);

        const error = addItem({
            cartItemId,
            productId: product.id,
            name: product.name ?? 'Unknown',
            unitPrice,
            quantity: localQuantity,
            imageUrl: product.imageUrl || parentProduct?.imageUrl || undefined,
            businessId: (product.businessId || parentProduct?.businessId) ?? '',
            businessType: businessType,
            originalPrice: preDiscountPrice ?? undefined,
            selectedOptions: cartItemOptions,
            childItems: childItems.length > 0 ? childItems : undefined,
        });

        if (error) {
            Alert.alert(t.product.cannot_add_item, error);
            return;
        }

        // If we came from editing a specific cart item and selection key changed,
        // remove the previous cart entry so the edit behaves as a replace.
        if (editingCartItemId && editingCartItemId !== cartItemId) {
            removeItem(editingCartItemId);
        }

        // Navigate back to previous screen
        router.back();
    };

    const updateCart = () => {
        if (!cartItemId) return;
        updateQuantity(cartItemId, localQuantity);

        // Navigate back to previous screen
        router.back();
    };

    const removeFromCart = () => {
        if (!cartItemId) return;
        removeItem(cartItemId);
        setLocalQuantity(1);
    };

    return {
        localQuantity,
        cartQuantity: cartItem?.quantity || 0,
        isInCart,
        hasQuantityChanged,
        incrementQuantity,
        decrementQuantity,
        addToCart,
        updateCart,
        removeFromCart,
    };
}
