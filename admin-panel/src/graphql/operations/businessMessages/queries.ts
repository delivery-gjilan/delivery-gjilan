import { graphql } from '@/gql';

export const GET_BUSINESS_MESSAGE_THREADS = graphql(`
  query BusinessMessageThreads {
    businessMessageThreads {
      businessUserId
      businessUserName
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

export const GET_BUSINESS_MESSAGES = graphql(`
  query BusinessMessages($businessUserId: ID!, $limit: Int, $offset: Int) {
    businessMessages(businessUserId: $businessUserId, limit: $limit, offset: $offset) {
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
