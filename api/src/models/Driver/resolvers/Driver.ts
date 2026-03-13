/**
 * Driver resolver handles the Driver GraphQL type
 * Drivers are completely separate from Users
 */
export const Driver: any = {
  id: (parent) => parent.id,
  email: (parent) => parent.email,
  firstName: (parent) => parent.firstName,
  lastName: (parent) => parent.lastName,
  phoneNumber: (parent) => parent.phoneNumber || null,
  onlinePreference: (parent) => parent.onlinePreference,
  connectionStatus: (parent) => parent.connectionStatus,
  lastHeartbeatAt: (parent) => 
    parent.lastHeartbeatAt instanceof Date 
      ? parent.lastHeartbeatAt 
      : parent.lastHeartbeatAt ? new Date(parent.lastHeartbeatAt) : null,
  lastLocationUpdate: (parent) =>
    parent.lastLocationUpdate instanceof Date
      ? parent.lastLocationUpdate
      : parent.lastLocationUpdate ? new Date(parent.lastLocationUpdate) : null,
  driverLat: (parent) => parent.driverLat || null,
  driverLng: (parent) => parent.driverLng || null,
};
