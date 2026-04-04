import { gql } from '@apollo/client';

export const GET_ACTIVE_BANNERS = gql`
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
`;
