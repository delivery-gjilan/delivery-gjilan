import { gql } from '@apollo/client';

export const CREATE_BANNER = gql`
  mutation CreateBanner($input: CreateBannerInput!) {
    createBanner(input: $input) {
      id
      title
      subtitle
      imageUrl
      mediaType
      businessId
      productId
      promotionId
      linkType
      linkTarget
      displayContext
      startsAt
      endsAt
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_BANNER = gql`
  mutation UpdateBanner($id: ID!, $input: UpdateBannerInput!) {
    updateBanner(id: $id, input: $input) {
      id
      title
      subtitle
      imageUrl
      mediaType
      businessId
      productId
      promotionId
      linkType
      linkTarget
      displayContext
      startsAt
      endsAt
      sortOrder
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_BANNER = gql`
  mutation DeleteBanner($id: ID!) {
    deleteBanner(id: $id)
  }
`;

export const UPDATE_BANNER_ORDER = gql`
  mutation UpdateBannerOrder($bannerId: ID!, $newSortOrder: Int!) {
    updateBannerOrder(bannerId: $bannerId, newSortOrder: $newSortOrder) {
      id
      sortOrder
      updatedAt
    }
  }
`;

