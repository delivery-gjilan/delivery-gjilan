import { gql } from "@apollo/client";

export const USERS_QUERY = gql`
  query Users {
    users {
      id
      email
      firstName
      lastName
      role
      phoneNumber
      address
      adminNote
      flagColor
      business {
        id
        name
      }
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
      driverLocation {
        latitude
        longitude
        address
      }
      driverLocationUpdatedAt
    }
  }
`;
