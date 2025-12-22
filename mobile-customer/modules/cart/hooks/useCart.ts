import { useCartDataStore } from '../store/cartDataStore';
import { calculateCartTotal, calculateCartItemCount } from '../utils/price';

export const useCart = () => {
    const items = useCartDataStore((state) => state.items);

    // Derived state
    const total = calculateCartTotal(items);
    const count = calculateCartItemCount(items);

    return {
        items,
        total,
        count,
        isEmpty: items.length === 0,
    };
};
