import { graphql } from '@/gql';

export const SET_MY_EMAIL_OPT_OUT_MUTATION = graphql(`
    mutation SetMyEmailOptOut($optOut: Boolean!) {
        setMyEmailOptOut(optOut: $optOut) {
            id
            emailOptOut
        }
    }
`);
