import { graphql } from '@/gql';

export const SEND_BUSINESS_MESSAGE = graphql(`
  mutation SendBusinessMessage($businessUserId: ID!, $body: String!, $alertType: MessageAlertType!) {
    sendBusinessMessage(businessUserId: $businessUserId, body: $body, alertType: $alertType) {
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

export const MARK_BUSINESS_MESSAGES_READ = graphql(`
  mutation MarkBusinessMessagesRead($otherUserId: ID!) {
    markBusinessMessagesRead(otherUserId: $otherUserId)
  }
`);
