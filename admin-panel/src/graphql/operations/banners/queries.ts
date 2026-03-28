import { gql } from '@apollo/client';

export const GET_BANNERS = gql`
  query GetBanners($activeOnly: Boolean) {
    getBanners(activeOnly: $activeOnly) {
      id
      title
      subtitle
      imageUrl
      linkType
      linkTarget
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const GET_BANNER = gql`
  query GetBanner($id: ID!) {
    getBanner(id: $id) {
      id
      title
      subtitle
      imageUrl
      linkType
      linkTarget
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;
