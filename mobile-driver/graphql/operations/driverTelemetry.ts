import { graphql } from '@/gql';

export const DRIVER_UPDATE_BATTERY_STATUS = graphql(`
  mutation DriverUpdateBatteryStatus($level: Int!, $optIn: Boolean!, $isCharging: Boolean) {
    driverUpdateBatteryStatus(level: $level, optIn: $optIn, isCharging: $isCharging) {
      batteryLevel
      batteryOptIn
      batteryUpdatedAt
      isCharging
    }
  }
`);
export const DRIVER_PTT_SIGNAL_SUBSCRIPTION = graphql(`
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
`);
export const GET_AGORA_RTC_CREDENTIALS = graphql(`
  query GetAgoraRtcCredentials($channelName: String!, $role: AgoraRtcRole!) {
    getAgoraRtcCredentials(channelName: $channelName, role: $role) {
      appId
      channelName
      uid
      token
      expiresAt
    }
  }
`);
export const DRIVER_SEND_PTT_SIGNAL = graphql(`
  mutation DriverSendPttSignal($channelName: String!, $action: DriverPttSignalAction!) {
    driverSendPttSignal(channelName: $channelName, action: $action)
  }
`);