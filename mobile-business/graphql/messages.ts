import { gql } from '@apollo/client';

export const MY_BUSINESS_MESSAGES = gql`
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
`;

export const BUSINESS_MESSAGE_RECEIVED_SUB = gql`
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
`;

export const REPLY_TO_BUSINESS_MESSAGE = gql`
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
`;

export const MARK_BUSINESS_MESSAGES_READ_BUSINESS = gql`
    mutation MarkBusinessMessagesReadBusiness($otherUserId: ID!) {
        markBusinessMessagesRead(otherUserId: $otherUserId)
    }
`;
