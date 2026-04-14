import { graphql } from '@/gql';

export const SUBMIT_PHONE_NUMBER_MUTATION = graphql(`
    mutation SubmitPhoneNumber($input: SubmitPhoneNumberInput!) {
        submitPhoneNumber(input: $input) {
            userId
            currentStep
            message
        }
    }
`);