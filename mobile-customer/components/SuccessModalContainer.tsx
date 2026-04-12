import React, { useEffect, useRef, useCallback } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import OrderSuccessScreen from './OrderSuccessScreen';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';
import { useOrderReviewPromptStore } from '@/store/useOrderReviewPromptStore';

const AUTO_DISMISS_MS = 4000;
const ORDER_CREATED_AUTO_DISMISS_MS = 1400;
// Approximate duration of the RN Modal 'fade' animation — used to delay
// post-dismiss navigation so it fires after the modal has fully disappeared.
const MODAL_FADE_MS = 320;

export default function SuccessModalContainer() {
    const router = useRouter();
    const { visible, orderId, type, phase, hideSuccess, suppressCartBarFor } = useSuccessModalStore();
    const requestReviewPrompt = useOrderReviewPromptStore((state) => state.requestPrompt);
    const hasScheduledDismissRef = useRef(false);
    const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Holds the orderId to navigate to after the modal has finished fading out.
    const pendingTrackOrderIdRef = useRef<string | null>(null);
    const pendingReviewOrderIdRef = useRef<string | null>(null);
    // Tracks whether the modal was ever opened so the !visible branch only
    // runs on genuine dismiss events, not on the initial render.
    const wasVisibleRef = useRef(false);

    useEffect(() => {
        if (visible) {
            wasVisibleRef.current = true;

            if (phase === 'success' && !hasScheduledDismissRef.current) {
                hasScheduledDismissRef.current = true;
                // Schedule auto-dismiss. Navigation to the correct destination has
                // already been handled by whoever triggered the modal:
                //   • order_created → route is corrected to home right before dismiss.
                //   • order_delivered → user is already on some screen; no nav needed.
                autoDismissRef.current = setTimeout(() => {
                    if (type === 'order_created') {
                        suppressCartBarFor(MODAL_FADE_MS + 700);
                        // Route first while modal is still visible to prevent
                        // seeing an intermediate underlying screen during fade-out.
                        router.replace('/(tabs)/home');
                    }
                    hideSuccess();
                }, type === 'order_created' ? ORDER_CREATED_AUTO_DISMISS_MS : AUTO_DISMISS_MS);
            }
        } else if (wasVisibleRef.current) {
            // Modal just dismissed (visible flipped false after being true).
            wasVisibleRef.current = false;
            hasScheduledDismissRef.current = false;

            if (autoDismissRef.current) {
                clearTimeout(autoDismissRef.current);
                autoDismissRef.current = null;
            }

            // If the user tapped "Track Order", navigate after the fade finishes
            // so there is no underlying-screen flash during the dismissal animation.
            if (pendingTrackOrderIdRef.current) {
                const targetOrderId = pendingTrackOrderIdRef.current;
                pendingTrackOrderIdRef.current = null;
                setTimeout(() => {
                    router.push(`/orders/${targetOrderId}` as any);
                }, MODAL_FADE_MS);
            }

            if (pendingReviewOrderIdRef.current) {
                const reviewOrderId = pendingReviewOrderIdRef.current;
                pendingReviewOrderIdRef.current = null;
                setTimeout(() => {
                    requestReviewPrompt(reviewOrderId);
                }, MODAL_FADE_MS + 60);
            }
        }
    }, [visible, phase, type, router, hideSuccess, suppressCartBarFor, requestReviewPrompt]);

    const cancelAutoDismiss = useCallback(() => {
        if (autoDismissRef.current) {
            clearTimeout(autoDismissRef.current);
            autoDismissRef.current = null;
        }
    }, []);

    const handleTrackOrder = useCallback(() => {
        cancelAutoDismiss();
        if (orderId) {
            // Store the id, then dismiss. Navigation fires after the fade in the
            // !visible branch above — prevents screen flashes during the animation.
            pendingTrackOrderIdRef.current = orderId;
            if (type === 'order_delivered') {
                pendingReviewOrderIdRef.current = orderId;
            }
            hideSuccess();
        }
    }, [orderId, type, hideSuccess, cancelAutoDismiss]);

    const handleGoHome = useCallback(() => {
        cancelAutoDismiss();
        if (type === 'order_created') {
            suppressCartBarFor(MODAL_FADE_MS + 700);
            // Navigate immediately while modal is mounted so no underlying
            // transitional UI is visible as the modal dismisses.
            router.replace('/(tabs)/home');
        } else if (type === 'order_delivered' && orderId) {
            pendingReviewOrderIdRef.current = orderId;
        }
        // Dismiss now; optional route correction runs after fade in the effect above.
        hideSuccess();
    }, [type, orderId, hideSuccess, cancelAutoDismiss, suppressCartBarFor, router]);

    if (!visible || !type) return null;

    return (
        <Modal
            visible={visible}
            animationType={type === 'order_created' ? 'none' : 'fade'}
            onRequestClose={handleGoHome}
            transparent={false}
        >
            <OrderSuccessScreen
                orderId={orderId}
                type={type}
                phase={phase}
                onTrackOrder={handleTrackOrder}
                onGoHome={handleGoHome}
            />
        </Modal>
    );
}
