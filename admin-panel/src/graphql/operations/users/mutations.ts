import { graphql } from '@/gql';

export const CREATE_USER_MUTATION = graphql(`
  mutation CreateUser(
    $email: String!
    $password: String!
    $firstName: String!
    $lastName: String!
    $role: UserRole!
    $businessId: ID
  ) {
    createUser(
      input: {
        email: $email
        password: $password
        firstName: $firstName
        lastName: $lastName
        role: $role
        businessId: $businessId
      }
    ) {
      token
      user {
        id
        email
        firstName
        lastName
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
  ) {
    updateUser(
      input: {
        id: $id
        firstName: $firstName
        lastName: $lastName
        role: $role
        businessId: $businessId
      }
    ) {
      id
      email
      firstName
      lastName
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
  mutation AdminUpdateDriverSettings($driverId: ID!, $commissionPercentage: Float, $maxActiveOrders: Int) {
    adminUpdateDriverSettings(driverId: $driverId, commissionPercentage: $commissionPercentage, maxActiveOrders: $maxActiveOrders) {
      id
      commissionPercentage
      maxActiveOrders
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