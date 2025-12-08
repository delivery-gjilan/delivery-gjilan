import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts($businessId: ID!) {
    products(businessId: $businessId) {
      id
      businessId
      categoryId
      name
      description
      imageUrl
      price
      isOnSale
      salePrice
      isAvailable
      createdAt
      updatedAt
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      businessId
      categoryId
      name
      description
      imageUrl
      price
      isOnSale
      salePrice
      isAvailable
      createdAt
      updatedAt
    }
  }
`;
