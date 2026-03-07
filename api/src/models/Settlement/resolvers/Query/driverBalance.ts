// @ts-nocheck
import type { QueryResolvers } from './../../../../generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';

export const driverBalance: NonNullable<QueryResolvers['driverBalance']> = async (
    _parent,
    { driverId },
    { db }
) => {
    const repo = new SettlementRepository(db);
    return repo.getDriverBalance(driverId);
};