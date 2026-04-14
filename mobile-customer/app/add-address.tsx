import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client/react';
import * as Location from 'expo-location';
import { MapLibreGL } from '@/components/MapWrapper.native';

import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { ADD_USER_ADDRESS, UPDATE_USER_ADDRESS, GET_MY_ADDRESSES } from '@/graphql/operations/addresses';
import { toast } from '@/store/toastStore';

const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? '';

export default function AddEditAddressScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

    const [addressName, setAddressName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [markerCoordinate, setMarkerCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
    const [center, setCenter] = useState<[number, number]>([21.4694, 42.4629]); // [lng, lat]
    const [zoomLevel, setZoomLevel] = useState(14);
    const [error, setError] = useState<string | null>(null);

    const { data: addressesData } = useQuery(GET_MY_ADDRESSES, {
        skip: !isEdit,
        fetchPolicy: 'cache-and-network',
    });

    // Pre-fill form fields when editing an existing address
    useEffect(() => {
        const savedAddresses = addressesData?.myAddresses;
        if (!isEdit || !savedAddresses) return;
        const address = savedAddresses.find((a) => String(a.id) === String(id));
        if (address) {
            setAddressName(address.addressName || '');
            setDisplayName(address.displayName || '');
            setMarkerCoordinate({ latitude: address.latitude, longitude: address.longitude });
            setCenter([address.longitude, address.latitude]);
        }
    }, [isEdit, id, addressesData]);

    const [addAddress] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
        onCompleted: () => {
            toast.success(t.addresses.added_success);
            router.back();
        },
        onError: (error) => {
            setError(error.message);
        },
    });

    const [updateAddress] = useMutation(UPDATE_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
        onCompleted: () => {
            toast.success(t.addresses.updated_success);
            router.back();
        },
        onError: (error) => {
            setError(error.message);
        },
    });

    useEffect(() => {
        if (!isEdit) {
            getCurrentLocation();
        }
    }, [isEdit]);

    const getCurrentLocation = async () => {
        setFetchingLocation(true);
        setError(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError(t.addresses.location_required);
                setFetchingLocation(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            
            setMarkerCoordinate(coords);
            setCenter([coords.longitude, coords.latitude]);
            cameraRef.current?.setCamera({
                centerCoordinate: [coords.longitude, coords.latitude],
                zoomLevel: 15,
                animationDuration: 600,
            });

            // Reverse geocode
            await reverseGeocode(coords.latitude, coords.longitude);
        } catch (error) {
            console.error('Location error:', error);
            setError(t.addresses.location_failed);
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
        const { geometry } = event;
        if (!geometry?.coordinates) return;
        const [longitude, latitude] = geometry.coordinates;
        setMarkerCoordinate({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
    };

    const handleSave = async () => {
        setError(null);
        
        if (!addressName.trim()) {
            setError(t.addresses.enter_name);
            return;
        }

        if (!markerCoordinate) {
            setError(t.addresses.select_location);
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
                <View style={{ height: 350, position: 'relative' }}>
                    <MapLibreGL.MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFillObject}
                        styleURL={MAPBOX_STYLE}
                        onPress={handleMapPress}
                        logoEnabled={false}
                        attributionEnabled={false}
                        scaleBarEnabled={false}
                        compassEnabled={false}
                        scrollEnabled={true}
                        zoomEnabled={true}
                        pitchEnabled={false}
                        rotateEnabled={false}
                    >
                        <MapLibreGL.Camera
                            ref={cameraRef}
                            defaultSettings={{
                                centerCoordinate: center,
                                zoomLevel: zoomLevel,
                            }}
                        />
                        <MapLibreGL.UserLocation visible={true} />
                        {markerCoordinate && (
                            <MapLibreGL.PointAnnotation
                                id="selected-marker"
                                coordinate={[markerCoordinate.longitude, markerCoordinate.latitude]}
                            >
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: 'white' }} />
                            </MapLibreGL.PointAnnotation>
                        )}
                    </MapLibreGL.MapView>

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
                        pointerEvents="none"
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
                    {/* Error Message */}
                    {error && (
                        <View className="flex-row items-start gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.colors.expense + '10', borderWidth: 1, borderColor: theme.colors.expense + '30' }}>
                            <Ionicons name="alert-circle" size={16} color={theme.colors.expense} style={{ marginTop: 1 }} />
                            <Text className="text-xs flex-1" style={{ color: theme.colors.expense, lineHeight: 18 }}>
                                {error}
                            </Text>
                        </View>
                    )}

                    <View className="mb-4">
                        <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                            {t.addresses.label}
                        </Text>
                        <TextInput
                            value={addressName}
                            onChangeText={(text) => {
                                setAddressName(text);
                                if (error) setError(null);
                            }}
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
