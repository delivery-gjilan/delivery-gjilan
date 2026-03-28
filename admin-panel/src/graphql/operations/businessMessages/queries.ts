import { gql } from '@apollo/client';

export const GET_BUSINESS_MESSAGE_THREADS = gql`
  query GetBusinessMessageThreads {
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
`;

export const GET_BUSINESS_MESSAGES = gql`
  query GetBusinessMessages($businessUserId: ID!, $limit: Int, $offset: Int) {
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
`;
