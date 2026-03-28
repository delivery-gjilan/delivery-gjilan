import type { MutationResolvers } from '@/generated/types.generated';
import { GraphQLError } from 'graphql';
import { businessValidator } from '@/validators/BusinessValidator';
import { businesses } from '@/database/schema/businesses';
import { users } from '@/database/schema/users';
import { hashPassword } from '@/lib/utils/authUtils';
import { canManageBusinesses } from '@/lib/utils/permissions';
import { cache } from '@/lib/cache';
import { createAuditLogger } from '@/services/AuditLogger';
import { toUserParent } from '@/models/User/resolvers/utils/toUserParent';

function timeStringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function validateOwnerCredentials(owner: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}): { normalizedEmail: string } {
    const normalizedEmail = owner.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
        throw new GraphQLError('Invalid owner email format', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    if (owner.password.length < 8) {
        throw new GraphQLError('Owner password must be at least 8 characters long', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    if (!/[A-Z]/.test(owner.password) || !/\d/.test(owner.password)) {
        throw new GraphQLError('Owner password must contain at least one uppercase letter and one number', {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }

    return { normalizedEmail };
}

export const createBusinessWithOwner: NonNullable<MutationResolvers['createBusinessWithOwner']> = async (
    _parent,
    { input },
    context,
) => {
    const { userData, db, businessService, authService } = context;

    if (!canManageBusinesses(userData)) {
        throw new GraphQLError('Unauthorized: Only super admins can create businesses', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const validatedBusinessInput = businessValidator.validateCreateBusiness(input.business);
    const { normalizedEmail } = validateOwnerCredentials(input.owner);

    const existingOwner = await authService.authRepository.findByEmail(normalizedEmail);
    if (existingOwner) {
        throw new GraphQLError('Owner email is already in use', {
            extensions: { code: 'CONFLICT' },
        });
    }

    const ownerPasswordHash = await hashPassword(input.owner.password);

    const result = await db.transaction(async (tx: any) => {
        const [createdBusiness] = await tx
            .insert(businesses)
            .values({
                name: validatedBusinessInput.name,
                description: validatedBusinessInput.description ?? null,
                phoneNumber: validatedBusinessInput.phoneNumber ?? null,
                imageUrl: validatedBusinessInput.imageUrl,
                businessType: validatedBusinessInput.businessType,
                locationLat: validatedBusinessInput.location.latitude,
                locationLng: validatedBusinessInput.location.longitude,
                locationAddress: validatedBusinessInput.location.address,
                opensAt: timeStringToMinutes(validatedBusinessInput.workingHours.opensAt),
                closesAt: timeStringToMinutes(validatedBusinessInput.workingHours.closesAt),
                avgPrepTimeMinutes: validatedBusinessInput.avgPrepTimeMinutes ?? 20,
                isActive: true,
            })
            .returning();

        const [createdOwner] = await tx
            .insert(users)
            .values({
                firstName: input.owner.firstName.trim(),
                lastName: input.owner.lastName.trim(),
                email: normalizedEmail,
                password: ownerPasswordHash,
                role: 'BUSINESS_OWNER',
                businessId: createdBusiness.id,
                signupStep: 'COMPLETED',
                emailVerified: true,
                phoneVerified: false,
                preferredLanguage: 'en',
                adminNote: null,
                flagColor: 'yellow',
            })
            .returning();

        return {
            businessId: createdBusiness.id,
            owner: createdOwner,
        };
    });

    await cache.invalidateAllBusinesses();

    const business = await businessService.getBusiness(result.businessId);
    if (!business) {
        throw new GraphQLError('Business was created but could not be loaded', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }

    const logger = createAuditLogger(db, context);
    await logger.log({
        action: 'BUSINESS_CREATED',
        entityType: 'BUSINESS',
        entityId: business.id,
        metadata: {
            name: business.name,
            businessType: business.businessType,
            phoneNumber: business.phoneNumber,
            ownerEmail: normalizedEmail,
        },
    });

    await logger.log({
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: result.owner.id,
        metadata: {
            email: normalizedEmail,
            role: 'BUSINESS_OWNER',
            businessId: business.id,
            firstName: result.owner.firstName,
            lastName: result.owner.lastName,
        },
    });

    return {
        business,
        owner: toUserParent(result.owner),
    };
};