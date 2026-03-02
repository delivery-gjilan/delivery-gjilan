import { graphql } from '@/gql';

export const DELETE_MY_ACCOUNT_MUTATION = graphql(`
    mutation DeleteMyAccount {
        deleteMyAccount
    }
`);
