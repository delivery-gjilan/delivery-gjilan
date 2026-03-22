import { gql } from '@apollo/client';

// ─── Admin Businesses Queries ───

export const ADMIN_GET_BUSINESSES = gql`
    query AdminGetBusinesses {
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
`;

export const ADMIN_GET_BUSINESS = gql`
    query AdminGetBusiness($id: ID!) {
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
`;
