import { graphql } from '@/gql';

export const REGISTER_DEVICE_TOKEN = graphql(`
    mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {
        registerDeviceToken(input: $input)
    }
`);
export const UNREGISTER_DEVICE_TOKEN = graphql(`
    mutation UnregisterDeviceToken($token: String!) {
        unregisterDeviceToken(token: $token)
    }
`);
export const REGISTER_LIVE_ACTIVITY_TOKEN = graphql(`
    mutation RegisterLiveActivityToken($token: String!, $activityId: String!, $orderId: ID!) {
        registerLiveActivityToken(token: $token, activityId: $activityId, orderId: $orderId)
    }
`);
export const TRACK_PUSH_TELEMETRY = graphql(`
    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {
        trackPushTelemetry(input: $input)
    }
`);