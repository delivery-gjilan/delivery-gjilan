import React, { useEffect, useRef, useCallback } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import OrderSuccessScreen from './OrderSuccessScreen';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';

const AUTO_DISMISS_MS = 4000;

export default function SuccessModalContainer() {
    const router = useRouter();
    const { visible, orderId, type, phase, hideSuccess } = useSuccessModalStore();
    const hasNavigatedRef = useRef(false);
    const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Navigate to home immediately when success phase starts so the screen
    // renders behind the modal. After AUTO_DISMISS_MS the modal fades out
    // and home is already fully loaded — no black flash.
    // The (tabs) screen has animation: 'none' so the transition is instant.
    useEffect(() => {
        if (visible && phase === 'success' && !hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            router.replace('/(tabs)/home');

            autoDismissRef.current = setTimeout(() => {
                hideSuccess();
            }, AUTO_DISMISS_MS);
        }

        if (!visible) {
            hasNavigatedRef.current = false;
            if (autoDismissRef.current) {
                clearTimeout(autoDismissRef.current);
                autoDismissRef.current = null;
            }
        }
    }, [visible, phase, router, hideSuccess]);

    const cancelAutoDismiss = useCallback(() => {
        if (autoDismissRef.current) {
            clearTimeout(autoDismissRef.current);
            autoDismissRef.current = null;
        }
    }, []);

    const handleTrackOrder = useCallback(() => {
        cancelAutoDismiss();
        if (orderId) {
            router.replace(`/orders/${orderId}` as any);
            hideSuccess();
        }
    }, [orderId, router, hideSuccess, cancelAutoDismiss]);

    const handleGoHome = useCallback(() => {
        cancelAutoDismiss();
        // Home is already loaded behind the modal, just dismiss.
        hideSuccess();
    }, [hideSuccess, cancelAutoDismiss]);

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
