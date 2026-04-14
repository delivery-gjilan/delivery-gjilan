import { graphql } from '@/gql';

export const GET_STORE_STATUS = graphql(`
    query GetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
        }
    }
`);
export const STORE_STATUS_UPDATED = graphql(`
    subscription StoreStatusUpdated {
        storeStatusUpdated {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
        }
    }
`);