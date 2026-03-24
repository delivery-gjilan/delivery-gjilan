import { gql } from '@apollo/client';

export const ADMIN_BUSINESS_MESSAGE_RECEIVED = gql`
  subscription AdminBusinessMessageReceived($businessUserId: ID!) {
    adminBusinessMessageReceived(businessUserId: $businessUserId) {
      id
      adminId
      businessUserId
      senderRole
      body
      alertType
      readAt
      createdAt
    }
  }
`;
