import { graphql } from '@/gql';

export const UPDATE_MY_PROFILE_MUTATION = graphql(`
    mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
        updateMyProfile(input: $input) {
            id
            firstName
            lastName
            phoneNumber
        }
    }
`);