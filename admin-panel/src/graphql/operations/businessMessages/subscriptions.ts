import { graphql } from '@/gql';

export const ADMIN_BUSINESS_MESSAGE_RECEIVED = graphql(`
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
`);
