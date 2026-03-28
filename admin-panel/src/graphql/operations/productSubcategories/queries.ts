import { graphql } from '@/gql';

export const GET_PRODUCT_SUBCATEGORIES_BY_BUSINESS = graphql(`
    query ProductSubcategoriesByBusiness($businessId: ID!) {
        productSubcategoriesByBusiness(businessId: $businessId) {
            id
            categoryId
            name
        }
    }
`);
