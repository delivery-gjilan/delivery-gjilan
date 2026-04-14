import { graphql } from '@/gql';

// ─── Store Status ───

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

export const SET_MY_PREFERRED_LANGUAGE = graphql(`
    mutation SetMyPreferredLanguage($language: AppLanguage!) {
        setMyPreferredLanguage(language: $language) {
            id
            preferredLanguage
        }
    }
`);

// ─── Notifications ───

export const GET_NOTIFICATION_CAMPAIGNS = graphql(`
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
`);

export const SEND_CAMPAIGN = graphql(`
    mutation SendCampaign($id: ID!) {
        sendCampaign(id: $id) {
            id
            status
            sentCount
            failedCount
            sentAt
        }
    }
`);

export const CREATE_CAMPAIGN = graphql(`
    mutation CreateCampaign($input: CreateCampaignInput!) {
        createCampaign(input: $input) {
            id
            title
            body
            status
        }
    }
`);

// ─── Settlements ───

export const GET_SETTLEMENTS = graphql(`
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
`);

export const MARK_SETTLEMENT_PAID = graphql(`
    mutation MarkSettlementAsPaid($settlementId: ID!) {
        markSettlementAsPaid(settlementId: $settlementId) {
            id
            status
            paidAt
        }
    }
`);
