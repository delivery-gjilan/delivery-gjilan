import { useEffect } from 'react';
import { useAwaitingApprovalModalStore } from '@/store/useAwaitingApprovalModalStore';
import { useActiveOrdersStore } from '@/modules/orders/store/activeOrdersStore';
import AwaitingApprovalModal from '@/components/AwaitingApprovalModal';

/**
 * Root-level container for the AwaitingApprovalModal.
 * Kept outside FloatingBars / OrdersFloatingBar so the modal lifecycle is
 * independent of whether there are active orders or which route is visible.
 */
export default function AwaitingApprovalModalContainer() {
    const { visible, orderId: modalOrderId, hideModal } = useAwaitingApprovalModalStore();
    const activeOrders = useActiveOrdersStore((state) => state.activeOrders);

    const modalOrder = activeOrders.find(
        (order: any) => String(order?.id) === String(modalOrderId),
    );
    const modalApprovalReasons = Array.isArray((modalOrder as any)?.approvalReasons)
        ? (modalOrder as any).approvalReasons
        : undefined;

    // Auto-close when the order progresses past AWAITING_APPROVAL (e.g. demo mode auto-approval).
    useEffect(() => {
        if (!visible || !modalOrderId) return;
        if (!modalOrder) return;
        if ((modalOrder as any).status !== 'AWAITING_APPROVAL') {
            hideModal();
        }
    }, [visible, modalOrderId, modalOrder, hideModal]);

    const isLocked = visible && !!modalOrder && (modalOrder as any).status === 'AWAITING_APPROVAL';

    return (
        <AwaitingApprovalModal
            visible={visible}
            approvalReasons={modalApprovalReasons}
            onClose={isLocked ? () => {} : hideModal}
            locked={isLocked}
        />
    );
}
