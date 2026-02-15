import { graphql } from '@/gql';

export const USERS_QUERY = graphql(`
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
`);

export const DRIVERS_QUERY = graphql(`
  query Drivers {
    drivers {
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
`);
