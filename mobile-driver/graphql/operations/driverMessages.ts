import { graphql } from '@/gql';

export const MY_DRIVER_MESSAGES = graphql(`
    query MyDriverMessages($limit: Int, $offset: Int) {
        myDriverMessages(limit: $limit, offset: $offset) {
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
export const DRIVER_MESSAGE_RECEIVED_SUB = graphql(`
    subscription DriverMessageReceived {
        driverMessageReceived {
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
export const REPLY_TO_DRIVER_MESSAGE = graphql(`
    mutation ReplyToDriverMessage($adminId: ID!, $body: String!) {
        replyToDriverMessage(adminId: $adminId, body: $body) {
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
export const MARK_DRIVER_MESSAGES_READ_DRIVER = graphql(`
    mutation MarkDriverMessagesReadDriver($otherUserId: ID!) {
        markDriverMessagesRead(otherUserId: $otherUserId)
    }
`);