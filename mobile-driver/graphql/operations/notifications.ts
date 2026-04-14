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
export const TRACK_PUSH_TELEMETRY = graphql(`
    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {
        trackPushTelemetry(input: $input)
    }
`);