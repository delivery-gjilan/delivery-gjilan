import { graphql } from '@/gql';
import { gql } from '@apollo/client';

export const CREATE_USER_MUTATION = graphql(`
  mutation CreateUser(
    $email: String!
    $password: String!
    $firstName: String!
    $lastName: String!
    $role: UserRole!
    $businessId: ID
    $isDemoAccount: Boolean
  ) {
    createUser(
      input: {
        email: $email
        password: $password
        firstName: $firstName
        lastName: $lastName
        role: $role
        businessId: $businessId
        isDemoAccount: $isDemoAccount
      }
    ) {
      token
      user {
        id
        email
        firstName
        lastName
        isDemoAccount
        role
        businessId
      }
      message
    }
  }
`);

export const UPDATE_USER_MUTATION = graphql(`
  mutation UpdateUser(
    $id: ID!
    $firstName: String!
    $lastName: String!
    $role: UserRole!
    $businessId: ID
    $isDemoAccount: Boolean
  ) {
    updateUser(
      input: {
        id: $id
        firstName: $firstName
        lastName: $lastName
        role: $role
        businessId: $businessId
        isDemoAccount: $isDemoAccount
      }
    ) {
      id
      email
      firstName
      lastName
      isDemoAccount
      role
      business {
        id
        name
      }
    }
  }
`);

export const DELETE_USER_MUTATION = graphql(`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`);

export const ADMIN_UPDATE_DRIVER_SETTINGS_MUTATION = graphql(`
  mutation AdminUpdateDriverSettings($driverId: ID!, $commissionPercentage: Float, $maxActiveOrders: Int, $hasOwnVehicle: Boolean, $vehicleType: DriverVehicleType, $ownVehicleBonusAmount: Float) {
    adminUpdateDriverSettings(driverId: $driverId, commissionPercentage: $commissionPercentage, maxActiveOrders: $maxActiveOrders, hasOwnVehicle: $hasOwnVehicle, vehicleType: $vehicleType, ownVehicleBonusAmount: $ownVehicleBonusAmount) {
      id
      commissionPercentage
      maxActiveOrders
      hasOwnVehicle
      vehicleType
      ownVehicleBonusAmount
    }
  }
`);

export const ADMIN_BULK_UPDATE_DRIVER_COMMISSIONS_MUTATION = graphql(`
  mutation AdminBulkUpdateDriverCommissions($driverIds: [ID!]!, $commissionPercentage: Float!) {
    adminBulkUpdateDriverCommissions(driverIds: $driverIds, commissionPercentage: $commissionPercentage) {
      id
      firstName
      lastName
      email
      commissionPercentage
    }
  }
`);

export const UPDATE_USER_NOTE_MUTATION = graphql(`
  mutation UpdateUserNote($userId: ID!, $note: String, $flagColor: String) {
    updateUserNote(userId: $userId, note: $note, flagColor: $flagColor) {
      id
      adminNote
      flagColor
    }
  }
`);

export const BAN_USER_MUTATION = graphql(`
  mutation BanUser($userId: ID!, $banned: Boolean!) {
    banUser(userId: $userId, banned: $banned) {
      id
      isBanned
    }
  }
`);

export const ADMIN_UPDATE_DRIVER_LOCATION = graphql(`
  mutation AdminUpdateDriverLocation($driverId: ID!, $latitude: Float!, $longitude: Float!) {
    adminUpdateDriverLocation(driverId: $driverId, latitude: $latitude, longitude: $longitude) {
      id
      driverLocation {
        latitude
        longitude
        address
      }
      driverLocationUpdatedAt
    }
  }
`);

export const ADMIN_SET_SHIFT_DRIVERS = gql`
  mutation AdminSetShiftDrivers($driverIds: [ID!]!) {
    adminSetShiftDrivers(driverIds: $driverIds)
  }
`;

export const UPDATE_DRIVER_ONLINE_STATUS = graphql(`
  mutation UpdateDriverOnlineStatus($isOnline: Boolean!) {
    updateDriverOnlineStatus(isOnline: $isOnline) {
      id
      isOnline
      firstName
      lastName
    }
  }
`);

export const SET_USER_PERMISSIONS = graphql(`
  mutation SetUserPermissions($userId: ID!, $permissions: [UserPermission!]!) {
    setUserPermissions(userId: $userId, permissions: $permissions) {
      id
      permissions
    }
  }
`);

export const ADMIN_SIMULATE_DRIVER_HEARTBEAT = graphql(`
  mutation AdminSimulateDriverHeartbeat(
    $driverId: ID!
    $latitude: Float!
    $longitude: Float!
    $activeOrderId: ID
    $navigationPhase: String
    $remainingEtaSeconds: Int
    $setOnline: Boolean
  ) {
    adminSimulateDriverHeartbeat(
      driverId: $driverId
      latitude: $latitude
      longitude: $longitude
      activeOrderId: $activeOrderId
      navigationPhase: $navigationPhase
      remainingEtaSeconds: $remainingEtaSeconds
      setOnline: $setOnline
    ) {
      success
      connectionStatus
      locationUpdated
      lastHeartbeatAt
    }
  }
`);