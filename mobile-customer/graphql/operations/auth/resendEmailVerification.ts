import { graphql } from '@/gql';

export const RESEND_EMAIL_VERIFICATION_MUTATION = graphql(`
    mutation ResendEmailVerification {
        resendEmailVerification {
            userId
            currentStep
            message
        }
    }
`);
