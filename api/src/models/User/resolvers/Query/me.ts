import type { QueryResolvers } from '@/generated/types.generated';
import { toUserParent } from '../utils/toUserParent';

export const me: NonNullable<QueryResolvers['me']> = async (_parent, _args, { authService, request }) => {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = await authService.verifyJWT(token);

    if (!user) {
        return null;
    }

    return toUserParent(user);
};
