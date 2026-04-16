import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const SUPPORT_NUMBER = process.env.EXPO_PUBLIC_ORDER_CANCELLATION_PHONE || '+383 45 205 045';

export default function SuspendedAccountScreen() {
    const { colors } = useTheme();

    const handleCallSupport = async () => {
        await Linking.openURL(`tel:${SUPPORT_NUMBER}`);
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={['#DC262620', '#EF44440F', 'transparent']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.7 }}
            />

            <View style={styles.content}>
                <View style={styles.iconWrap}>
                    <LinearGradient
                        colors={['#B91C1C', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="warning-outline" size={36} color="#fff" />
                    </LinearGradient>
                </View>

                <Text style={[styles.title, { color: colors.foreground }]}>Account Suspended</Text>
                <Text style={[styles.message, { color: colors.subtext }]}>Your account is currently suspended. Please contact support for more details.</Text>

                <TouchableOpacity onPress={handleCallSupport} activeOpacity={0.85} style={styles.contactCard}>
                    <LinearGradient
                        colors={['#7F1D1D24', '#EF444430']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.contactCardGradient}
                    >
                        <Ionicons name="call-outline" size={18} color="#FCA5A5" style={{ marginBottom: 6 }} />
                        <Text style={styles.contactLabel}>Contact Number</Text>
                        <Text style={styles.contactNumber}>{SUPPORT_NUMBER}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrap: {
        marginBottom: 28,
        borderRadius: 28,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    contactCard: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EF444450',
    },
    contactCardGradient: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        alignItems: 'center',
    },
    contactLabel: {
        color: '#FCA5A5',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    contactNumber: {
        color: '#FECACA',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
});
