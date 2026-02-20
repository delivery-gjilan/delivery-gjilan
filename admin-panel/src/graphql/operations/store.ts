import { graphql } from '@/gql';

export const GET_STORE_STATUS = graphql(`
    query GetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
        }
    }
`);

export const UPDATE_STORE_STATUS = graphql(`
    mutation UpdateStoreStatus($input: UpdateStoreStatusInput!) {
        updateStoreStatus(input: $input) {
            isStoreClosed
            closedMessage
        }
    }
`);
