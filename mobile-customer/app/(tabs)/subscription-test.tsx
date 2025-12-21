import { View, Text, StyleSheet } from 'react-native';
import { useSubscription } from '@apollo/client/react';
import { ORDER_STATUS_UPDATED } from '../../graphql/operations/orders/subscriptions';

export default function SubscriptionTest() {
    const orderId = 'f560c1ee-4524-450b-8977-53356c9779fc';
    const { data, loading, error } = useSubscription(ORDER_STATUS_UPDATED, {
        variables: { orderId },
        onData: (data) => console.log('Data received:', data),
        onError: (err) => console.error('Subscription error:', err),
    });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Subscription Test</Text>
            <Text style={styles.label}>Order ID:</Text>
            <Text style={styles.value}>{orderId}</Text>

            <View style={styles.statusContainer}>
                {loading && <Text style={styles.info}>Listening for updates...</Text>}

                {error && <Text style={styles.error}>Error: {error.message}</Text>}

                {data && (
                    <View style={styles.result}>
                        <Text style={styles.resultLabel}>New Status:</Text>
                        <Text style={styles.status}>{data.orderStatusUpdated.status}</Text>
                        <Text style={styles.timestamp}>Received at: {new Date().toLocaleTimeString()}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    label: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    value: {
        fontSize: 14,
        fontFamily: 'monospace',
        marginBottom: 30,
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 4,
    },
    statusContainer: {
        width: '100%',
        alignItems: 'center',
        minHeight: 200,
    },
    info: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    },
    error: {
        fontSize: 16,
        color: '#d32f2f',
        marginTop: 10,
        textAlign: 'center',
    },
    result: {
        marginTop: 20,
        padding: 20,
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#90caf9',
    },
    resultLabel: {
        fontSize: 14,
        color: '#1976d2',
        marginBottom: 5,
    },
    status: {
        fontSize: 32,
        color: '#0d47a1',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
    },
});
