import { graphql } from '@/gql';

export const VERIFY_PHONE_MUTATION = graphql(`
    mutation VerifyPhone($input: VerifyPhoneInput!) {
        verifyPhone(input: $input) {
            userId
            currentStep
            message
        }
    }
`);