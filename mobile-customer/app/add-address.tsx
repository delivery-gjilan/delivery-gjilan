import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import { useMutation, useQuery } from '@apollo/client/react';
import * as Location from 'expo-location';

import { useTheme } from '@/hooks/useTheme';
import { ADD_USER_ADDRESS, UPDATE_USER_ADDRESS, GET_MY_ADDRESSES } from '@/graphql/operations/addresses';

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

export default function AddEditAddressScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;
    const mapRef = useRef<MapView>(null);

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
        onCompleted: (data) => {
            if (isEdit) {
                const address = data.myAddresses.find((a: any) => a.id === id);
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
            }
        },
    });

    const [addAddress] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
        onCompleted: () => {
            Alert.alert('Success', 'Address added successfully');
            router.back();
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    const [updateAddress] = useMutation(UPDATE_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
        onCompleted: () => {
            Alert.alert('Success', 'Address updated successfully');
            router.back();
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
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
                Alert.alert('Permission denied', 'Location permission is required');
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
            Alert.alert('Error', 'Could not get your location');
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
            Alert.alert('Required', 'Please enter an address name');
            return;
        }

        if (!markerCoordinate) {
            Alert.alert('Required', 'Please select a location on the map');
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
                    {isEdit ? 'Edit Address' : 'Add Address'}
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
                            📍 Tap on the map to set your address location
                        </Text>
                    </View>
                </View>

                {/* Form */}
                <View className="flex-1 p-4">
                    <View className="mb-4">
                        <Text className="text-sm font-semibold mb-2" style={{ color: theme.colors.text }}>
                            Address Label *
                        </Text>
                        <TextInput
                            value={addressName}
                            onChangeText={setAddressName}
                            placeholder="e.g., Home, Work, Gym"
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
                            Full Address
                        </Text>
                        <TextInput
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Auto-filled from map or enter manually"
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
                                Coordinates: {markerCoordinate.latitude.toFixed(6)}, {markerCoordinate.longitude.toFixed(6)}
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
                                {isEdit ? 'Update Address' : 'Save Address'}
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
