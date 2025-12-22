import { CartItem } from '../types';

export const calculateItemTotal = (item: CartItem): number => {
    return item.price * item.quantity;
};

export const calculateCartTotal = (items: CartItem[]): number => {
    return items.reduce((total, item) => total + calculateItemTotal(item), 0);
};

export const calculateCartItemCount = (items: CartItem[]): number => {
    return items.reduce((count, item) => count + item.quantity, 0);
};
