import { gql } from '@apollo/client';

export const GET_BUSINESSES = gql`
  query GetBusinesses {
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
      isOpen
      createdAt
      updatedAt
    }
  }
`;

export const GET_BUSINESS = gql`
  query GetBusiness($id: ID!) {
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
      isOpen
      createdAt
      updatedAt
    }
  }
`;
