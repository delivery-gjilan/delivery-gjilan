// @ts-nocheck
﻿import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { drivers as driversTable } from '@/database/schema';
import { eq } from 'drizzle-orm';

export const settlements: NonNullable<QueryResolvers['settlements']> = async (
    _parent,
    args,
    { db, userData }
) => {
    const repo = new SettlementRepository(db);
    let resolvedArgs = { ...args };

    // Drivers can only see their own settlements  auto-scope by their drivers.id
    if (userData?.role === 'DRIVER' && userData.userId) {
        const driverRecord = await db.query.drivers.findFirst({
            where: eq(driversTable.userId, userData.userId),
        });
        if (driverRecord) {
            resolvedArgs = { ...resolvedArgs, driverId: driverRecord.id };
        }
    }

    return repo.getSettlements(resolvedArgs);
};