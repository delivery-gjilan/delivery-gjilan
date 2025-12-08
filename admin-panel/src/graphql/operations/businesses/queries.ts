import { gql } from '@apollo/client';

export const GET_BUSINESS = gql`
    query Business($id: ID!) {
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
            createdAt
        }
    }
`;

export const GET_BUSINESSES = gql`
    query Businesses {
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
            createdAt
            updatedAt
        }
    }
`;
