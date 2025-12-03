import type { UserResolvers } from './../../../generated/types.generated';
export const User: UserResolvers = {
  /* Implement User resolver logic here */
  address: (_parent, _arg, _ctx) => {
    return {
      city: 'Gjilan',
      country: 'Albania',
      street: 'Main Street',
    };
  },
};
