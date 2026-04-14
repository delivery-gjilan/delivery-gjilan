/**
 * Avatar utility functions with error handling
 * Designed to be safe and not break driver rendering
 */

export const getInitials = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return '?';
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return `${f}${l}`.trim() || '?';
};

// Color palette for avatars based on driver ID hash
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-indigo-500',
];

export const getAvatarColor = (id: string): string => {
  if (!id) return AVATAR_COLORS[0];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

type AvatarSubject = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined;

/**
 * Get safe driver name with fallback
 */
export const getDriverName = (driver: AvatarSubject): string => {
  try {
    if (!driver) return 'Unknown';
    const first = driver.firstName?.trim() || '';
    const last = driver.lastName?.trim() || '';
    return `${first} ${last}`.trim() || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

/**
 * Safely get avatar data - returns null if anything fails
 * This ensures drivers still show on map if avatar rendering has any issue
 */
export const getAvatarData = (driver: AvatarSubject) => {
  try {
    // Verify driver has basic data
    if (!driver?.id) return null;

    const initials = getInitials(driver.firstName, driver.lastName);
    const color = getAvatarColor(driver.id);
    const name = getDriverName(driver);

    return { initials, color, name };
  } catch (error) {
    // Silently fail and return null - drivers will still show as dots
    console.error('Avatar data error:', error);
    return null;
  }
};

