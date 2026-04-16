import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RemoveItemData {
    orderId: string;
    itemId: string;
    itemName: string;
    itemQuantity: number;
}

interface RemoveItemModalProps {
    data: RemoveItemData | null;
    reason: string;
    quantity: number;
    loading: boolean;
    onClose: () => void;
    onChangeReason: (reason: string) => void;
    onChangeQuantity: (quantity: number) => void;
    onConfirm: () => void;
}

const REASON_PRESETS = ['Out of stock', 'Item unavailable', 'Preparation issue'];

export function RemoveItemModal({
    data,
    reason,
    quantity,
    loading,
    onClose,
    onChangeReason,
    onChangeQuantity,
    onConfirm,
}: RemoveItemModalProps) {
    return (
        <Modal
            visible={!!data}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 24 }}
                onPress={onClose}
            >
                <Pressable
                    style={{ backgroundColor: '#09090b', borderRadius: 20, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={{ color: '#f1f5f9', fontSize: 17, fontWeight: '700', marginBottom: 6 }}>Remove item?</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                        "{data?.itemName}" will be removed and the customer will be notified.
                    </Text>

                    {(data?.itemQuantity ?? 1) > 1 && (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                Quantity to remove (of {data?.itemQuantity})
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity
                                    onPress={() => onChangeQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: quantity <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Ionicons name="remove" size={18} color={quantity <= 1 ? '#475569' : '#f1f5f9'} />
                                </TouchableOpacity>
                                <Text style={{ color: '#f1f5f9', fontSize: 20, fontWeight: '800', minWidth: 30, textAlign: 'center' }}>
                                    {quantity}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => onChangeQuantity(Math.min(data?.itemQuantity ?? 1, quantity + 1))}
                                    disabled={quantity >= (data?.itemQuantity ?? 1)}
                                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: quantity >= (data?.itemQuantity ?? 1) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Ionicons name="add" size={18} color={quantity >= (data?.itemQuantity ?? 1) ? '#475569' : '#f1f5f9'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onChangeQuantity(data?.itemQuantity ?? 1)}
                                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: quantity === (data?.itemQuantity ?? 1) ? '#ef4444' : 'rgba(255,255,255,0.15)', backgroundColor: quantity === (data?.itemQuantity ?? 1) ? '#ef444418' : 'transparent' }}
                                >
                                    <Text style={{ color: quantity === (data?.itemQuantity ?? 1) ? '#ef4444' : '#94a3b8', fontSize: 12, fontWeight: '600' }}>All</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {REASON_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset}
                                onPress={() => onChangeReason(preset)}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: reason === preset ? '#ef4444' : 'rgba(255,255,255,0.15)', backgroundColor: reason === preset ? '#ef444418' : 'transparent' }}
                            >
                                <Text style={{ color: reason === preset ? '#ef4444' : '#94a3b8', fontSize: 13, fontWeight: '600' }}>
                                    {preset}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        value={reason}
                        onChangeText={onChangeReason}
                        placeholder="Or type a reason…"
                        placeholderTextColor="#475569"
                        style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 12, color: '#f1f5f9', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 }}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}
                        >
                            <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onConfirm}
                            disabled={!reason.trim() || loading}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: reason.trim() && !loading ? '#ef4444' : '#ef444460' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>
                                {loading ? 'Removing…' : `Remove ${quantity}×`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
