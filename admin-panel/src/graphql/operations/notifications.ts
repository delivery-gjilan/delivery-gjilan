import { gql } from "@apollo/client";

export const GET_NOTIFICATION_CAMPAIGNS = gql`
  query GetNotificationCampaigns {
    notificationCampaigns {
      id
      title
      body
      data
      imageUrl
      timeSensitive
      category
      relevanceScore
      query
      targetCount
      sentCount
      failedCount
      status
      sentBy
      createdAt
      sentAt
    }
  }
`;

export const GET_NOTIFICATION_CAMPAIGN = gql`
  query GetNotificationCampaign($id: ID!) {
    notificationCampaign(id: $id) {
      id
      title
      body
      data
      imageUrl
      timeSensitive
      category
      relevanceScore
      query
      targetCount
      sentCount
      failedCount
      status
      sentBy
      createdAt
      sentAt
    }
  }
`;

export const PREVIEW_CAMPAIGN_AUDIENCE = gql`
  query PreviewCampaignAudience($query: JSON!) {
    previewCampaignAudience(query: $query) {
      count
      sampleUsers {
        id
        firstName
        lastName
        email
        role
      }
    }
  }
`;

export const CREATE_CAMPAIGN = gql`
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      id
      title
      body
      imageUrl
      timeSensitive
      category
      relevanceScore
      status
      createdAt
    }
  }
`;

export const SEND_CAMPAIGN = gql`
  mutation SendCampaign($id: ID!) {
    sendCampaign(id: $id) {
      id
      title
      status
      targetCount
      sentCount
      failedCount
      sentAt
    }
  }
`;

export const SEND_PUSH_NOTIFICATION = gql`
  mutation SendPushNotification($input: SendPushNotificationInput!) {
    sendPushNotification(input: $input) {
      success
      successCount
      failureCount
    }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($id: ID!) {
    deleteCampaign(id: $id)
  }
`;

// New: Assign promotion to users
export const ASSIGN_PROMOTION_TO_USERS = gql`
  mutation AssignPromotionToUsers($input: AssignPromotionToUserInput!) {
    assignPromotionToUsers(input: $input) {
      id
      userId
      promotionId
      assignedAt
    }
  }
`;

export const GET_PUSH_TELEMETRY_SUMMARY = gql`
  query GetPushTelemetrySummary($hours: Int) {
    pushTelemetrySummary(hours: $hours) {
      totalEvents
      byEvent {
        key
        count
      }
      byAppType {
        key
        count
      }
      byPlatform {
        key
        count
      }
    }
  }
`;

export const GET_PUSH_TELEMETRY_EVENTS = gql`
  query GetPushTelemetryEvents(
    $hours: Int
    $limit: Int
    $appType: DeviceAppType
    $platform: DevicePlatform
    $eventType: PushTelemetryEventType
  ) {
    pushTelemetryEvents(
      hours: $hours
      limit: $limit
      appType: $appType
      platform: $platform
      eventType: $eventType
    ) {
      id
      userId
      appType
      platform
      eventType
      deviceId
      notificationTitle
      notificationBody
      campaignId
      orderId
      actionId
      metadata
      createdAt
    }
  }
`;

export const GET_BUSINESS_DEVICE_HEALTH = gql`
  query GetBusinessDeviceHealth($hours: Int) {
    businessDeviceHealth(hours: $hours) {
      id
      userId
      businessId
      deviceId
      platform
      appVersion
      appState
      networkType
      batteryLevel
      isCharging
      subscriptionAlive
      lastHeartbeatAt
      lastOrderSignalAt
      lastPushReceivedAt
      lastOrderId
      metadata
      createdAt
      updatedAt
      onlineStatus
      receivingOrders
    }
  }
`;
