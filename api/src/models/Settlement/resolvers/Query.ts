import { QueryResolvers } from '@/generated/types.generated';
import { AppContext } from '@/index';
import { SettlementRepository } from '@/repositories/SettlementRepository';
import { settlementScenarioDefinitions as settlementScenarioDefinitionsResolver } from './Query/settlementScenarioDefinitions';

export const Query: QueryResolvers<AppContext> = {
    settlements: async (_, args, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.getSettlements(args);
    },

    settlementSummary: async (_, args, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.getSettlementSummary(args);
    },

    driverBalance: async (_, { driverId }, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.getDriverBalance(driverId);
    },

    businessBalance: async (_, { businessId }, { db }) => {
        const repo = new SettlementRepository(db);
        return repo.getBusinessBalance(businessId);
    },

    settlementScenarioDefinitions: settlementScenarioDefinitionsResolver,
} as any;
