import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { hasPermission, isPlatformAdmin } from '@/lib/utils/permissions';

export const settlementSummary: NonNullable<QueryResolvers['settlementSummary']> = async (
    _parent,
    args,
    { db, userData }
) => {
    const repo = new SettlementRepository(db);
    let resolvedArgs = { ...args };

    if (!userData?.role) {
        throw new GraphQLError('Unauthorized', {
            extensions: { code: 'UNAUTHORIZED' },
        });
    }

    // Platform admins: normalize driverId (UI sends users.id, settlements store drivers.id)
    if (isPlatformAdmin(userData.role) && resolvedArgs.driverId) {
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, resolvedArgs.driverId),
        });
        if (driverRecord) {
            resolvedArgs = { ...resolvedArgs, driverId: driverRecord.id };
        }
    }

    if (!isPlatformAdmin(userData.role)) {
        if (userData.role === 'BUSINESS_OWNER') {
            if (!userData.businessId) {
                throw new GraphQLError('Business context missing', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            resolvedArgs = {
                ...resolvedArgs,
                type: 'BUSINESS',
                businessId: userData.businessId,
            };
        } else if (userData.role === 'BUSINESS_EMPLOYEE') {
            if (!userData.businessId) {
                throw new GraphQLError('Business context missing', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const canView = await hasPermission(
                {
                    userId: userData.userId,
                    role: userData.role,
                    businessId: userData.businessId,
                },
                'view_finances',
            );

            if (!canView) {
                throw new GraphQLError('You do not have permission to view finances', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            resolvedArgs = {
                ...resolvedArgs,
                type: 'BUSINESS',
                businessId: userData.businessId,
            };
        }
    }

    return repo.getSettlementSummary(resolvedArgs as any);
};