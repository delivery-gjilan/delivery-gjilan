import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface RecenterButtonProps {
  onPress: () => void;
  bottom: number;
  right: number;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export const RecenterButton: React.FC<RecenterButtonProps> = ({
  onPress,
  bottom,
  right,
  onLongPress,
  onPressIn,
  onPressOut,
}) => {
  return (
    <Pressable
      style={[styles.button, { bottom, right }]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      delayLongPress={250}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.icon}>◎</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0d1b2a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(77, 184, 255, 0.3)',
  },
  icon: {
    fontSize: 24,
    color: '#4db8ff',
  },
});
