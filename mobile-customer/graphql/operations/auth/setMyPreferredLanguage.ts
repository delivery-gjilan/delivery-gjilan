import { graphql } from '@/gql';

export const SET_MY_PREFERRED_LANGUAGE_MUTATION = graphql(`
    mutation SetMyPreferredLanguage($language: AppLanguage!) {
        setMyPreferredLanguage(language: $language) {
            id
            preferredLanguage
        }
    }
`);