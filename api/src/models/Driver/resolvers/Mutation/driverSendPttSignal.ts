import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { publishAdminPttSignal } from '../Subscription/adminPttSignal';

export const driverSendPttSignal: NonNullable<MutationResolvers['driverSendPttSignal']> = async (
        _parent,
        { channelName, action },
        { userData }
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }

        if (userData.role !== 'DRIVER') {
                throw new GraphQLError('Only drivers can send driver PTT signals', { extensions: { code: 'FORBIDDEN' } });
        }

        if (!channelName.trim()) {
                throw new GraphQLError('channelName is required', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        publishAdminPttSignal({
                driverId: userData.userId,
                channelName,
                action,
                timestamp: new Date(),
        });

        return true;
};