import { CartItem } from '../types';

export const calculateItemOptionsTotal = (item: CartItem): number => {
    return item.selectedOptions.reduce((sum, option) => sum + Number(option.extraPrice || 0), 0);
};

export const calculateItemUnitTotal = (item: CartItem): number => {
    return Number(item.unitPrice) + calculateItemOptionsTotal(item);
};

export const calculateItemTotal = (item: CartItem): number => {
    return calculateItemUnitTotal(item) * item.quantity;
};

export const calculateCartTotal = (items: CartItem[]): number => {
    return items.reduce((total, item) => total + calculateItemTotal(item), 0);
};

export const calculateCartItemCount = (items: CartItem[]): number => {
    return items.reduce((count, item) => count + item.quantity, 0);
};
