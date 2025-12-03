import type { QueryResolvers } from './../../../../generated/types.generated';
export const hello: NonNullable<QueryResolvers['hello']> = async (_parent, _arg, _ctx) => {
  return 'Hello World';
};
