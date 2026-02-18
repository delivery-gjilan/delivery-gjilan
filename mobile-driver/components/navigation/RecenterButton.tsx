import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';

interface RecenterButtonProps {
  onPress: () => void;
  bottom: number;
  right?: number;
  left?: number;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** Whether camera is currently following the driver */
  isFollowing?: boolean;
}

export const RecenterButton: React.FC<RecenterButtonProps> = ({
  onPress,
  bottom,
  right,
  left,
  onLongPress,
  onPressIn,
  onPressOut,
  isFollowing = false,
}) => {
  return (
    <Pressable
      style={[
        styles.button,
        { bottom },
        right != null && { right },
        left != null && { left },
        isFollowing && styles.buttonActive,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      delayLongPress={250}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {/* Navigation arrow icon */}
      <View style={[styles.arrowContainer, isFollowing && styles.arrowContainerActive]}>
        <View style={styles.arrowShape} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonActive: {
    backgroundColor: '#DBEAFE',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowContainerActive: {
    transform: [{ rotate: '0deg' }],
  },
  arrowShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4285F4',
    transform: [{ rotate: '0deg' }],
  },
});
