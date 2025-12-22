import { useCartActionsStore } from '../store/cartActionsStore';

export const useCartActions = () => {
    return useCartActionsStore();
};
