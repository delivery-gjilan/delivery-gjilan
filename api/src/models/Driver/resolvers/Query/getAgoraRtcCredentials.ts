
import type { QueryResolvers } from './../../../../generated/types.generated';
import { GraphQLError } from 'graphql';
import { createAgoraRtcCredentials } from '@/services/AgoraRtcService';

export const getAgoraRtcCredentials: NonNullable<QueryResolvers['getAgoraRtcCredentials']> = async (
        _parent,
        { channelName, role },
        { userData }
) => {
        if (!userData.userId) {
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
        }

        const isAdmin = userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN' || userData.role === 'BUSINESS_OWNER' || userData.role === 'BUSINESS_EMPLOYEE';
        const isDriver = userData.role === 'DRIVER';

        if (!isAdmin && !isDriver) {
                throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
        }

        if (role === 'PUBLISHER' && !isAdmin) {
                throw new GraphQLError('Only admins can request publisher credentials', {
                        extensions: { code: 'FORBIDDEN' },
                });
        }

        const credentials = createAgoraRtcCredentials({
                userId: userData.userId,
                channelName,
                role,
        });

        return {
                ...credentials,
                expiresAt: credentials.expiresAt,
        };
};