
import type { MutationResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { publishDriverPttSignal } from '../Subscription/driverPttSignal';

export const adminSendPttSignal: NonNullable<MutationResolvers['adminSendPttSignal']> = async (
        _parent,
        { driverIds, channelName, action, muted },
        { userData }
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }

        const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN' || userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE';
        if (!isAdmin) {
                throw new GraphQLError('Only admins can send PTT signals', { extensions: { code: 'FORBIDDEN' } });
        }

        if (!channelName.trim()) {
                throw new GraphQLError('channelName is required', { extensions: { code: 'BAD_USER_INPUT' } });
        }

        const signalMuted = muted ?? action === 'MUTE';
        const timestamp = new Date();

        driverIds.forEach((driverId) => {
                publishDriverPttSignal(driverId, {
                        driverId,
                        adminId: userData.userId!,
                        channelName,
                        action,
                        muted: signalMuted,
                        timestamp,
                });
        });

        return true;
};