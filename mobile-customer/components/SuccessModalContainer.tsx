import React from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import OrderSuccessScreen from './OrderSuccessScreen';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';

export default function SuccessModalContainer() {
    const router = useRouter();
    const { visible, orderId, type, phase, hideSuccess } = useSuccessModalStore();

    console.log('[SuccessModalContainer] State:', { visible, orderId, type, phase });

    const navigateUnderModal = (navigate: () => void) => {
        navigate();
        setTimeout(() => {
            hideSuccess();
        }, 80);
    };

    const handleTrackOrder = () => {
        if (orderId) {
            navigateUnderModal(() => {
                router.replace(`/orders/${orderId}` as any);
            });
        }
    };

    const handleGoHome = () => {
        navigateUnderModal(() => {
            router.replace('/(tabs)/home');
        });
    };

    console.log('[SuccessModalContainer] Rendering:', visible && type, phase);

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
