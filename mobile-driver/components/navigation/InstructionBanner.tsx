import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NavigationStep } from '@/utils/mapbox';

interface InstructionBannerProps {
  currentStep: NavigationStep | null;
  nextStep: NavigationStep | null;
  topInset: number;
  onCompassPress?: () => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function getManeuverArrow(type?: string, modifier?: string): string {
  if (type === 'arrive') return '⬤';
  if (type === 'depart') return '↑';
  if (type === 'roundabout' || type === 'rotary') return '↻';
  if (modifier?.includes('uturn')) return '⤸';
  if (modifier?.includes('sharp') && modifier.includes('left')) return '↰';
  if (modifier?.includes('sharp') && modifier.includes('right')) return '↱';
  if (modifier?.includes('slight') && modifier.includes('left')) return '↖';
  if (modifier?.includes('slight') && modifier.includes('right')) return '↗';
  if (modifier?.includes('left')) return '←';
  if (modifier?.includes('right')) return '→';
  if (modifier?.includes('straight')) return '↑';
  return '↑';
}

function getNextStepArrow(type?: string, modifier?: string): string {
  if (type === 'arrive') return '●';
  if (modifier?.includes('uturn')) return '↩';
  if (modifier?.includes('left')) return '↰';
  if (modifier?.includes('right')) return '↱';
  return '↑';
}

export const InstructionBanner: React.FC<InstructionBannerProps> = ({
  currentStep,
  nextStep,
  topInset,
  onCompassPress,
}) => {
  if (!currentStep) return null;

  return (
    <View style={[styles.container, { paddingTop: topInset + 6 }]}>
      {/* Main instruction row */}
      <View style={styles.mainRow}>
        {/* Maneuver arrow */}
        <View style={styles.arrowBox}>
          <Text style={styles.arrowIcon}>
            {getManeuverArrow(currentStep.maneuverType, currentStep.maneuverModifier)}
          </Text>
        </View>

        {/* Distance + instruction */}
        <View style={styles.textBlock}>
          <Text style={styles.distance}>{formatDistance(currentStep.distanceM)}</Text>
          <Text style={styles.instruction} numberOfLines={2}>
            {currentStep.instruction}
          </Text>
        </View>

        {/* Compass button (top-right) */}
        {onCompassPress && (
          <Pressable style={styles.compassBtn} onPress={onCompassPress}>
            <Text style={styles.compassIcon}>◎</Text>
          </Pressable>
        )}
      </View>

      {/* Next step preview */}
      {nextStep && (
        <View style={styles.nextRow}>
          <Text style={styles.nextLabel}>Then</Text>
          <Text style={styles.nextArrow}>
            {getNextStepArrow(nextStep.maneuverType, nextStep.maneuverModifier)}
          </Text>
          <Text style={styles.nextInstruction} numberOfLines={1}>
            {nextStep.instruction}
          </Text>
        </View>
      )}
    </View>
  );
};

const GOOGLE_GREEN = '#1B873B';

const styles = StyleSheet.create({
  container: {
    backgroundColor: GOOGLE_GREEN,
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 20,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 30,
    color: '#ffffff',
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
    marginLeft: 14,
  },
  distance: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  instruction: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
    lineHeight: 22,
  },
  compassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  compassIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  nextLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginRight: 6,
  },
  nextArrow: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    marginRight: 6,
  },
  nextInstruction: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
});
