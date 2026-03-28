
import type { MutationResolvers } from './../../../../generated/types.generated';
import { SettlementScenarioHarnessService } from '@/services/SettlementScenarioHarnessService';
import { GraphQLError } from 'graphql';

export const runSettlementScenarioHarness: NonNullable<MutationResolvers['runSettlementScenarioHarness']> = async (
        _parent,
        { scenarioIds },
        { db, userData },
) => {
        if (!userData || (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN')) {
                throw new GraphQLError('Only admins can run settlement scenario tests', {
                        extensions: { code: 'FORBIDDEN' },
                });
        }

        const harness = new SettlementScenarioHarnessService(db as any);
        return harness.runHarness(scenarioIds ?? null);
};