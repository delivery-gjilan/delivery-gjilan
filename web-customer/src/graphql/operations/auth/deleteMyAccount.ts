import { gql } from "@apollo/client";

export const DELETE_MY_ACCOUNT_MUTATION = gql`
    mutation DeleteMyAccount {
        deleteMyAccount
    }
`;
