import { gql } from "@apollo/client";

export const SET_MY_EMAIL_OPT_OUT_MUTATION = gql`
    mutation SetMyEmailOptOut($optOut: Boolean!) {
        setMyEmailOptOut(optOut: $optOut) {
            id
            emailOptOut
        }
    }
`;
