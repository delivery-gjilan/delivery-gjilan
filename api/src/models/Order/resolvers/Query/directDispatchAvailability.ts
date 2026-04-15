import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { DirectDispatchService } from '@/services/DirectDispatchService';
import { DriverRepository } from '@/repositories/DriverRepository';

export const directDispatchAvailability: NonNullable<QueryResolvers['directDispatchAvailability']> = async (
    _parent,
    _args,
    context,
) => {
    const { db, userData, orderService } = context;
    const { role, businessId } = userData;

    if (!role || !businessId) {
        throw new GraphQLError('Only business users can check direct dispatch availability', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    if (role !== 'BUSINESS_OWNER' && role !== 'BUSINESS_EMPLOYEE') {
        throw new GraphQLError('Only business users can check direct dispatch availability', {
            extensions: { code: 'FORBIDDEN' },
        });
    }

    const driverRepo = new DriverRepository(db);
    const orderRepo = orderService.orderRepository;
    const service = new DirectDispatchService(db, driverRepo, orderRepo);

    return service.checkAvailability(businessId);
};
