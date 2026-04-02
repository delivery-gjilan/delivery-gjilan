import { graphql } from '@/gql';

export const SEND_DRIVER_MESSAGE = graphql(`
  mutation SendDriverMessage($driverId: ID!, $body: String!, $alertType: MessageAlertType!) {
    sendDriverMessage(driverId: $driverId, body: $body, alertType: $alertType) {
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

export const MARK_DRIVER_MESSAGES_READ = graphql(`
  mutation MarkDriverMessagesRead($otherUserId: ID!) {
    markDriverMessagesRead(otherUserId: $otherUserId)
  }
`);
