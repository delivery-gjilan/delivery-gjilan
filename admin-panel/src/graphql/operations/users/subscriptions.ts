import { graphql } from '@/gql';

export const DRIVERS_UPDATED_SUBSCRIPTION = graphql(`
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
        activeOrderId
        navigationPhase
        remainingEtaSeconds
        etaUpdatedAt
      }
    }
  }
`);
