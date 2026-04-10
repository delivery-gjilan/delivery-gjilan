import React, { useEffect, useRef, useCallback } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import OrderSuccessScreen from './OrderSuccessScreen';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';

const AUTO_DISMISS_MS = 4000;
// Approximate duration of the RN Modal 'fade' animation — used to delay
// post-dismiss navigation so it fires after the modal has fully disappeared.
const MODAL_FADE_MS = 320;

export default function SuccessModalContainer() {
    const router = useRouter();
    const { visible, orderId, type, phase, hideSuccess, suppressCartBarFor } = useSuccessModalStore();
    const hasScheduledDismissRef = useRef(false);
    const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Holds the orderId to navigate to after the modal has finished fading out.
    const pendingTrackOrderIdRef = useRef<string | null>(null);
    const pendingGoHomeRef = useRef(false);
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
                //   • order_created → CartScreen calls router.replace('/(tabs)/home')
                //     before showSuccess() so home is under the modal while it plays.
                //   • order_delivered → user is already on some screen; no nav needed.
                autoDismissRef.current = setTimeout(() => {
                    if (type === 'order_created') {
                        suppressCartBarFor(MODAL_FADE_MS + 700);
                        pendingGoHomeRef.current = true;
                    }
                    hideSuccess();
                }, AUTO_DISMISS_MS);
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
            } else if (pendingGoHomeRef.current) {
                pendingGoHomeRef.current = false;
                setTimeout(() => {
                    router.replace('/(tabs)/home');
                }, MODAL_FADE_MS);
            }
        }
    }, [visible, phase, type, router, hideSuccess, suppressCartBarFor]);

    const cancelAutoDismiss = useCallback(() => {
        if (autoDismissRef.current) {
            clearTimeout(autoDismissRef.current);
            autoDismissRef.current = null;
        }
    }, []);

    const handleTrackOrder = useCallback(() => {
        cancelAutoDismiss();
        pendingGoHomeRef.current = false;
        if (orderId) {
            // Store the id, then dismiss. Navigation fires after the fade in the
            // !visible branch above — prevents screen flashes during the animation.
            pendingTrackOrderIdRef.current = orderId;
            hideSuccess();
        }
    }, [orderId, hideSuccess, cancelAutoDismiss]);

    const handleGoHome = useCallback(() => {
        cancelAutoDismiss();
        if (type === 'order_created') {
            suppressCartBarFor(MODAL_FADE_MS + 700);
            pendingGoHomeRef.current = true;
        }
        // Dismiss now; optional route correction runs after fade in the effect above.
        hideSuccess();
    }, [type, hideSuccess, cancelAutoDismiss, suppressCartBarFor]);

    if (!visible || !type) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
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
