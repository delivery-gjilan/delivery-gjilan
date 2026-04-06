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

export const GET_BUSINESS_PERFORMANCE_STATS = gql`
  query GetBusinessPerformanceStats($days: Int) {
    businessPerformanceStats(days: $days) {
      businessId
      businessName
      imageUrl
      isFeatured
      totalOrders
      totalRevenue
      avgOrderValue
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
