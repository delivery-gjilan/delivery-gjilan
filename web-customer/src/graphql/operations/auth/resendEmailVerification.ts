import { gql } from "@apollo/client";

export const RESEND_EMAIL_VERIFICATION_MUTATION = gql`
    mutation ResendEmailVerification {
        resendEmailVerification {
            userId
            currentStep
            message
        }
    }
`;
