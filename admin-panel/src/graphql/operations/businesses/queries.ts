import { graphql } from '@/gql';

export const GET_BUSINESS = graphql(`
    query Business($id: ID!) {
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
            createdAt
        }
    }
`);

export const GET_BUSINESSES = graphql(`
    query Businesses {
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
            createdAt
            updatedAt
        }
    }
`);
