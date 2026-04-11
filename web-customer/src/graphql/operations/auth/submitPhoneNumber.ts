import { gql } from "@apollo/client";

export const SUBMIT_PHONE_NUMBER_MUTATION = gql`
    mutation SubmitPhoneNumber($input: SubmitPhoneNumberInput!) {
        submitPhoneNumber(input: $input) {
            userId
            currentStep
            message
        }
    }
`;
