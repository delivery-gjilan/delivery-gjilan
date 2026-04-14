import { graphql } from '@/gql';

export const GET_BUSINESS_SCHEDULE = graphql(`
    query GetBusinessSchedule($businessId: ID!) {
        business(id: $businessId) {
            id
            schedule {
                id
                dayOfWeek
                opensAt
                closesAt
            }
        }
    }
`);

export const SET_BUSINESS_SCHEDULE = graphql(`
    mutation SetBusinessSchedule($businessId: ID!, $schedule: [BusinessDayHoursInput!]!) {
        setBusinessSchedule(businessId: $businessId, schedule: $schedule) {
            id
            dayOfWeek
            opensAt
            closesAt
        }
    }
`);

export const GET_BUSINESS_OPERATIONS = graphql(`
    query GetBusinessOperations($id: ID!) {
        business(id: $id) {
            id
            avgPrepTimeMinutes
            isTemporarilyClosed
            temporaryClosureReason
            isOpen
        }
    }
`);

export const UPDATE_BUSINESS_OPERATIONS = graphql(`
    mutation UpdateBusinessOperations($id: ID!, $input: UpdateBusinessInput!) {
        updateBusiness(id: $id, input: $input) {
            id
            avgPrepTimeMinutes
            isTemporarilyClosed
            temporaryClosureReason
            isOpen
        }
    }
`);
