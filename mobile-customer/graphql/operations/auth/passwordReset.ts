import { gql } from '@apollo/client';

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
    mutation RequestPasswordReset($email: String!) {
        requestPasswordReset(email: $email)
    }
`;

export const RESET_PASSWORD_MUTATION = gql`
    mutation ResetPassword($token: String!, $newPassword: String!) {
        resetPassword(token: $token, newPassword: $newPassword)
    }
`;
