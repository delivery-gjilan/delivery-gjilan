import { gql } from '@apollo/client';

export const ADMIN_SEND_PTT_SIGNAL = gql`
    mutation AdminSendPttSignal(
        $driverIds: [ID!]!
        $channelName: String!
        $action: DriverPttSignalAction!
        $muted: Boolean
    ) {
        adminSendPttSignal(driverIds: $driverIds, channelName: $channelName, action: $action, muted: $muted)
    }
`;

export const ADMIN_SET_SHIFT_DRIVERS = gql`
    mutation AdminSetShiftDrivers($driverIds: [ID!]!) {
        adminSetShiftDrivers(driverIds: $driverIds)
    }
`;

export const GET_AGORA_RTC_CREDENTIALS = gql`
    query GetAgoraRtcCredentials($channelName: String!, $role: AgoraRtcRole!) {
        getAgoraRtcCredentials(channelName: $channelName, role: $role) {
            appId
            channelName
            uid
            token
            expiresAt
        }
    }
`;

export const ADMIN_PTT_SIGNAL_SUBSCRIPTION = gql`
    subscription AdminPttSignal {
        adminPttSignal {
            driverId
            channelName
            action
            timestamp
        }
    }
`;
