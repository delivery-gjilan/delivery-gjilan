import { graphql } from '@/gql';

export const VERIFY_EMAIL_MUTATION = graphql(`
    mutation VerifyEmail($input: VerifyEmailInput!) {
        verifyEmail(input: $input) {
            userId
            currentStep
            message
        }
    }
`);