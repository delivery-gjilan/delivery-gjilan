import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    count: number;
    onPress: () => void;
}

export function OrderPoolFAB({ count, onPress }: Props) {
    if (count === 0) return null;

    return (
        <Pressable style={styles.fab} onPress={onPress}>
            <Ionicons name="layers-outline" size={22} color="#fff" />
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        left: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        zIndex: 15,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#22d3ee',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    badgeText: {
        color: '#0f172a',
        fontSize: 11,
        fontWeight: '900',
    },
});
