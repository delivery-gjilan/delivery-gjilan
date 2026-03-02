import { gql } from '@apollo/client';

export const GET_STORE_STATUS = gql`
    query GetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
        }
    }
`;
