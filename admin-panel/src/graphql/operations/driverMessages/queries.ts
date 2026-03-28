import { gql } from '@apollo/client';

export const GET_DRIVER_MESSAGE_THREADS = gql`
  query GetDriverMessageThreads {
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
`;

export const GET_DRIVER_MESSAGES = gql`
  query GetDriverMessages($driverId: ID!, $limit: Int, $offset: Int) {
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
`;
