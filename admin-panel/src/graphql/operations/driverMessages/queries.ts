import { graphql } from '@/gql';

export const GET_DRIVER_MESSAGE_THREADS = graphql(`
  query DriverMessageThreads {
    driverMessageThreads {
      driverId
      driverName
      unreadCount
      lastMessage {
        id
        body
        senderRole
        alertType
        createdAt
      }
    }
  }
`);

export const GET_DRIVER_MESSAGES = graphql(`
  query DriverMessages($driverId: ID!, $limit: Int, $offset: Int) {
    driverMessages(driverId: $driverId, limit: $limit, offset: $offset) {
      id
      adminId
      driverId
      senderRole
      body
      alertType
      readAt
      createdAt
    }
  }
`);
