import type { DbUser } from '@/database/schema/users';
import type { AppLanguage, ResolversParentTypes } from '@/generated/types.generated';

function toAppLanguage(language: string | null | undefined): AppLanguage {
    return String(language || 'en').toLowerCase() === 'al' ? 'AL' : 'EN';
}

export function toUserParent(user: DbUser): ResolversParentTypes['User'] {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address || null,
        phoneNumber: user.phoneNumber || null,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        signupStep: user.signupStep,
        role: user.role,
        businessId: user.businessId || null,
        adminNote: user.adminNote || null,
        flagColor: user.flagColor || 'yellow',
        imageUrl: user.imageUrl || null,
        referralCode: user.referralCode || null,
        preferredLanguage: toAppLanguage(user.preferredLanguage),
        permissions: [],
        isOnline: false,
    };
}
