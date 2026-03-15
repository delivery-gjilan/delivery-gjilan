import { graphql } from '@/gql';

export const BUSINESS_DEVICE_HEARTBEAT = graphql(`
  mutation BusinessDeviceHeartbeat($input: BusinessDeviceHeartbeatInput!) {
    businessDeviceHeartbeat(input: $input)
  }
`);

export const BUSINESS_DEVICE_ORDER_SIGNAL = graphql(`
  mutation BusinessDeviceOrderSignal($deviceId: String!, $orderId: ID) {
    businessDeviceOrderSignal(deviceId: $deviceId, orderId: $orderId)
  }
`);
