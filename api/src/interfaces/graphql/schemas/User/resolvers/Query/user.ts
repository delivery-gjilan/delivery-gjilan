import type { QueryResolvers } from './../../../../generated/types.generated';
export const user: NonNullable<QueryResolvers['user']> = async (_parent, _arg, _ctx) => {
  return {
    id: _arg.id,
    name: 'User',
    address: {
      city: 'City',
      country: 'Country',
      street: 'Street',
    },
  };
};
