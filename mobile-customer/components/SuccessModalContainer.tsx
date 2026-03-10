import React from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import OrderSuccessScreen from './OrderSuccessScreen';
import { useSuccessModalStore } from '@/store/useSuccessModalStore';

export default function SuccessModalContainer() {
    const router = useRouter();
    const { visible, orderId, type, hideSuccess } = useSuccessModalStore();

    console.log('[SuccessModalContainer] State:', { visible, orderId, type });

    const handleTrackOrder = () => {
        hideSuccess();
        if (orderId) {
            // Use setTimeout to ensure modal closes before navigation
            setTimeout(() => {
                router.push(`/orders/${orderId}` as any);
            }, 100);
        }
    };

    const handleGoHome = () => {
        hideSuccess();
        // Use setTimeout to ensure modal closes before navigation
        setTimeout(() => {
            router.push('/(tabs)/home');
        }, 100);
    };

    console.log('[SuccessModalContainer] Rendering:', visible && type);

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
                onTrackOrder={handleTrackOrder}
                onGoHome={handleGoHome}
            />
        </Modal>
    );
}
