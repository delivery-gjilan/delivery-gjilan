import { gql } from '@apollo/client';

export const REGISTER_DEVICE_TOKEN = gql`
    mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {
        registerDeviceToken(input: $input)
    }
`;

export const UNREGISTER_DEVICE_TOKEN = gql`
    mutation UnregisterDeviceToken($token: String!) {
        unregisterDeviceToken(token: $token)
    }
`;

export const TRACK_PUSH_TELEMETRY = gql`
    mutation TrackPushTelemetry($input: TrackPushTelemetryInput!) {
        trackPushTelemetry(input: $input)
    }
`;
