import { graphql } from '@/gql';

export const MY_BUSINESS_MESSAGES = graphql(`
    query MyBusinessMessages($limit: Int, $offset: Int) {
        myBusinessMessages(limit: $limit, offset: $offset) {
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

export const BUSINESS_MESSAGE_RECEIVED_SUB = graphql(`
    subscription BusinessMessageReceived {
        businessMessageReceived {
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

export const REPLY_TO_BUSINESS_MESSAGE = graphql(`
    mutation ReplyToBusinessMessage($adminId: ID!, $body: String!) {
        replyToBusinessMessage(adminId: $adminId, body: $body) {
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

export const MARK_BUSINESS_MESSAGES_READ_BUSINESS = graphql(`
    mutation MarkBusinessMessagesReadBusiness($otherUserId: ID!) {
        markBusinessMessagesRead(otherUserId: $otherUserId)
    }
`);
