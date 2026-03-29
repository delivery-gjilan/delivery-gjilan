import { graphql } from '@/gql';

export const GET_BANNERS = graphql(`
  query Banners($activeOnly: Boolean) {
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
`);

export const GET_BANNER = graphql(`
  query Banner($id: ID!) {
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
`);
