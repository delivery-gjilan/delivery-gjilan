import { useMutation } from '@apollo/client/react';
import { CREATE_ORDER } from '@/graphql/operations/orders';
import { useCart } from './useCart';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useTranslations } from '@/hooks/useTranslations';

export function useCreateOrder() {
    const { items } = useCart();
    const { hasActiveOrders } = useActiveOrdersStore();
    const { t } = useTranslations();

    const [createOrderMutation, { loading, error }] = useMutation(CREATE_ORDER);

    const createOrder = async (
        location: { latitude: number; longitude: number; address: string } | null,
        deliveryPrice: number,
        totalPrice: number,
        promotionId?: string | null,
        promotionIds?: string[] | null,
        driverNotes?: string | null,
        prioritySurcharge?: number,
        userContextLocation?: { latitude: number; longitude: number; address: string } | null,
        priorityRequested?: boolean,
        driverTip?: number,
    ) => {
        // Hard block — UI layers should catch this before reaching here.
        if (hasActiveOrders) {
            throw new Error(t.cart.active_order_exists_message);
        }

        if (items.length === 0) {
            throw new Error('Cart is empty');
        }

        if (!location) {
            throw new Error('Location is required');
        }

        const orderItems = items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
            notes: item.notes || null,
            selectedOptions: item.selectedOptions.map((opt) => ({
                optionGroupId: opt.optionGroupId,
                optionId: opt.optionId,
                price: opt.extraPrice > 0 ? opt.extraPrice : null,
            })),
            childItems:
                item.childItems?.map((child) => ({
                    productId: child.productId,
                    selectedOptions: child.selectedOptions.map((opt) => ({
                        optionGroupId: opt.optionGroupId,
                        optionId: opt.optionId,
                    })),
                })) || [],
        }));

        try {
            const result = await createOrderMutation({
                variables: {
                    input: {
                        items: orderItems,
                        dropOffLocation: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                            address: location.address,
                        },
                        userContextLocation: userContextLocation
                            ? {
                                  latitude: userContextLocation.latitude,
                                  longitude: userContextLocation.longitude,
                                  address: userContextLocation.address,
                              }
                            : null,
                        deliveryPrice,
                        totalPrice,
                        priorityRequested: priorityRequested ?? false,
                        prioritySurcharge: prioritySurcharge ?? 0,
                        driverTip: driverTip ?? 0,
                        promotionId: promotionId || null,
                        promotionIds: promotionIds && promotionIds.length > 0 ? promotionIds : null,
                        driverNotes: driverNotes || null,
                    },
                },
            });

            return result.data?.createOrder;
        } catch (err) {
            console.error('Failed to create order:', err);
            throw err;
        }
    };

    return {
        createOrder,
        loading,
        error,
    };
}
