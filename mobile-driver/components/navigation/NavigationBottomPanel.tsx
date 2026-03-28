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
  primaryActionDisabled?: boolean;
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
  primaryActionDisabled = false,
}) => {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 14) }]}>
      {/* ETA row */}
      <View style={styles.etaRow}>
        <View style={styles.etaLeft}>
          <Text style={styles.etaValue}>{eta ?? '–'}</Text>
          <Text style={styles.etaUnit}> min</Text>
          <View style={styles.etaDot} />
          <Text style={styles.etaDetail}>
            {distance != null ? `${distance.toFixed(1)} km` : '–'}
          </Text>
        </View>
        {etaArrivalText ? (
          <Text style={styles.arrivalTime}>{etaArrivalText}</Text>
        ) : null}
      </View>

      {/* Destination label */}
      <Text style={styles.destLabel} numberOfLines={1}>
        {destination}
      </Text>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {onPrimaryAction && primaryActionLabel ? (
          <Pressable
            style={[
              styles.primaryBtn,
              (primaryActionLoading || primaryActionDisabled) && styles.primaryBtnDisabled,
            ]}
            onPress={onPrimaryAction}
            disabled={primaryActionLoading || primaryActionDisabled}
          >
            <Text style={styles.primaryBtnText}>
              {primaryActionLoading ? 'Updating…' : primaryActionLabel}
            </Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.endBtn} onPress={onEnd}>
          <Text style={styles.endBtnIcon}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },

  /* ETA row */
  etaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  etaLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  etaValue: {
    fontSize: 38,
    fontWeight: '700',
    color: '#1B873B',
    letterSpacing: -1,
  },
  etaUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B873B',
  },
  etaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 10,
    marginBottom: 4,
  },
  etaDetail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  arrivalTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  /* Destination label */
  destLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 14,
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#1B873B',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  endBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnIcon: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '700',
  },
});
