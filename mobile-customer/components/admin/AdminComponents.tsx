import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    ScrollView,
    Dimensions,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_ORDER_STATUS_COLORS, ADMIN_ORDER_STATUS_LABELS } from '@/utils/adminHelpers';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── AdminStatusBadge ─────────────────────────────────────────────────────────
interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
    label?: string;
}

export function AdminStatusBadge({ status, size = 'sm', label }: StatusBadgeProps) {
    const color = ADMIN_ORDER_STATUS_COLORS[status] ?? '#6b7280';
    const displayLabel = label ?? ADMIN_ORDER_STATUS_LABELS[status] ?? status;

    return (
        <View
            style={[
                styles.statusBadge,
                size === 'md' && styles.statusBadgeMd,
                { backgroundColor: `${color}18` },
            ]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, size === 'md' && styles.statusTextMd, { color }]}>
                {displayLabel}
            </Text>
        </View>
    );
}

// ─── AdminFilterChip ──────────────────────────────────────────────────────────
interface FilterChipProps {
    label: string;
    count?: number;
    active: boolean;
    color?: string;
    onPress: () => void;
}

export function AdminFilterChip({ label, count, active, color, onPress }: FilterChipProps) {
    const theme = useTheme();
    const chipColor = color ?? theme.colors.primary;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.filterChip,
                {
                    backgroundColor: active ? `${chipColor}18` : theme.colors.card,
                    borderColor: active ? chipColor : theme.colors.border,
                    borderWidth: active ? 1.5 : 1,
                },
            ]}>
            <Text
                style={[
                    styles.filterChipText,
                    { color: active ? chipColor : theme.colors.subtext },
                ]}>
                {label}
            </Text>
            {count !== undefined && (
                <View
                    style={[
                        styles.filterChipBadge,
                        { backgroundColor: active ? chipColor : theme.colors.border },
                    ]}>
                    <Text style={[styles.filterChipBadgeText, { color: active ? '#fff' : theme.colors.subtext }]}>
                        {count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── AdminStatCard ────────────────────────────────────────────────────────────
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

export function AdminStatCard({ title, value, icon, color }: StatCardProps) {
    const theme = useTheme();
    return (
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, flex: 1 }]}>
            <View style={[styles.statCardIcon, { backgroundColor: `${color}15` }]}>{icon}</View>
            <Text style={[styles.statCardValue, { color: theme.colors.text }]} numberOfLines={1}>
                {value}
            </Text>
            <Text style={[styles.statCardTitle, { color: theme.colors.subtext }]} numberOfLines={1}>
                {title}
            </Text>
        </View>
    );
}

// ─── AdminBottomSheet ─────────────────────────────────────────────────────────
interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function AdminBottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
    const theme = useTheme();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 20,
                stiffness: 200,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <TouchableOpacity
                style={styles.bottomSheetOverlay}
                activeOpacity={1}
                onPress={onClose}
            />
            <Animated.View
                style={[
                    styles.bottomSheetContainer,
                    { backgroundColor: theme.colors.card, transform: [{ translateY: slideAnim }] },
                ]}>
                <View style={[styles.bottomSheetHandle, { backgroundColor: theme.colors.border }]} />
                <View style={styles.bottomSheetHeader}>
                    <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>
                        {title}
                    </Text>
                    <TouchableOpacity onPress={onClose} hitSlop={8}>
                        <Ionicons name="close" size={22} color={theme.colors.subtext} />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.bottomSheetContent}>
                    {children}
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

// ─── AdminButton ──────────────────────────────────────────────────────────────
interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    style?: object;
}

export function AdminButton({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    style,
}: ButtonProps) {
    const theme = useTheme();

    const bgColor =
        variant === 'primary'
            ? theme.colors.primary
            : variant === 'danger'
              ? '#ef4444'
              : variant === 'secondary'
                ? theme.colors.card
                : 'transparent';

    const textColor =
        variant === 'primary' || variant === 'danger'
            ? '#fff'
            : theme.colors.text;

    const borderColor =
        variant === 'secondary'
            ? theme.colors.border
            : variant === 'ghost'
              ? theme.colors.border
              : 'transparent';

    const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 15 : 11;
    const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.75}
            style={[
                styles.button,
                {
                    backgroundColor: disabled || loading ? `${bgColor}60` : bgColor,
                    borderColor,
                    borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0,
                    paddingVertical,
                },
                style,
            ]}>
            {icon && !loading && (
                <Ionicons name={icon} size={fontSize + 2} color={textColor} style={styles.buttonIcon} />
            )}
            <Text style={[styles.buttonText, { color: textColor, fontSize }]}>
                {loading ? 'Loading…' : title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // StatusBadge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    statusBadgeMd: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusTextMd: {
        fontSize: 13,
    },
    // FilterChip
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        gap: 5,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterChipBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 8,
        minWidth: 18,
        alignItems: 'center',
    },
    filterChipBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    // StatCard
    statCard: {
        borderRadius: 16,
        padding: 14,
        gap: 6,
    },
    statCardIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statCardValue: {
        fontSize: 22,
        fontWeight: '700',
    },
    statCardTitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    // BottomSheet
    bottomSheetOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bottomSheetContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    bottomSheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    bottomSheetTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    bottomSheetContent: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    // Button
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingHorizontal: 18,
    },
    buttonIcon: {
        marginRight: 6,
    },
    buttonText: {
        fontWeight: '600',
    },
});
