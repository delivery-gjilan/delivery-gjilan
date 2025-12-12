import { graphql } from '@/gql';

export const GET_BUSINESSES = graphql(`
    query GetBusinesses {
        businesses {
            id
            name
            imageUrl
            businessType
            isActive
            location {
                latitude
                longitude
                address
            }
            workingHours {
                opensAt
                closesAt
            }
            isOpen
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
            imageUrl
            businessType
            isActive
            location {
                latitude
                longitude
                address
            }
            workingHours {
                opensAt
                closesAt
            }
            isOpen
            createdAt
            updatedAt
        }
    }
`);
