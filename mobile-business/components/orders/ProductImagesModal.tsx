import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from './types';

interface ProductImagesModalProps {
    order: Order | null;
    businessId: string;
    onClose: () => void;
    onRemoveItem: (data: { orderId: string; itemId: string; itemName: string; itemQuantity: number }) => void;
}

export function ProductImagesModal({ order, businessId, onClose, onRemoveItem }: ProductImagesModalProps) {
    const businessOrder = order?.businesses.find((b) => b.business.id === businessId);

    return (
        <Modal
            visible={!!order}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 justify-end"
                style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
                onPress={onClose}
            >
                <Pressable
                    style={{
                        backgroundColor: '#0f172a',
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        maxHeight: '88%',
                        paddingBottom: 32,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                        <View>
                            <Text style={{ color: '#f1f5f9', fontSize: 20, fontWeight: '700' }}>
                                #{order?.displayId}
                            </Text>
                            <Text style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                                {businessOrder?.items.length ?? 0} items
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            hitSlop={12}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                backgroundColor: 'rgba(255,255,255,0.07)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="close" size={18} color="#64748b" />
                        </Pressable>
                    </View>

                    <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                        {businessOrder?.items.map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    backgroundColor: '#1e293b',
                                    borderRadius: 18,
                                    padding: 14,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.07)',
                                }}
                            >
                                {item.imageUrl ? (
                                    <Image
                                        source={{ uri: item.imageUrl }}
                                        style={{ width: 80, height: 80, borderRadius: 14, backgroundColor: '#0f172a', marginRight: 14, flexShrink: 0 }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={{ width: 80, height: 80, borderRadius: 14, backgroundColor: '#0f172a', marginRight: 14, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                                        <Ionicons name="image-outline" size={28} color="#334155" />
                                    </View>
                                )}

                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
                                        {item.name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                                        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: '#7c3aed22', borderWidth: 1, borderColor: '#7c3aed44' }}>
                                            <Text style={{ color: '#c4b5fd', fontSize: 12, fontWeight: '700' }}>×{item.quantity}</Text>
                                        </View>
                                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>€{item.unitPrice.toFixed(2)} each</Text>
                                    </View>
                                    <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '800', marginTop: 6 }}>
                                        €{(item.unitPrice * item.quantity).toFixed(2)}
                                    </Text>
                                    {item.notes ? (
                                        <View style={{ marginTop: 8, backgroundColor: '#f59e0b18', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#f59e0b33' }}>
                                            <Text style={{ color: '#fcd34d', fontSize: 12 }}>{item.notes}</Text>
                                        </View>
                                    ) : null}
                                    {order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                        <TouchableOpacity
                                            onPress={() => onRemoveItem({ orderId: order.id, itemId: item.id, itemName: item.name, itemQuantity: item.quantity })}
                                            style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#ef444418', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ef444430' }}
                                        >
                                            <Ionicons name="trash-outline" size={13} color="#ef4444" />
                                            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600', marginLeft: 5 }}>Remove</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
