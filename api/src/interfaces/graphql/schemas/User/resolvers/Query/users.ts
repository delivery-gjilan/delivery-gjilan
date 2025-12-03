import type { QueryResolvers } from './../../../../generated/types.generated';
export const users: NonNullable<QueryResolvers['users']> = async (_parent, _arg, _ctx) => {
  return [
    {
      id: '1',
      name: 'John Doe',
    },
    {
      id: '2',
      name: 'Jane Doe',
    },
  ];
};
