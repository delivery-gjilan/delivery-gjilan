import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import OrderReviewModal from '@/components/OrderReviewModal';
import { GET_ORDER_REVIEW_CONTEXT, SUBMIT_ORDER_REVIEW } from '@/graphql/operations/orders';
import { useOrderReviewPromptStore } from '@/store/useOrderReviewPromptStore';
import { useOrderReviewPreferencesStore } from '@/store/useOrderReviewPreferencesStore';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';

export default function OrderReviewModalContainer() {
    const activeOrderId = useOrderReviewPromptStore((state) => state.activeOrderId);
    const closePrompt = useOrderReviewPromptStore((state) => state.closePrompt);

    const hiddenForAll = useOrderReviewPreferencesStore((state) => state.hiddenForAll);
    const hiddenBusinessIds = useOrderReviewPreferencesStore((state) => state.hiddenBusinessIds);
    const handledOrderIds = useOrderReviewPreferencesStore((state) => state.handledOrderIds);
    const markOrderHandled = useOrderReviewPreferencesStore((state) => state.markOrderHandled);
    const hideForBusiness = useOrderReviewPreferencesStore((state) => state.hideForBusiness);
    const hideForAll = useOrderReviewPreferencesStore((state) => state.hideForAll);

    const successModalVisible = useSuccessModalStore((state) => state.visible);

    const { data, loading } = useQuery(GET_ORDER_REVIEW_CONTEXT, {
        variables: { id: activeOrderId },
        skip: !activeOrderId,
        fetchPolicy: 'network-only',
    });

    const [submitOrderReview, { loading: submitting }] = useMutation(SUBMIT_ORDER_REVIEW);

    const order = (data as any)?.order;
    const business = useMemo(() => order?.businesses?.[0]?.business, [order]);
    const businessId = business?.id ? String(business.id) : null;
    const businessName = business?.name ? String(business.name) : undefined;

    const closeAndMarkHandled = () => {
        if (activeOrderId) {
            markOrderHandled(activeOrderId);
        }
        closePrompt();
    };

    const shouldCloseForHandled = !!activeOrderId && handledOrderIds.includes(activeOrderId);
    const shouldCloseForGlobalMute = !!activeOrderId && hiddenForAll;
    const shouldCloseForBusinessMute = !!activeOrderId && !!businessId && hiddenBusinessIds.includes(businessId);
    const shouldCloseForInvalidOrder =
        !!activeOrderId &&
        !loading &&
        (!order || order.status !== 'DELIVERED' || !!order.review);

    useEffect(() => {
        if (!activeOrderId) return;
        if (shouldCloseForHandled) {
            closePrompt();
        }
    }, [activeOrderId, shouldCloseForHandled, closePrompt]);

    useEffect(() => {
        if (!activeOrderId) return;
        if (shouldCloseForGlobalMute || shouldCloseForBusinessMute || shouldCloseForInvalidOrder) {
            closeAndMarkHandled();
        }
    }, [
        activeOrderId,
        shouldCloseForGlobalMute,
        shouldCloseForBusinessMute,
        shouldCloseForInvalidOrder,
    ]);

    if (!activeOrderId) return null;

    if (shouldCloseForHandled || shouldCloseForGlobalMute || shouldCloseForBusinessMute || shouldCloseForInvalidOrder) {
        return null;
    }

    if (loading || successModalVisible) {
        return null;
    }

    if (!order) return null;

    return (
        <OrderReviewModal
            visible
            businessName={businessName}
            submitting={submitting}
            onSubmit={async ({ rating, comment, quickFeedback }) => {
                if (!activeOrderId) return;
                await submitOrderReview({
                    variables: {
                        orderId: activeOrderId,
                        rating,
                        comment: comment.trim() || null,
                        quickFeedback,
                    },
                });
                closeAndMarkHandled();
            }}
            onSkipOrder={closeAndMarkHandled}
            onHideBusiness={() => {
                if (businessId) {
                    hideForBusiness(businessId);
                }
                closeAndMarkHandled();
            }}
            onHideAll={() => {
                hideForAll();
                closeAndMarkHandled();
            }}
        />
    );
}
