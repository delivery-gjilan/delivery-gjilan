import { useEffect, useRef } from 'react';
import { useAwaitingApprovalModalStore } from '@/store/useAwaitingApprovalModalStore';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';
import AwaitingApprovalModal from '@/components/AwaitingApprovalModal';

/**
 * Root-level container for the AwaitingApprovalModal.
 * Kept outside FloatingBars / OrdersFloatingBar so the modal lifecycle is
 * independent of whether there are active orders or which route is visible.
 */
export default function AwaitingApprovalModalContainer() {
    const { visible, orderId: modalOrderId, hideModal, openModal } = useAwaitingApprovalModalStore();
    const activeOrders = useActiveOrdersStore((state) => state.activeOrders);
    // React Native can only show one Modal at a time on iOS.
    // Guard against opening while the order-success modal is visible.
    const successModalVisible = useSuccessModalStore((state) => state.visible);

    const modalOrder = activeOrders.find(
        (order: any) => String(order?.id) === String(modalOrderId),
    );
    const modalApprovalReasons = Array.isArray((modalOrder as any)?.approvalReasons)
        ? (modalOrder as any).approvalReasons
        : undefined;

    // Track which orderId we've already auto-opened for,
    // so dismissing doesn't cause the modal to immediately reopen.
    const autoOpenedForRef = useRef<string | null>(null);

    // Auto-open when any active order enters AWAITING_APPROVAL.
    // Centralised here (not in OrdersFloatingBar) to avoid component-mount races.
    // Does NOT open while the success modal is visible — iOS only renders one Modal at a time,
    // so we'd silently lose the awaiting-approval modal. Once success modal closes, this
    // effect re-fires (successModalVisible changed) and opens the modal then.
    useEffect(() => {
        const awaitingOrder = activeOrders.find(
            (o: any) => o?.status === 'AWAITING_APPROVAL' && o?.id != null,
        ) as any;

        if (awaitingOrder) {
            const orderId = String(awaitingOrder.id);
            if (!visible && !successModalVisible && autoOpenedForRef.current !== orderId) {
                autoOpenedForRef.current = orderId;
                openModal(orderId);
            }
        } else {
            // Order is no longer awaiting approval — reset so it can re-trigger
            // if a NEW order with AWAITING_APPROVAL comes in later.
            autoOpenedForRef.current = null;
        }
    }, [activeOrders, visible, successModalVisible, openModal]);

    // Auto-close when the order progresses past AWAITING_APPROVAL.
    useEffect(() => {
        if (!visible || !modalOrderId) return;
        if (!modalOrder) return;
        if ((modalOrder as any).status !== 'AWAITING_APPROVAL') {
            hideModal();
        }
    }, [visible, modalOrderId, modalOrder, hideModal]);

    const isLocked = visible && !!modalOrder && (modalOrder as any).status === 'AWAITING_APPROVAL';

    const handleClose = () => hideModal();

    return (
        <AwaitingApprovalModal
            visible={visible}
            approvalReasons={modalApprovalReasons}
            onClose={handleClose}
            locked={isLocked}
        />
    );
}
