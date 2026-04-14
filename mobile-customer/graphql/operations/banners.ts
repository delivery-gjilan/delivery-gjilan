import { graphql } from '@/gql';

export const GET_ACTIVE_BANNERS = graphql(`
    query GetActiveBanners($displayContext: BannerDisplayContext) {
        getActiveBanners(displayContext: $displayContext) {
            id
            title
            subtitle
            imageUrl
            mediaType
            linkType
            linkTarget
            sortOrder
            isActive
        }
    }
`);