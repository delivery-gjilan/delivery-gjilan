import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client/react';
import * as Location from 'expo-location';
import { MapView, Marker } from '@/components/MapWrapper';
import type { Region } from '@/components/MapWrapper';

import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { ADD_USER_ADDRESS, UPDATE_USER_ADDRESS, GET_MY_ADDRESSES } from '@/graphql/operations/addresses';

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

export default function AddEditAddressScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;
    const mapRef = useRef<any>(null);

    const [addressName, setAddressName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [markerCoordinate, setMarkerCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
    const [mapRegion, setMapRegion] = useState<Region>({
        latitude: 42.4629,
        longitude: 21.4694,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    const { data: addressesData } = useQuery(GET_MY_ADDRESSES, {
        skip: !isEdit,
        fetchPolicy: 'cache-and-network',
    });

    // Pre-fill form fields when editing an existing address
    useEffect(() => {
        if (!isEdit || !addressesData?.myAddresses) return;
        const address = addressesData.myAddresses.find((a: any) => String(a.id) === String(id));
        if (address) {
            setAddressName(address.addressName || '');
            setDisplayName(address.displayName || '');
            setMarkerCoordinate({ latitude: address.latitude, longitude: address.longitude });
            setMapRegion({
                latitude: address.latitude,
                longitude: address.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    }, [isEdit, id, addressesData]);

    const [addAddress] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
        onCompleted: () => {
            Alert.alert(t.common.success, t.addresses.added_success);
            router.back();
        },
        onError: (error) => {
            Alert.alert(t.common.error, error.message);
        },
    });

    const [updateAddress] = useMutation(UPDATE_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
        onCompleted: () => {
            Alert.alert(t.common.success, t.addresses.updated_success);
            router.back();
        },
        onError: (error) => {
            Alert.alert(t.common.error, error.message);
        },
    });

    useEffect(() => {
        if (!isEdit) {
            getCurrentLocation();
        }
    }, [isEdit]);

    const getCurrentLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t.addresses.permission_denied, t.addresses.location_required);
                setFetchingLocation(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            
            setMarkerCoordinate(coords);
            setMapRegion({
                ...coords,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });

            // Reverse geocode
            await reverseGeocode(coords.latitude, coords.longitude);
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert(t.common.error, t.addresses.location_failed);
        }
        setFetchingLocation(false);
    };

    const reverseGeocode = async (latitude: number, longitude: number) => {
        try {
            const response = await fetch(
                `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_API_KEY}`
            );
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const place = data.features[0];
                setDisplayName(place.place_name || place.text || '');
            }
        } catch (error) {
            console.error('Reverse geocode error:', error);
        }
    };

    const handleMapPress = async (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setMarkerCoordinate({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
    };

    const handleSave = async () => {
        if (!addressName.trim()) {
            Alert.alert(t.common.required, t.addresses.enter_name);
            return;
        }

        if (!markerCoordinate) {
            Alert.alert(t.common.required, t.addresses.select_location);
            return;
        }

        setLoading(true);

        if (isEdit) {
            await updateAddress({
                variables: {
                    input: {
                        id,
                        addressName: addressName.trim(),
                        displayName: displayName.trim() || null,
                    },
                },
            });
        } else {
            await addAddress({
                variables: {
                    input: {
                        latitude: markerCoordinate.latitude,
                        longitude: markerCoordinate.longitude,
                        addressName: addressName.trim(),
                        displayName: displayName.trim() || null,
                        priority: 0,
                    },
                },
            });
        }

        setLoading(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    {isEdit ? t.addresses.edit_title : t.addresses.add_title}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <View className="flex-1">
                {/* Map */}
                <View style={{ height: '50%', position: 'relative' }}>
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        region={mapRegion}
                        onRegionChangeComplete={setMapRegion}
                        onPress={handleMapPress}
                        showsUserLocation
                        showsMyLocationButton={false}
                    >
                        {markerCoordinate && (
                            <Marker coordinate={markerCoordinate} pinColor={theme.colors.primary} />
                        )}
                    </MapView>

                    {/* Current Location Button */}
                    <TouchableOpacity
                        onPress={getCurrentLocation}
                        disabled={fetchingLocation}
                        className="absolute bottom-4 right-4 p-3 rounded-full"
                        style={{ backgroundColor: theme.colors.card, ...styles.shadow }}
                    >
                        {fetchingLocation ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Ionicons name="locate" size={24} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>

                    {/* Instruction */}
                    <View
                        className="absolute top-4 left-4 right-4 p-3 rounded-2xl"
                        style={{ backgroundColor: theme.colors.card + 'F0', ...styles.shadow }}
                    >
                        <Text className="text-sm" style={{ color: theme.colors.text }}>
                            {t.addresses.tap_map}
                        </Text>
                    </View>
                </View>

                {/* Form */}
                <View className="flex-1 p-4">
                    <View className="mb-4">
                        <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                            {t.addresses.label}
                        </Text>
                        <TextInput
                            value={addressName}
                            onChangeText={setAddressName}
                            placeholder={t.addresses.label_placeholder}
                            placeholderTextColor={theme.colors.subtext}
                            className="px-4 py-3 rounded-xl text-base"
                            style={{
                                color: theme.colors.text,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                            }}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                            {t.addresses.full_address}
                        </Text>
                        <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder={t.addresses.full_address_placeholder}
                            placeholderTextColor={theme.colors.subtext}
                            multiline
                            numberOfLines={2}
                            className="px-4 py-3 rounded-xl text-base"
                            style={{
                                color: theme.colors.text,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                            }}
                        />
                    </View>

                    {markerCoordinate && (
                        <View className="mb-4 p-3 rounded-xl" style={{ backgroundColor: theme.colors.card }}>
                            <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                                {t.addresses.coordinates}: {markerCoordinate.latitude.toFixed(6)}, {markerCoordinate.longitude.toFixed(6)}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        className="p-4 rounded-2xl items-center"
                        style={{ backgroundColor: theme.colors.primary }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text className="text-base font-semibold text-white">
                                {isEdit ? t.addresses.update : t.addresses.save}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});
