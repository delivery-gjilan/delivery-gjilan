import { gql } from '@apollo/client';

export const GET_BANNERS = gql`
  query GetBanners($filter: GetBannersFilter) {
    getBanners(filter: $filter) {
      id
      title
      subtitle
      imageUrl
      mediaType
      businessId
      business {
        id
        name
      }
      productId
      product {
        id
        name
      }
      promotionId
      promotion {
        id
        name
        code
      }
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

export const GET_BANNER = gql`
  query GetBanner($id: ID!) {
    getBanner(id: $id) {
      id
      title
      subtitle
      imageUrl
      mediaType
      businessId
      business {
        id
        name
      }
      productId
      product {
        id
        name
      }
      promotionId
      promotion {
        id
        name
        code
      }
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

export const GET_ACTIVE_BANNERS = gql`
  query GetActiveBanners($displayContext: BannerDisplayContext) {
    getActiveBanners(displayContext: $displayContext) {
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
      sortOrder
      isActive
    }
  }
`;

