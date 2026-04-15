import { gql } from '@apollo/client';
import { graphql } from '@/gql';

export const GET_STORE_STATUS = graphql(`
    query GetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
            directDispatchEnabled
        }
    }
`);

export const STORE_STATUS_UPDATED = gql`
    subscription StoreStatusUpdated {
        storeStatusUpdated {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
            directDispatchEnabled
        }
    }
`;
