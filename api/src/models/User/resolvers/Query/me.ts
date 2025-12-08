import type { QueryResolvers } from '@/generated/types.generated';

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

    return {
        id: user.id.toString(),
        email: user.email,
        name: user.name || null,
        address: user.address || null,
        phoneNumber: user.phoneNumber || null,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        signupStep: user.signupStep as 'INITIAL' | 'EMAIL_SENT' | 'EMAIL_VERIFIED' | 'PHONE_SENT' | 'COMPLETED',
    };
};
