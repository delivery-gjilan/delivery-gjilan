import { graphql } from "@/gql";

export const GET_BUSINESSES = graphql(`
    query GetBusinesses {
        businesses {
            id
            name
            imageUrl
            businessType
            isActive
            createdAt
            updatedAt
        }
    }
`);
