import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import type { FollowMode } from '@/hooks/useNavigationCamera';

interface FloatingMapButtonsProps {
  /** Top offset (safe area) */
  topOffset: number;
  /** Current follow mode */
  followMode: FollowMode;
  /** Lock and zoom to driver */
  onLockAndZoom?: () => void;
  /** Unlock camera */
  onUnlock?: () => void;
  /** For backward compatibility */
  isLocked?: boolean;
  onToggleLock?: () => void;
}

export const FloatingMapButtons: React.FC<FloatingMapButtonsProps> = ({
  topOffset,
  followMode,
  onLockAndZoom,
  onUnlock,
  isLocked = false,
  onToggleLock,
}) => {
  const isLatchedMode = followMode === 'heading-up';

  return (
    <View style={[styles.container, { top: topOffset }]}>
      {/* Lock & Zoom button - when unlocked, tap to lock and zoom to driver */}
      {isLatchedMode ? (
        <Pressable
          style={[styles.btn, styles.btnActive]}
          onPress={onUnlock}
          hitSlop={8}
        >
          <Text style={styles.btnIconActive}>🔒</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.btn}
          onPress={onLockAndZoom}
          hitSlop={8}
        >
          <Text style={styles.btnIcon}>🎯</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    gap: 10,
    zIndex: 15,
  },
  btn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  btnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  btnIcon: {
    fontSize: 22,
    color: '#374151',
  },
  btnIconActive: {
    fontSize: 22,
    color: '#1D4ED8',
  },
});
