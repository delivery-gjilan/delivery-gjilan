import type { QueryResolvers } from './../../../../generated/types.generated';
export const user: NonNullable<QueryResolvers['user']> = async (_parent, _arg, _ctx) => {
    /* Implement Query.user resolver logic here */
    return {
        id: '1',
        address: '1',
        name: '1',
    };
};
