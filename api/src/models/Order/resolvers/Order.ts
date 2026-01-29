import type { OrderResolvers } from './../../../generated/types.generated';

export const Order: OrderResolvers = {
    user: async (parent, _args, { authService }) => {
        if (!parent.userId) {
            return null;
        }
        
        try {
            const user = await authService.authRepository.findById(parent.userId);
            return user || null;
        } catch (error) {
            console.error('Error fetching user for order:', error);
            return null;
        }
    },
};
