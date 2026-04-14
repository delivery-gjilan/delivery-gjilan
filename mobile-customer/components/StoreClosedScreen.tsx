import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { Ionicons } from '@expo/vector-icons';

interface StoreClosedScreenProps {
    message?: string;
}

export default function StoreClosedScreen({ message }: StoreClosedScreenProps) {
    const { colors } = useTheme();
    const { t } = useTranslations();

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Soft radial-like gradient from top */}
            <LinearGradient
                colors={['#4C1D9520', '#7C3AED0A', 'transparent']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.7 }}
            />

            <View style={styles.content}>
                {/* Icon bubble */}
                <View style={styles.iconWrap}>
                    <LinearGradient
                        colors={['#6D28D9', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="moon-outline" size={36} color="#fff" />
                    </LinearGradient>
                </View>

                {/* Text block */}
                <Text style={[styles.title, { color: colors.foreground }]}>
                    {t.store_closed.title}
                </Text>
                <Text style={[styles.message, { color: colors.subtext }]}>
                    {message || t.store_closed.default_message}
                </Text>

                {/* Info card */}
                <View style={styles.card}>
                    <LinearGradient
                        colors={['#5B21B610', '#7C3AED18']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        <Ionicons name="information-circle-outline" size={16} color="#A78BFA" style={{ marginBottom: 6 }} />
                        <Text style={styles.cardText}>
                            {t.store_closed.info}
                        </Text>
                    </LinearGradient>
                </View>
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
        shadowColor: '#7C3AED',
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
        marginBottom: 36,
    },
    card: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#7C3AED30',
    },
    cardGradient: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cardText: {
        color: '#A78BFA',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
    },
});
