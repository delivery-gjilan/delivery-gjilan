import { graphql } from '@/gql';

export const REQUEST_PASSWORD_RESET_MUTATION = graphql(`
    mutation RequestPasswordReset($email: String!) {
        requestPasswordReset(email: $email)
    }
`);
export const RESET_PASSWORD_MUTATION = graphql(`
    mutation ResetPassword($token: String!, $newPassword: String!) {
        resetPassword(token: $token, newPassword: $newPassword)
    }
`);