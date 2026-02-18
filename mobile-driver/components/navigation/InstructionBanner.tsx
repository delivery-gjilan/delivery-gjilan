import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationStep } from '@/utils/mapbox';

interface InstructionBannerProps {
  currentStep: NavigationStep | null;
  nextStep: NavigationStep | null;
  topInset: number;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function getManeuverIcon(type?: string, modifier?: string): string {
  if (type === 'arrive') return '🏁';
  if (type === 'depart') return '🚗';
  if (type === 'roundabout' || type === 'rotary') return '🔄';
  if (modifier?.includes('uturn')) return '↩️';
  if (modifier?.includes('sharp') && modifier.includes('left')) return '↰';
  if (modifier?.includes('sharp') && modifier.includes('right')) return '↱';
  if (modifier?.includes('left')) return '⬅';
  if (modifier?.includes('right')) return '➡';
  if (modifier?.includes('straight')) return '⬆';
  return '⬆';
}

export const InstructionBanner: React.FC<InstructionBannerProps> = ({
  currentStep,
  nextStep,
  topInset,
}) => {
  if (!currentStep) return null;

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }]}>
      <View style={styles.mainRow}>
        <Text style={styles.icon}>
          {getManeuverIcon(currentStep.maneuverType, currentStep.maneuverModifier)}
        </Text>
        <View style={styles.textContainer}>
          <Text style={styles.distance}>{formatDistance(currentStep.distanceM)}</Text>
          <Text style={styles.instruction} numberOfLines={2}>
            {currentStep.instruction}
          </Text>
        </View>
      </View>

      {nextStep && (
        <View style={styles.nextStepRow}>
          <Text style={styles.nextText}>
            Then {getManeuverIcon(nextStep.maneuverType, nextStep.maneuverModifier)}{' '}
            {nextStep.instruction}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 20,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    width: 56,
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  distance: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4db8ff',
    letterSpacing: -0.5,
  },
  instruction: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 2,
    lineHeight: 20,
  },
  nextStepRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  nextText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
});
