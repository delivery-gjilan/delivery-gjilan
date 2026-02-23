import { gql } from '@apollo/client';

// ─── Store Status ───

export const GET_STORE_STATUS = gql`
    query GetStoreStatus {
        getStoreStatus {
            isStoreClosed
            closedMessage
        }
    }
`;

export const UPDATE_STORE_STATUS = gql`
    mutation UpdateStoreStatus($input: UpdateStoreStatusInput!) {
        updateStoreStatus(input: $input) {
            isStoreClosed
            closedMessage
        }
    }
`;

// ─── Notifications ───

export const GET_NOTIFICATION_CAMPAIGNS = gql`
    query GetNotificationCampaigns {
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

export const SEND_CAMPAIGN = gql`
    mutation SendCampaign($id: ID!) {
        sendCampaign(id: $id) {
            id
            status
            sentCount
            failedCount
            sentAt
        }
    }
`;

export const CREATE_CAMPAIGN = gql`
    mutation CreateCampaign($input: CreateCampaignInput!) {
        createCampaign(input: $input) {
            id
            title
            body
            status
        }
    }
`;

// ─── Settlements ───

export const GET_SETTLEMENTS = gql`
    query GetSettlements(
        $type: SettlementType
        $status: SettlementStatus
        $limit: Int
        $offset: Int
    ) {
        settlements(type: $type, status: $status, limit: $limit, offset: $offset) {
            id
            type
            driver {
                id
                firstName
                lastName
            }
            business {
                id
                name
            }
            amount
            status
            paidAt
            createdAt
        }
    }
`;

export const MARK_SETTLEMENT_PAID = gql`
    mutation MarkSettlementAsPaid($settlementId: ID!) {
        markSettlementAsPaid(settlementId: $settlementId) {
            id
            status
            paidAt
        }
    }
`;
