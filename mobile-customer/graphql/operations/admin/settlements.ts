import { gql } from '@apollo/client';

// ─── Settlements Queries ───

export const ADMIN_GET_SETTLEMENTS = gql`
    query AdminGetSettlements(
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

export const ADMIN_MARK_SETTLEMENT_PAID = gql`
    mutation AdminMarkSettlementAsPaid($settlementId: ID!) {
        markSettlementAsPaid(settlementId: $settlementId) {
            id
            status
            paidAt
        }
    }
`;
