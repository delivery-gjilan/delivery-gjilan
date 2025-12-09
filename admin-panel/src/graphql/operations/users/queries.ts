import { gql } from "@apollo/client";

export const USERS_QUERY = gql`
  query Users {
    users {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

export const DRIVERS_QUERY = gql`
  query Drivers {
    drivers {
      id
      email
      firstName
      lastName
      role
    }
  }
`;
