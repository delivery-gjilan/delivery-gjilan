import { graphql } from '@/gql';

// ─── Businesses Queries ───

export const GET_BUSINESSES = graphql(`
    query GetBusinesses {
        businesses {
            id
            name
            phoneNumber
            imageUrl
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            location {
                latitude
                longitude
                address
            }
            workingHours {
                opensAt
                closesAt
            }
            schedule {
                id
                dayOfWeek
                opensAt
                closesAt
            }
            createdAt
            updatedAt
        }
    }
`);

export const GET_BUSINESS = graphql(`
    query GetBusiness($id: ID!) {
        business(id: $id) {
            id
            name
            phoneNumber
            imageUrl
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
            location {
                latitude
                longitude
                address
            }
            workingHours {
                opensAt
                closesAt
            }
            schedule {
                id
                dayOfWeek
                opensAt
                closesAt
            }
            createdAt
        }
    }
`);

// ─── Businesses Mutations ───

export const CREATE_BUSINESS = graphql(`
    mutation CreateBusiness($input: CreateBusinessInput!) {
        createBusiness(input: $input) {
            id
            name
            businessType
            isActive
        }
    }
`);

export const UPDATE_BUSINESS = graphql(`
    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {
        updateBusiness(id: $id, input: $input) {
            id
            name
            businessType
            isActive
            avgPrepTimeMinutes
            prepTimeOverrideMinutes
        }
    }
`);

export const DELETE_BUSINESS = graphql(`
    mutation DeleteBusiness($id: ID!) {
        deleteBusiness(id: $id)
    }
`);
