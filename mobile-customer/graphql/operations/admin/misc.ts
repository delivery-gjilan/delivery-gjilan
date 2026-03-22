import { gql } from '@apollo/client';

// ─── Store Status ───

export const ADMIN_GET_STORE_STATUS = gql`
    query AdminGetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
        }
    }
`;

export const ADMIN_UPDATE_STORE_STATUS = gql`
    mutation AdminUpdateStoreStatus($input: UpdateStoreStatusInput!) {
        updateStoreStatus(input: $input) {
            isStoreClosed
            closedMessage
        }
    }
`;

// ─── Notification Campaigns ───

export const ADMIN_GET_NOTIFICATION_CAMPAIGNS = gql`
    query AdminGetNotificationCampaigns {
        notificationCampaigns {
            id
            title
            body
            targetCount
            sentCount
            failedCount
            status
            createdAt
            sentAt
        }
    }
`;

export const ADMIN_SEND_CAMPAIGN = gql`
    mutation AdminSendCampaign($id: ID!) {
        sendCampaign(id: $id) {
            id
            status
            sentCount
            failedCount
            sentAt
        }
    }
`;

export const ADMIN_CREATE_CAMPAIGN = gql`
    mutation AdminCreateCampaign($input: CreateCampaignInput!) {
        createCampaign(input: $input) {
            id
            title
            body
            status
        }
    }
`;
