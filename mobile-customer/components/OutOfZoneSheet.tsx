import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, Modal, TouchableOpacity, Pressable,
    TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_ADDRESSES, ADD_USER_ADDRESS, SET_DEFAULT_ADDRESS } from '@/graphql/operations/addresses';
import { GET_SERVICE_ZONES } from '@/graphql/operations/serviceZone';
import { useDeliveryLocationStore } from '@/store/useDeliveryLocationStore';
import { isPointInPolygon } from '@/utils/pointInPolygon';
import { MapLibreGL } from '@/components/MapWrapper.native';

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? '';
const MIN_GEOCODE_DELTA = 0.00003;

type Step = 'choice' | 'addresses' | 'map' | 'save-prompt';

interface OutOfZoneSheetProps {
    visible: boolean;
    onDismiss: () => void;
}

export function OutOfZoneSheet({ visible, onDismiss }: OutOfZoneSheetProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();
    const { setLocation } = useDeliveryLocationStore();
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const geocodeAbortRef = useRef<AbortController | null>(null);
    const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const regionSettleTokenRef = useRef(0);
    const lastGeocodedPosRef = useRef<{ lat: number; lng: number } | null>(null);

    // `userStep` is only set when the user actively navigates (tap a button).
    // `null` means "auto-decide from data loading state".
    const [userStep, setUserStep] = useState<Step | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isMapInMotion, setIsMapInMotion] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [pickedCoord, setPickedCoord] = useState<{ latitude: number; longitude: number } | null>(null);
    const [pickedAddress, setPickedAddress] = useState('');
    const [geocodedCoord, setGeocodedCoord] = useState<{ latitude: number; longitude: number } | null>(null);
    const [saveLabel, setSaveLabel] = useState('Home');
    const [saving, setSaving] = useState(false);

    const { data: addressesData, loading: addressesLoading } = useQuery(GET_MY_ADDRESSES, {
        skip: !visible,
        fetchPolicy: 'cache-and-network',
    });

    const { data: zonesData, loading: zonesLoading } = useQuery(GET_SERVICE_ZONES, {
        skip: !visible,
        fetchPolicy: 'cache-and-network',
    });

    const [addAddress] = useMutation(ADD_USER_ADDRESS, {
        refetchQueries: [{ query: GET_MY_ADDRESSES }],
    });
    const [setDefaultAddress] = useMutation(SET_DEFAULT_ADDRESS);

    const allAddresses = addressesData?.myAddresses ?? [];
    const activeZones = (zonesData?.deliveryZones ?? []).filter((z) => z.isActive);
    const serviceZones = activeZones.filter((z) => z.isServiceZone === true);
    const effectiveZones = serviceZones.length > 0 ? serviceZones : activeZones;

    const zoneFillFeature = useMemo(() => {
        if (effectiveZones.length === 0) return null;

        const rings = effectiveZones
            .map((zone) =>
                (zone.polygon ?? [])
                    .map((p) => [p.lng, p.lat] as [number, number])
            )
            .filter((ring: Array<[number, number]>) => ring.length >= 3)
            .map((ring: Array<[number, number]>) => {
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
                    return [...ring, first];
                }
                return ring;
            });

        if (rings.length === 0) return null;

        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        // World ring with service-zone holes.
                        coordinates: [
                            [
                                [-180, -85],
                                [180, -85],
                                [180, 85],
                                [-180, 85],
                                [-180, -85],
                            ],
                            ...rings,
                        ],
                    },
                },
            ],
        } as any;
    }, [effectiveZones]);

    const zoneOutlineFeature = useMemo(() => {
        if (effectiveZones.length === 0) return null;

        const features = effectiveZones
            .map((zone) => {
                const ring = (zone.polygon ?? [])
                    .map((p) => [p.lng, p.lat] as [number, number]);
                if (ring.length < 3) return null;

                const first = ring[0];
                const last = ring[ring.length - 1];
                const closed = !first || !last || first[0] !== last[0] || first[1] !== last[1]
                    ? [...ring, first]
                    : ring;

                return {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: closed },
                };
            })
            .filter(Boolean);

        if (features.length === 0) return null;

        return {
            type: 'FeatureCollection',
            features,
        } as any;
    }, [effectiveZones]);

    const zoneBounds = useMemo(() => {
        if (effectiveZones.length === 0) return { ne: [21.60, 42.55], sw: [21.35, 42.38] as [number, number] };

        const points = effectiveZones.flatMap((zone) =>
            (zone.polygon ?? []).map((p) => ({ lng: p.lng, lat: p.lat })),
        );

        if (points.length === 0) return { ne: [21.60, 42.55], sw: [21.35, 42.38] as [number, number] };

        const minLng = Math.min(...points.map((p) => p.lng));
        const maxLng = Math.max(...points.map((p) => p.lng));
        const minLat = Math.min(...points.map((p) => p.lat));
        const maxLat = Math.max(...points.map((p) => p.lat));
        const pad = 0.02;

        return {
            ne: [maxLng + pad, maxLat + pad] as [number, number],
            sw: [minLng - pad, minLat - pad] as [number, number],
        };
    }, [effectiveZones]);

    // Only show addresses that fall inside a service zone (if zones are configured)
    const validAddresses = effectiveZones.length > 0
        ? allAddresses.filter((addr) =>
            effectiveZones.some((zone) =>
                isPointInPolygon(
                    { lat: addr.latitude, lng: addr.longitude },
                    zone.polygon
                )
            )
        )
        : allAddresses;

    const isPickedWithinDeliveryZone = useMemo(() => {
        if (!pickedCoord) return false;
        if (effectiveZones.length === 0) return true;

        return effectiveZones.some((zone) =>
            isPointInPolygon(
                { lat: pickedCoord.latitude, lng: pickedCoord.longitude },
                zone.polygon,
            ),
        );
    }, [pickedCoord, effectiveZones]);

    // Derive the effective step: if the user tapped into a specific step, honour it.
    // Otherwise auto-decide based on data loading.
    const dataReady = !addressesLoading && !zonesLoading;
    const step: Step = userStep
        ?? (dataReady
            ? (validAddresses.length > 0 ? 'choice' : 'addresses')
            : 'addresses'); // show 'addresses' (with spinner) while loading

    // Reset when sheet opens — clear only the user-driven step so we auto-decide fresh
    useEffect(() => {
        if (visible) {
            setUserStep(null);
            setPickedCoord(null);
            setPickedAddress('');
            setGeocodedCoord(null);
            setSaveLabel('Home');
            setIsDragging(false);
            setIsMapInMotion(false);
            setIsReverseGeocoding(false);
            lastGeocodedPosRef.current = null;
        } else {
            if (geocodeAbortRef.current) {
                geocodeAbortRef.current.abort();
                geocodeAbortRef.current = null;
            }
            if (geocodeDebounceRef.current) {
                clearTimeout(geocodeDebounceRef.current);
                geocodeDebounceRef.current = null;
            }
        }
    }, [visible]);

    useEffect(() => {
        return () => {
            if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
            if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
        };
    }, []);

    // ─── Handlers ──────────────────────────────────────────

    const handleSelectSaved = (addr: typeof allAddresses[number]) => {
        setLocation({
            latitude: addr.latitude,
            longitude: addr.longitude,
            address: addr.displayName || addr.addressName,
            label: addr.addressName,
        });
        onDismiss();
    };

    const handleRegionDidChange = async (feature: any) => {
        setIsDragging(false);

        let longitude: number | null = null;
        let latitude: number | null = null;

        try {
            const center = await mapRef.current?.getCenter?.();
            if (Array.isArray(center) && center.length >= 2) {
                longitude = Number(center[0]);
                latitude = Number(center[1]);
            }
        } catch {
            // Fallback to event payload below.
        }

        if (longitude == null || latitude == null) {
            const coords = feature?.geometry?.coordinates;
            if (!coords) return;
            longitude = Number(coords[0]);
            latitude = Number(coords[1]);
        }

        setPickedCoord({ latitude, longitude });

        const last = lastGeocodedPosRef.current;
        if (
            last &&
            Math.abs(last.lat - latitude) < MIN_GEOCODE_DELTA &&
            Math.abs(last.lng - longitude) < MIN_GEOCODE_DELTA
        ) {
            setIsReverseGeocoding(false);
            setIsMapInMotion(false);
            return;
        }

        setPickedAddress('');
        setGeocodedCoord(null);
        setIsReverseGeocoding(true);
        setIsMapInMotion(true);

        const settleToken = ++regionSettleTokenRef.current;
        if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);

        geocodeDebounceRef.current = setTimeout(async () => {
            if (settleToken !== regionSettleTokenRef.current) return;

            if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
            const controller = new AbortController();
            geocodeAbortRef.current = controller;

            try {
                const res = await fetch(
                    `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_API_KEY}`,
                    { signal: controller.signal },
                );
                const data = await res.json();
                if (!controller.signal.aborted && data.features?.length > 0) {
                    setPickedAddress(data.features[0].place_name || data.features[0].text || '');
                    setGeocodedCoord({ latitude, longitude });
                    lastGeocodedPosRef.current = { lat: latitude, lng: longitude };
                }
            } catch {
                // ignore aborted / failed
            } finally {
                if (!controller.signal.aborted && settleToken === regionSettleTokenRef.current) {
                    setIsReverseGeocoding(false);
                    setIsMapInMotion(false);
                }
            }
        }, 250);
    };

    const handleConfirmLocation = () => {
        if (pickedCoord) setUserStep('save-prompt');
    };

    const handleSaveAddress = async () => {
        if (!pickedCoord) return;
        setSaving(true);
        try {
            const result = await addAddress({
                variables: {
                    input: {
                        latitude: pickedCoord.latitude,
                        longitude: pickedCoord.longitude,
                        addressName: saveLabel.trim() || 'Home',
                        displayName: pickedAddress || null,
                        priority: 0,
                    },
                },
            });
            const newId = result.data?.addUserAddress?.id;
            if (newId) await setDefaultAddress({ variables: { id: newId } });
        } catch { /* still proceed */ }
        setLocation({
            latitude: pickedCoord.latitude,
            longitude: pickedCoord.longitude,
            address: pickedAddress,
            label: saveLabel.trim() || 'Home',
        });
        setSaving(false);
        onDismiss();
    };

    const handleContinueWithoutSaving = () => {
        if (!pickedCoord) return;
        setLocation({
            latitude: pickedCoord.latitude,
            longitude: pickedCoord.longitude,
            address: pickedAddress,
        });
        onDismiss();
    };

    // ─── Render ─────────────────────────────────────────────

    return (
        <Modal
            visible={visible}
            transparent={step !== 'map'}
            animationType={step === 'map' ? 'slide' : 'fade'}
            statusBarTranslucent
            onRequestClose={() => {}}
        >
            <View style={{
                flex: 1,
                backgroundColor: step === 'map' ? theme.colors.background : 'rgba(0,0,0,0.55)',
                justifyContent: step === 'map' ? 'flex-start' : 'flex-end',
            }}>

                {/* ── STEP: choice (has saved addresses) ───── */}
                {step === 'choice' && (
                    <Pressable onPress={() => {}}>
                        <View style={{
                            backgroundColor: theme.colors.card,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingHorizontal: 24,
                            paddingTop: 20,
                            paddingBottom: Math.max(insets.bottom, 24),
                        }}>
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
                            </View>
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Ionicons name="location-outline" size={32} color={theme.colors.primary} />
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 6 }}>
                                    {t.home.out_of_zone.title}
                                </Text>
                                <Text style={{ fontSize: 14, color: theme.colors.subtext, textAlign: 'center', lineHeight: 20 }}>
                                    {t.home.out_of_zone.message}
                                </Text>
                            </View>

                            {/* Option A: use a saved address */}
                            <TouchableOpacity
                                onPress={() => setUserStep('addresses')}
                                activeOpacity={0.8}
                                style={{
                                    backgroundColor: theme.colors.primary,
                                    paddingVertical: 15, borderRadius: 14,
                                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                                    gap: 8, marginBottom: 12,
                                }}
                            >
                                <Ionicons name="home-outline" size={20} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                                    Choose a saved address
                                </Text>
                            </TouchableOpacity>

                            {/* Option B: pick on map */}
                            <TouchableOpacity
                                onPress={() => setUserStep('map')}
                                activeOpacity={0.8}
                                style={{
                                    backgroundColor: theme.colors.background,
                                    paddingVertical: 15, borderRadius: 14,
                                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                                    gap: 8,
                                    borderWidth: 1, borderColor: theme.colors.border,
                                }}
                            >
                                <Ionicons name="map-outline" size={20} color={theme.colors.text} />
                                <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>
                                    Pick a new location on map
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                )}

                {/* ── STEP: addresses ──────────────────────── */}
                {step === 'addresses' && (
                    <Pressable onPress={() => {}}>
                        <View style={{
                            backgroundColor: theme.colors.card,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingHorizontal: 24,
                            paddingTop: 20,
                            paddingBottom: Math.max(insets.bottom, 24),
                        }}>
                            {/* Drag handle */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
                            </View>

                            {/* Icon + title */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Ionicons name="location-outline" size={32} color={theme.colors.primary} />
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 6 }}>
                                    {t.home.out_of_zone.title}
                                </Text>
                                <Text style={{ fontSize: 14, color: theme.colors.subtext, textAlign: 'center', lineHeight: 20 }}>
                                    {t.home.out_of_zone.message}
                                </Text>
                            </View>

                            {/* Saved in-zone addresses */}
                            {addressesLoading ? (
                                <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
                            ) : validAddresses.length > 0 ? (
                                <>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.subtext, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                        Your saved addresses
                                    </Text>
                                    {validAddresses.map((addr) => (
                                        <TouchableOpacity
                                            key={addr.id}
                                            onPress={() => handleSelectSaved(addr)}
                                            activeOpacity={0.75}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center',
                                                padding: 14, borderRadius: 14, marginBottom: 8,
                                                backgroundColor: theme.colors.background,
                                            }}
                                        >
                                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                <Ionicons name={addr.priority === 1 ? 'home' : 'location'} size={18} color={theme.colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text }}>{addr.addressName}</Text>
                                                {addr.displayName ? (
                                                    <Text style={{ fontSize: 13, color: theme.colors.subtext }} numberOfLines={1}>{addr.displayName}</Text>
                                                ) : null}
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={theme.colors.subtext} />
                                        </TouchableOpacity>
                                    ))}
                                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 12 }} />
                                </>
                            ) : null}

                            {/* Pick on map */}
                            <TouchableOpacity
                                onPress={() => setUserStep('map')}
                                activeOpacity={0.85}
                                style={{
                                    backgroundColor: validAddresses.length > 0 ? theme.colors.background : theme.colors.primary,
                                    paddingVertical: 15, borderRadius: 14,
                                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                                    gap: 8,
                                    borderWidth: validAddresses.length > 0 ? 1 : 0,
                                    borderColor: theme.colors.border,
                                }}
                            >
                                <Ionicons name="map-outline" size={20} color={validAddresses.length > 0 ? theme.colors.text : '#fff'} />
                                <Text style={{ color: validAddresses.length > 0 ? theme.colors.text : '#fff', fontWeight: '700', fontSize: 15 }}>
                                    {validAddresses.length > 0 ? 'Pick a different location' : 'Pick location on map'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                )}

                {/* ── STEP: map ────────────────────────────── */}
                {step === 'map' && (
                    <View style={{ flex: 1 }}>
                        {/* Header */}
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 12, paddingTop: insets.top + 8, paddingBottom: 12,
                            backgroundColor: theme.colors.card, gap: 8,
                        }}>
                            <TouchableOpacity onPress={() => setUserStep(validAddresses.length > 0 ? 'choice' : 'addresses')} style={{ padding: 4 }}>
                                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.text, flex: 1 }}>
                                Choose your location
                            </Text>
                        </View>

                        {/* Map */}
                        <View style={{ flex: 1 }}>
                            <MapLibreGL.MapView
                                ref={mapRef}
                                style={StyleSheet.absoluteFillObject}
                                styleURL="mapbox://styles/mapbox/dark-v11"
                                logoEnabled={false}
                                attributionEnabled={false}
                                scaleBarEnabled={false}
                                compassEnabled={false}
                                pitchEnabled={false}
                                rotateEnabled={false}
                                onRegionWillChange={() => {
                                    regionSettleTokenRef.current += 1;
                                    setIsDragging(true);
                                    setIsMapInMotion(true);
                                    setPickedAddress('');
                                    setGeocodedCoord(null);
                                    setIsReverseGeocoding(false);
                                    if (geocodeDebounceRef.current) {
                                        clearTimeout(geocodeDebounceRef.current);
                                        geocodeDebounceRef.current = null;
                                    }
                                    if (geocodeAbortRef.current) {
                                        geocodeAbortRef.current.abort();
                                        geocodeAbortRef.current = null;
                                    }
                                }}
                                onRegionDidChange={handleRegionDidChange}
                            >
                                <MapLibreGL.Camera
                                    ref={cameraRef}
                                    defaultSettings={{ centerCoordinate: [21.4694, 42.4629], zoomLevel: 14 }}
                                    maxBounds={zoneBounds}
                                />

                                {zoneFillFeature ? (
                                    <MapLibreGL.ShapeSource id="delivery-zone-mask-source" shape={zoneFillFeature}>
                                        <MapLibreGL.FillLayer
                                            id="delivery-zone-mask-layer"
                                            style={{
                                                fillColor: '#000000',
                                                fillOpacity: 0.45,
                                            }}
                                        />
                                    </MapLibreGL.ShapeSource>
                                ) : null}

                                {zoneOutlineFeature ? (
                                    <MapLibreGL.ShapeSource id="delivery-zone-outline-source" shape={zoneOutlineFeature}>
                                        <MapLibreGL.LineLayer
                                            id="delivery-zone-outline-layer"
                                            style={{
                                                lineColor: '#22C55E',
                                                lineWidth: 2,
                                                lineOpacity: 0.95,
                                            }}
                                        />
                                    </MapLibreGL.ShapeSource>
                                ) : null}
                            </MapLibreGL.MapView>

                            {/* Fixed centre pin */}
                            <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{ width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)', marginTop: isDragging ? 36 : 28 }} />
                                <View style={{ position: 'absolute', alignItems: 'center', transform: [{ translateY: isDragging ? -22 : -14 }] }}>
                                    <View style={{
                                        width: 28, height: 28, borderRadius: 14,
                                        backgroundColor: isDragging ? '#fff' : theme.colors.primary,
                                        borderWidth: 3,
                                        borderColor: isDragging ? theme.colors.primary : '#fff',
                                        ...styles.pinShadow,
                                    }} />
                                    <View style={{ width: 4, height: 10, backgroundColor: isDragging ? theme.colors.primary : '#fff', marginTop: -2 }} />
                                    <View style={{
                                        width: 0, height: 0,
                                        borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
                                        borderLeftColor: 'transparent', borderRightColor: 'transparent',
                                        borderTopColor: isDragging ? theme.colors.primary : '#fff',
                                        marginTop: -1,
                                    }} />
                                </View>
                            </View>

                            {/* Address bubble */}
                            {pickedAddress ? (
                                <View pointerEvents="none" style={{
                                    position: 'absolute', top: 16, left: 16, right: 16,
                                    backgroundColor: theme.colors.card + 'F2',
                                    borderRadius: 12, padding: 12, ...styles.cardShadow,
                                }}>
                                    <Text style={{ fontSize: 13, color: theme.colors.text }} numberOfLines={2}>{pickedAddress}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Confirm button */}
                        <View style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.colors.card }}>
                            <TouchableOpacity
                                onPress={handleConfirmLocation}
                                disabled={
                                    !pickedCoord ||
                                    isDragging ||
                                    isReverseGeocoding ||
                                    !pickedAddress.trim() ||
                                    !isPickedWithinDeliveryZone ||
                                    !geocodedCoord ||
                                    Math.abs((pickedCoord?.latitude ?? 0) - (geocodedCoord?.latitude ?? 0)) >= 0.0001 ||
                                    Math.abs((pickedCoord?.longitude ?? 0) - (geocodedCoord?.longitude ?? 0)) >= 0.0001
                                }
                                activeOpacity={0.85}
                                style={{
                                    backgroundColor: (
                                        !pickedCoord ||
                                        isDragging ||
                                        isReverseGeocoding ||
                                        !pickedAddress.trim() ||
                                        !isPickedWithinDeliveryZone ||
                                        !geocodedCoord ||
                                        Math.abs((pickedCoord?.latitude ?? 0) - (geocodedCoord?.latitude ?? 0)) >= 0.0001 ||
                                        Math.abs((pickedCoord?.longitude ?? 0) - (geocodedCoord?.longitude ?? 0)) >= 0.0001
                                    )
                                        ? theme.colors.border
                                        : theme.colors.primary,
                                    paddingVertical: 15, borderRadius: 14, alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                                    {isDragging
                                        ? 'Drop pin to confirm'
                                        : isReverseGeocoding
                                            ? 'Finding address...'
                                            : 'Confirm this location'}
                                </Text>
                            </TouchableOpacity>
                            {!isPickedWithinDeliveryZone && (
                                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#F97316' }}>
                                    {t.cart.outside_zone_inline_warning}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* ── STEP: save-prompt ────────────────────── */}
                {step === 'save-prompt' && (
                    <Pressable onPress={() => {}}>
                        <View style={{
                            backgroundColor: theme.colors.card,
                            borderTopLeftRadius: 24, borderTopRightRadius: 24,
                            paddingHorizontal: 24, paddingTop: 24,
                            paddingBottom: Math.max(insets.bottom, 24),
                        }}>
                            {/* Drag handle */}
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
                            </View>

                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Ionicons name="bookmark-outline" size={28} color={theme.colors.primary} />
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 6 }}>
                                    Save this address?
                                </Text>
                                {pickedAddress ? (
                                    <Text style={{ fontSize: 14, color: theme.colors.subtext, textAlign: 'center', lineHeight: 20 }} numberOfLines={2}>
                                        {pickedAddress}
                                    </Text>
                                ) : null}
                            </View>

                            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>
                                Label
                            </Text>
                            <TextInput
                                value={saveLabel}
                                onChangeText={setSaveLabel}
                                placeholder="e.g. Home, Work, Mum's place"
                                placeholderTextColor={theme.colors.subtext}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 12,
                                    borderRadius: 12, backgroundColor: theme.colors.background,
                                    borderWidth: 1, borderColor: theme.colors.border,
                                    color: theme.colors.text, fontSize: 15, marginBottom: 20,
                                }}
                            />

                            <TouchableOpacity
                                onPress={handleSaveAddress}
                                disabled={saving}
                                activeOpacity={0.85}
                                style={{ backgroundColor: theme.colors.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save address</Text>
                                }
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleContinueWithoutSaving}
                                activeOpacity={0.7}
                                style={{ paddingVertical: 14, alignItems: 'center' }}
                            >
                                <Text style={{ color: theme.colors.subtext, fontSize: 15 }}>
                                    Continue without saving
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                )}

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    pinShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});
