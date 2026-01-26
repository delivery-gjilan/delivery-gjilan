import { gql } from "@apollo/client";

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser(
    $email: String!
    $password: String!
    $firstName: String!
    $lastName: String!
    $role: UserRole!
    $businessId: ID
  ) {
    createUser(
      input: {
        email: $email
        password: $password
        firstName: $firstName
        lastName: $lastName
        role: $role
        businessId: $businessId
      }
    ) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        businessId
      }
      message
    }
  }
`;
