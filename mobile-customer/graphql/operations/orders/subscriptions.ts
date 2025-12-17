import { graphql } from '@/gql';

export const ORDER_STATUS_UPDATED = graphql(`
    subscription OrderStatusUpdated($orderId: ID!) {
        orderStatusUpdated(orderId: $orderId) {
            id
            status
        }
    }
`);
