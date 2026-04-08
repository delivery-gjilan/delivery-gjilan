import { gql } from '@apollo/client';

export const VERIFY_PHONE_MUTATION = gql`
    mutation VerifyPhone($input: VerifyPhoneInput!) {
        verifyPhone(input: $input) {
            userId
            currentStep
            message
        }
    }
`;
