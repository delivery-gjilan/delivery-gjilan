import { gql } from '@apollo/client';

export const GET_STORE_STATUS = gql`
    query GetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
            dispatchModeEnabled
            googleMapsNavEnabled
            inventoryModeEnabled
        }
    }
`;

export const STORE_STATUS_UPDATED = gql`
    subscription StoreStatusUpdated {
        storeStatusUpdated {
            isStoreClosed
            closedMessage
            bannerEnabled
            bannerMessage
            bannerType
            dispatchModeEnabled
            googleMapsNavEnabled
            inventoryModeEnabled
        }
    }
`;
