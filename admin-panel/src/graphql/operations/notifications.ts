import { gql } from "@apollo/client";

export const GET_NOTIFICATION_CAMPAIGNS = gql`
  query GetNotificationCampaigns {
    notificationCampaigns {
      id
      title
      body
      data
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
