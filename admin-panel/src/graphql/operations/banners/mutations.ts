import { graphql } from '@/gql';

export const CREATE_BANNER = graphql(`
  mutation CreateBanner($input: CreateBannerInput!) {
    createBanner(input: $input) {
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
`);

export const UPDATE_BANNER = graphql(`
  mutation UpdateBanner($id: ID!, $input: UpdateBannerInput!) {
    updateBanner(id: $id, input: $input) {
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
`);

export const DELETE_BANNER = graphql(`
  mutation DeleteBanner($id: ID!) {
    deleteBanner(id: $id)
  }
`);

export const UPDATE_BANNER_ORDER = graphql(`
  mutation UpdateBannerOrder($bannerId: ID!, $newSortOrder: Int!) {
    updateBannerOrder(bannerId: $bannerId, newSortOrder: $newSortOrder) {
      id
      sortOrder
      updatedAt
    }
  }
`);
