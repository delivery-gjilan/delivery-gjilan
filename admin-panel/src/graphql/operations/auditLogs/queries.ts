import { gql } from '@apollo/client';

export const GET_AUDIT_LOGS = gql`
    query GetAuditLogs(
        $actorId: ID
        $actorType: ActorType
        $action: ActionType
        $entityType: EntityType
        $entityId: ID
        $startDate: DateTime
        $endDate: DateTime
        $limit: Int
        $offset: Int
    ) {
        auditLogs(
            actorId: $actorId
            actorType: $actorType
            action: $action
            entityType: $entityType
            entityId: $entityId
            startDate: $startDate
            endDate: $endDate
            limit: $limit
            offset: $offset
        ) {
            logs {
                id
                actorId
                actor {
                    id
                    firstName
                    lastName
                    email
                    role
                }
                actorType
                action
                entityType
                entityId
                metadata
                ipAddress
                userAgent
                createdAt
            }
            total
            hasMore
        }
    }
`;

export const GET_AUDIT_LOG = gql`
    query GetAuditLog($id: ID!) {
        auditLog(id: $id) {
            id
            actorId
            actor {
                id
                firstName
                lastName
                email
                role
            }
            actorType
            action
            entityType
            entityId
            metadata
            ipAddress
            userAgent
            createdAt
        }
    }
`;
