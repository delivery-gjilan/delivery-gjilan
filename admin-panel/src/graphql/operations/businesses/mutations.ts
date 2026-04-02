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
            schedule {
                id
                dayOfWeek
                opensAt
                closesAt
            }
        }
    }
`);

export const CREATE_BUSINESS_WITH_OWNER = graphql(`
    mutation CreateBusinessWithOwner($input: CreateBusinessWithOwnerInput!) {
        createBusinessWithOwner(input: $input) {
            business {
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
                schedule {
                    id
                    dayOfWeek
                    opensAt
                    closesAt
                }
            }
            owner {
                id
                email
                firstName
                lastName
                isDemoAccount
                role
                businessId
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
            schedule {
                id
                dayOfWeek
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
