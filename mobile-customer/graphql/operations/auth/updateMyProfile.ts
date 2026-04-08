import { gql } from '@apollo/client';

export const UPDATE_MY_PROFILE_MUTATION = gql`
    mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
        updateMyProfile(input: $input) {
            id
            firstName
            lastName
            phoneNumber
        }
    }
`;
