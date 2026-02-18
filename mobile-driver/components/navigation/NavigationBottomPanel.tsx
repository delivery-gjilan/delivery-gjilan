import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface NavigationBottomPanelProps {
  eta: number | null;
  distance: number | null;
  destination: string;
  onEnd: () => void;
  bottomInset: number;
  etaArrivalText?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionLoading?: boolean;
}

export const NavigationBottomPanel: React.FC<NavigationBottomPanelProps> = ({
  eta,
  distance,
  destination,
  onEnd,
  bottomInset,
  etaArrivalText,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionLoading = false,
}) => {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.headerText}>Heading to {destination}</Text>
        {etaArrivalText ? <Text style={styles.arrivalText}>Arrive {etaArrivalText}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{eta ?? '–'}</Text>
          <Text style={styles.statUnit}>min</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {distance != null ? distance.toFixed(1) : '–'}
          </Text>
          <Text style={styles.statUnit}>km</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {onPrimaryAction && primaryActionLabel ? (
          <Pressable
            style={[styles.primaryActionButton, primaryActionLoading && styles.primaryActionButtonDisabled]}
            onPress={onPrimaryAction}
            disabled={primaryActionLoading}
          >
            <Text style={styles.primaryActionButtonText}>
              {primaryActionLoading ? 'Updating…' : primaryActionLabel}
            </Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.endButton} onPress={onEnd}>
          <Text style={styles.endButtonText}>End Trip</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111317',
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    flex: 1,
  },
  arrivalText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181c22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f3f4f6',
    letterSpacing: -0.6,
  },
  statUnit: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 8,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryActionButtonDisabled: {
    opacity: 0.6,
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  endButton: {
    backgroundColor: '#2b313a',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  endButtonText: {
    color: '#f3f4f6',
    fontWeight: '600',
    fontSize: 14,
  },
});
