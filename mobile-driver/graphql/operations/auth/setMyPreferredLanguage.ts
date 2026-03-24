import { gql } from '@apollo/client';

export const SET_MY_PREFERRED_LANGUAGE_MUTATION = gql`
    mutation SetMyPreferredLanguage($language: AppLanguage!) {
        setMyPreferredLanguage(language: $language) {
            id
            preferredLanguage
        }
    }
`;