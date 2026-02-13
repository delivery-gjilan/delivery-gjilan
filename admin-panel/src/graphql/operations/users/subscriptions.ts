import { gql } from "@apollo/client";

export const DRIVERS_UPDATED_SUBSCRIPTION = gql`
  subscription DriversUpdated {
    driversUpdated {
      id
      email
      firstName
      lastName
      role
      imageUrl
      phoneNumber
      driverLocation {
        latitude
        longitude
        address
      }
      driverLocationUpdatedAt
      driverConnection {
        onlinePreference
        connectionStatus
        lastHeartbeatAt
        lastLocationUpdate
        disconnectedAt
      }
    }
  }
`;
