import { graphql } from '@/gql';

export const GET_SETTLEMENT_RULES = graphql(`
    query SettlementRules($filter: SettlementRuleFilterInput) {
        settlementRules(filter: $filter) {
            id
            name
            entityType
            type
            direction
            amountType
            amount
            appliesTo
            business {
                id
                name
            }
            promotion {
                id
                name
            }
            isActive
            notes
            updatedAt
        }
    }
`);

export const CREATE_SETTLEMENT_RULE = graphql(`
    mutation CreateSettlementRule($input: CreateSettlementRuleInput!) {
        createSettlementRule(input: $input) {
            id
            name
        }
    }
`);

export const UPDATE_SETTLEMENT_RULE = graphql(`
    mutation UpdateSettlementRule($id: ID!, $input: UpdateSettlementRuleInput!) {
        updateSettlementRule(id: $id, input: $input) {
            id
            isActive
        }
    }
`);

export const DELETE_SETTLEMENT_RULE = graphql(`
    mutation DeleteSettlementRule($id: ID!) {
        deleteSettlementRule(id: $id)
    }
`);

export const GET_BUSINESSES_SELECTION = graphql(`
    query BusinessesSelection {
        businesses {
            id
            name
        }
    }
`);

export const GET_PROMOTIONS_SELECTION = graphql(`
    query PromotionsSelection {
        getAllPromotions(isActive: true) {
            id
            name
            code
        }
    }
`);
