
import type { QueryResolvers } from './../../../../generated/types.generated';
import { SettlementScenarioHarnessService } from '@/services/SettlementScenarioHarnessService';

export const settlementScenarioDefinitions: NonNullable<QueryResolvers['settlementScenarioDefinitions']> = async (
        _parent,
        _arg,
        { db },
) => {
        const harness = new SettlementScenarioHarnessService(db as any);
        return harness.getScenarioDefinitions();
};