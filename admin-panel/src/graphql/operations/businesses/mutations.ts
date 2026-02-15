import { graphql } from '@/gql';

export const CREATE_BUSINESS = graphql(`
    mutation CreateBusiness($input: CreateBusinessInput!) {
        createBusiness(input: $input) {
            id
            name
            phoneNumber
            businessType
            imageUrl
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
        }
    }
`);

export const UPDATE_BUSINESS = graphql(`
    mutation UpdateBusiness($id: ID!, $input: UpdateBusinessInput!) {
        updateBusiness(id: $id, input: $input) {
            id
            name
            phoneNumber
            businessType
            imageUrl
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
        }
    }
`);

export const DELETE_BUSINESS = graphql(`
    mutation DeleteBusiness($id: ID!) {
        deleteBusiness(id: $id)
    }
`);
