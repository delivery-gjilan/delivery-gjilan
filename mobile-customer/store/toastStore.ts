import RNToast from 'react-native-toast-message';

/**
 * Thin wrapper around react-native-toast-message for a convenient API.
 * Import `toast` anywhere (including non-component code like Apollo links)
 * and call `toast.success(title, message?)` etc.
 */
export const toast = {
    success: (title: string, message?: string) =>
        RNToast.show({ type: 'success', text1: title, text2: message }),
    error: (title: string, message?: string) =>
        RNToast.show({ type: 'error', text1: title, text2: message }),
    info: (title: string, message?: string) =>
        RNToast.show({ type: 'info', text1: title, text2: message }),
    warning: (title: string, message?: string) =>
        RNToast.show({ type: 'error', text1: title, text2: message }),
};
