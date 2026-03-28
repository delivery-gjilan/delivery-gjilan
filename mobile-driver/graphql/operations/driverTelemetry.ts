import { gql } from '@apollo/client';

export const DRIVER_UPDATE_BATTERY_STATUS = gql`
  mutation DriverUpdateBatteryStatus($level: Int!, $optIn: Boolean!, $isCharging: Boolean) {
    driverUpdateBatteryStatus(level: $level, optIn: $optIn, isCharging: $isCharging) {
      batteryLevel
      batteryOptIn
      batteryUpdatedAt
      isCharging
    }
  }
`;

export const DRIVER_PTT_SIGNAL_SUBSCRIPTION = gql`
  subscription DriverPttSignal($driverId: ID!) {
    driverPttSignal(driverId: $driverId) {
      driverId
      adminId
      channelName
      action
      muted
      timestamp
    }
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
