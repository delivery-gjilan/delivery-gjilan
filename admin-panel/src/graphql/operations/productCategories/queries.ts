import { graphql } from "@/gql";

export const GET_CATEGORIES = graphql(`
    query ProductCategories($businessId: ID!) {
        productCategories(businessId: $businessId) {
            id
            name
            sortOrder
            isActive
        }
    }
`);
