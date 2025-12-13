import { gql } from '@apollo/client';

export const GET_PRODUCT_CATEGORIES = gql`
  query GetProductCategories($businessId: ID!) {
    productCategories(businessId: $businessId) {
      id
      businessId
      name
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_PRODUCT_CATEGORY = gql`
  query GetProductCategory($id: ID!) {
    productCategory(id: $id) {
      id
      businessId
      name
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_PRODUCT_SUBCATEGORIES = gql`
  query GetProductSubcategories($categoryId: ID!) {
    productSubcategories(categoryId: $categoryId) {
      id
      categoryId
      name
      createdAt
      updatedAt
    }
  }
`;

export const GET_PRODUCT_SUBCATEGORY = gql`
  query GetProductSubcategory($id: ID!) {
    productSubcategory(id: $id) {
      id
      categoryId
      name
      createdAt
      updatedAt
    }
  }
`;
