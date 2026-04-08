import { gql } from '@apollo/client';

export const VERIFY_EMAIL_MUTATION = gql`
    mutation VerifyEmail($input: VerifyEmailInput!) {
        verifyEmail(input: $input) {
            userId
            currentStep
            message
        }
    }
`;
