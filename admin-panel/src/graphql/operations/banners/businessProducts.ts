import { gql } from '@apollo/client';

export const GET_BUSINESSES_LIST = gql`
  query GetBusinessesList {
    businesses {
      id
      name
      businessType
      isActive
    }
  }
`;

export const GET_BUSINESS_PRODUCTS = gql`
  query GetBusinessProducts($businessId: ID!) {
    products(businessId: $businessId) {
      id
      name
    }
  }
`;
