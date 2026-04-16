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

export const ADMIN_ANY_BUSINESS_MESSAGE_RECEIVED = graphql(`
  subscription AdminAnyBusinessMessageReceived {
    adminAnyBusinessMessageReceived {
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
