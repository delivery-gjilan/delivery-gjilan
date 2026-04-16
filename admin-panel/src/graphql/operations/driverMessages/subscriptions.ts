import { gql } from '@apollo/client';

export const ADMIN_MESSAGE_RECEIVED = gql`
  subscription AdminMessageReceived($driverId: ID!) {
    adminMessageReceived(driverId: $driverId) {
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

export const ADMIN_ANY_MESSAGE_RECEIVED = gql`
  subscription AdminAnyMessageReceived {
    adminAnyMessageReceived {
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
