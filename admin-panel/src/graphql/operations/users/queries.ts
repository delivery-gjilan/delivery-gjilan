import { gql } from '@apollo/client';
import { graphql } from '@/gql';

export const USERS_QUERY = graphql(`
  query Users($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      id
      email
      firstName
      lastName
      role
      phoneNumber
      address
      adminNote
      flagColor
      permissions
      business {
        id
        name
      }
    }
  }
`);

export const DRIVERS_QUERY = gql`
  query Drivers {
    drivers {
      id
      email
      firstName
      lastName
      role
      imageUrl
      phoneNumber
      commissionPercentage
      maxActiveOrders
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
        batteryLevel
        batteryOptIn
        batteryUpdatedAt
        isCharging
        activeOrderId
        navigationPhase
        remainingEtaSeconds
        etaUpdatedAt
      }
    }
  }
`;

export const USER_BEHAVIOR_QUERY = graphql(`
  query UserBehavior($userId: ID!) {
    userBehavior(userId: $userId) {
      userId
      totalOrders
      deliveredOrders
      cancelledOrders
      totalSpend
      avgOrderValue
      firstOrderAt
      lastOrderAt
      lastDeliveredAt
    }
  }
`);
