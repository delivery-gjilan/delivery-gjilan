import type { QueryResolvers } from './../../../../generated/types.generated';
export const order: NonNullable<QueryResolvers['order']> = async (_parent, _arg, _ctx) => {
  return {
    id: _arg.id,
    name: 'Order',
  };
};
