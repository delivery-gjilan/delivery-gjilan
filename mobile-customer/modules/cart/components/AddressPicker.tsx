import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    ActivityIndicator, Keyboard, Platform, StyleSheet,
    LayoutAnimation, UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapLibreGL } from '@/components/MapWrapper.native';
import * as Location from 'expo-location';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    Easing, FadeIn, FadeOut,
    SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import type { UserAddress } from '@/gql/graphql';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Mapbox Geocoding ───────────────────────────────────────
const MAPBOX_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
    '';

// Gjilan/Kosovo bounding box for proximity
const GJILAN_BBOX = '20.9,42.3,21.7,42.7';
const GJILAN_CENTER = { latitude: 42.4629, longitude: 21.4694 };

interface GeocodingFeature {
    id: string;
    place_name: string;
    text: string;
    center: [number, number]; // [lng, lat]
    context?: Array<{ id: string; text: string }>;
    properties?: { address?: string; category?: string };
}

let searchAbortController: AbortController | null = null;

async function searchPlaces(query: string): Promise<GeocodingFeature[]> {
    if (!query.trim() || query.length < 2) return [];

    // Cancel previous request
    if (searchAbortController) searchAbortController.abort();
    searchAbortController = new AbortController();

    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
            `access_token=${MAPBOX_TOKEN}` +
            `&proximity=${GJILAN_CENTER.longitude},${GJILAN_CENTER.latitude}` +
            `&bbox=${GJILAN_BBOX}` +
            `&limit=5` +
            `&types=address,poi,place,locality,neighborhood` +
            `&language=en,sq`;

        const res = await fetch(url, { signal: searchAbortController.signal });
        if (!res.ok) return [];
        const data = await res.json();
        return data.features ?? [];
    } catch {
        return [];
    }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
            `access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi,place&language=en,sq`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data.features?.[0]?.place_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
        // Fallback to expo-location
        try {
            const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (result) {
                const parts = [result.street, result.name, result.city].filter(Boolean);
                return parts.join(', ') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        } catch { /* ignore */ }
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// ─── Mapbox Style ───────────────────────────────────────────
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

// ─── Props ──────────────────────────────────────────────────
export interface SelectedAddress {
    latitude: number;
    longitude: number;
    address: string;
    label?: string;
    addressId?: number | string;
}

interface AddressPickerProps {
    visible: boolean;
    savedAddresses: UserAddress[];
    initialLocation?: SelectedAddress | null;
    onSelect: (address: SelectedAddress) => void;
    onClose: () => void;
    /** When true, skip SafeAreaView wrapper (parent handles insets) */
    embedded?: boolean;
}

// ─── Centered Pin (Fixed Position) ─────────────────────────
const CenteredPin = ({ elevated }: { elevated: boolean }) => {
    const opacity = useSharedValue(1);

    useEffect(() => {
        opacity.value = withTiming(elevated ? 0.5 : 1, { 
            duration: 150, 
            easing: Easing.inOut(Easing.ease) 
        });
    }, [elevated]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }) as any);

    return (
        <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}>
            {/* Pin body */}
            <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: '#7C3AED',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
            }}>
                <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: 'white',
                }} />
            </View>
            {/* Pin tail */}
            <View style={{
                width: 2, height: 10,
                backgroundColor: '#7C3AED',
                marginTop: -1,
            }} />
            {/* Shadow */}
            <View style={{
                width: 12, height: 3, borderRadius: 6,
                backgroundColor: '#00000015',
                marginTop: 1,
            }} />
        </Animated.View>
    );
};

// ─── Main Component ─────────────────────────────────────────
export default function AddressPicker({
    visible,
    savedAddresses,
    initialLocation,
    onSelect,
    onClose,
    embedded = false,
}: AddressPickerProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchInputRef = useRef<TextInput>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Map state
    const [mapCenter, setMapCenter] = useState<[number, number]>([
        initialLocation?.longitude ?? GJILAN_CENTER.longitude,
        initialLocation?.latitude ?? GJILAN_CENTER.latitude,
    ]);
    const [pinLocation, setPinLocation] = useState<{ latitude: number; longitude: number } | null>(
        initialLocation ? { latitude: initialLocation.latitude, longitude: initialLocation.longitude } : null
    );
    const [pinAddress, setPinAddress] = useState(initialLocation?.address ?? '');
    const [reverseLoading, setReverseLoading] = useState(false);
    const [locatingCurrent, setLocatingCurrent] = useState(false);

    // Bottom card state
    const [showSavedAddresses, setShowSavedAddresses] = useState(false);

    // Pin animation state
    const [pinElevated, setPinElevated] = useState(false);
    const geocodeAbortRef = useRef<AbortController | null>(null);
    const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);
    const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const buttonEnableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTouchingMapRef = useRef(false);
    const mapDidMoveRef = useRef(false);

    // Reset when opened
    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            setSearchResults([]);
            setShowResults(false);
            setShowSavedAddresses(false);
            if (initialLocation) {
                setPinLocation({ latitude: initialLocation.latitude, longitude: initialLocation.longitude });
                setPinAddress(initialLocation.address);
                setMapCenter([initialLocation.longitude, initialLocation.latitude]);
                lastGeocodedPos.current = { lat: initialLocation.latitude, lng: initialLocation.longitude };
            } else {
                setPinLocation(null);
                setPinAddress('');
                lastGeocodedPos.current = null;
            }
        } else {
            // Cleanup on close
            if (geocodeAbortRef.current) {
                geocodeAbortRef.current.abort();
                geocodeAbortRef.current = null;
            }
            if (geocodeDebounceRef.current) {
                clearTimeout(geocodeDebounceRef.current);
                geocodeDebounceRef.current = null;
            }
            if (buttonEnableTimeoutRef.current) {
                clearTimeout(buttonEnableTimeoutRef.current);
                buttonEnableTimeoutRef.current = null;
            }
            isTouchingMapRef.current = false;
            mapDidMoveRef.current = false;
        }
    }, [visible]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
            if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            if (buttonEnableTimeoutRef.current) clearTimeout(buttonEnableTimeoutRef.current);
        };
    }, []);

    // Debounced search
    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (text.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setShowResults(true);
        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchPlaces(text);
            setSearchResults(results);
            setSearching(false);
        }, 350);
    }, []);

    // Select from search results
    const handleSelectSearchResult = useCallback(async (feature: GeocodingFeature) => {
        Keyboard.dismiss();
        const [lng, lat] = feature.center;
        const newLocation = { latitude: lat, longitude: lng };

        setPinLocation(newLocation);
        setPinAddress(feature.place_name);
        setSearchQuery(feature.text);
        setShowResults(false);
        lastGeocodedPos.current = { lat, lng: lng }; // Mark as geocoded

        cameraRef.current?.setCamera({
            centerCoordinate: [lng, lat],
            zoomLevel: 16,
            animationDuration: 600,
        });
    }, []);

    // Map tap
    const handleMapPress = useCallback(async (event: any) => {
        Keyboard.dismiss();
        setShowResults(false);
        setShowSavedAddresses(false);
        // Note: Pin stays centered, so we'll update location on region change instead
    }, []);

    // Use current location
    const handleUseCurrentLocation = useCallback(async () => {
        setLocatingCurrent(true);
        Keyboard.dismiss();
        setShowResults(false);
        setShowSavedAddresses(false);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocatingCurrent(false);
                return;
            }

            let current: Location.LocationObject | null = null;
            try {
                current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            } catch {
                current = await Location.getLastKnownPositionAsync();
            }

            if (!current) {
                setLocatingCurrent(false);
                return;
            }

            const { latitude, longitude } = current.coords;
            const newLocation = { latitude, longitude };
            setPinLocation(newLocation);
            lastGeocodedPos.current = { lat: latitude, lng: longitude }; // Mark as geocoded

            cameraRef.current?.setCamera({
                centerCoordinate: [longitude, latitude],
                zoomLevel: 16,
                animationDuration: 600,
            });

            const address = await reverseGeocode(latitude, longitude);
            setPinAddress(address);
            setSearchQuery('');
        } catch { /* ignore */ }
        setLocatingCurrent(false);
    }, []);

    // Select saved address
    const handleSelectSaved = useCallback((addr: UserAddress) => {
        const newLocation = { latitude: addr.latitude, longitude: addr.longitude };
        setPinLocation(newLocation);
        setPinAddress(addr.displayName);
        setSearchQuery('');
        setShowSavedAddresses(false);
        setShowResults(false);
        lastGeocodedPos.current = { lat: addr.latitude, lng: addr.longitude }; // Mark as geocoded

        cameraRef.current?.setCamera({
            centerCoordinate: [addr.longitude, addr.latitude],
            zoomLevel: 16,
            animationDuration: 600,
        });
    }, []);

    // Confirm selection
    const handleConfirm = useCallback(() => {
        if (!pinLocation) return;

        // Check if this matches a saved address
        const matchedSaved = savedAddresses.find(
            a => Math.abs(a.latitude - pinLocation.latitude) < 0.0001 &&
                Math.abs(a.longitude - pinLocation.longitude) < 0.0001
        );

        onSelect({
            latitude: pinLocation.latitude,
            longitude: pinLocation.longitude,
            address: pinAddress || `${pinLocation.latitude.toFixed(6)}, ${pinLocation.longitude.toFixed(6)}`,
            label: matchedSaved?.addressName ?? undefined,
            addressId: matchedSaved?.id ?? undefined,
        });
    }, [pinLocation, pinAddress, savedAddresses, onSelect]);

    if (!visible) return null;

    const getAddressIcon = (name: string): keyof typeof Ionicons.glyphMap => {
        const lower = name.toLowerCase();
        if (lower.includes('home') || lower.includes('shtepi') || lower.includes('shtëpi')) return 'home';
        if (lower.includes('work') || lower.includes('office') || lower.includes('pun')) return 'briefcase';
        return 'location';
    };

    const Wrapper = embedded ? View : SafeAreaView;
    const wrapperStyle = embedded ? { flex: 1 as const } : { flex: 1 as const, backgroundColor: theme.colors.background };
    const searchTop = embedded ? 8 : insets.top + 8;
    const dropdownTop = embedded ? 64 : insets.top + 64;

    return (
        <View style={embedded ? { flex: 1 } : StyleSheet.absoluteFill}>
            <Wrapper style={wrapperStyle}>
                {/* ─── Map ─────────────────────────────── */}
                <View 
                    style={{ flex: 1 }}
                    onStartShouldSetResponder={() => {
                        // User touches map - disable button and mark as touching
                        isTouchingMapRef.current = true;
                        mapDidMoveRef.current = false; // Reset movement flag
                        setPinElevated(true);
                        if (buttonEnableTimeoutRef.current) clearTimeout(buttonEnableTimeoutRef.current);
                        return true; // Capture touch to get release event
                    }}
                    onResponderRelease={() => {
                        // User released finger from map
                        isTouchingMapRef.current = false;
                        
                        // If map didn't move, re-enable button immediately
                        if (!mapDidMoveRef.current && !reverseLoading) {
                            setPinElevated(false);
                        } else if (mapDidMoveRef.current) {
                            // Map did move - trigger a check after a brief delay 
                            // in case onRegionDidChange already fired while finger was down
                            setTimeout(() => {
                                // If button is still disabled and not currently geocoding,
                                // force a region check to trigger geocoding
                                if (pinElevated && !reverseLoading && mapRef.current) {
                                    mapRef.current.getCenter().then((coords: any) => {
                                        if (coords) {
                                            // Simulate region change to trigger geocoding
                                            const event = {
                                                geometry: {
                                                    coordinates: [coords[0], coords[1]]
                                                }
                                            };
                                            // Manually call the geocoding logic
                                            const [longitude, latitude] = coords;
                                            const last = lastGeocodedPos.current;
                                            if (last) {
                                                const latDiff = Math.abs(latitude - last.lat);
                                                const lngDiff = Math.abs(longitude - last.lng);
                                                if (latDiff < 0.0001 && lngDiff < 0.0001) {
                                                    setPinElevated(false);
                                                    return;
                                                }
                                            }
                                            
                                            setPinLocation({ latitude, longitude });
                                            setReverseLoading(true);
                                            
                                            setTimeout(async () => {
                                                if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
                                                const controller = new AbortController();
                                                geocodeAbortRef.current = controller;
                                                lastGeocodedPos.current = { lat: latitude, lng: longitude };
                                                try {
                                                    const address = await reverseGeocode(latitude, longitude);
                                                    if (!controller.signal.aborted) {
                                                        setPinAddress(address);
                                                        setSearchQuery('');
                                                    }
                                                } catch {
                                                    // ignore
                                                } finally {
                                                    if (!controller.signal.aborted) {
                                                        setReverseLoading(false);
                                                        buttonEnableTimeoutRef.current = setTimeout(() => {
                                                            setPinElevated(false);
                                                        }, 50);
                                                    }
                                                }
                                            }, 50);
                                        }
                                    }).catch(() => {
                                        // If getCenter fails, just re-enable button
                                        setPinElevated(false);
                                    });
                                }
                            }, 100);
                        }
                    }}
                >
                    <MapLibreGL.MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFill}
                        styleURL={MAPBOX_STYLE}
                        onPress={handleMapPress}
                        onRegionWillChange={() => {
                            // Map started moving — lift pin, cancel any in-flight geocode
                            mapDidMoveRef.current = true; // Mark that map moved
                            setPinElevated(true);
                            if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
                            if (buttonEnableTimeoutRef.current) clearTimeout(buttonEnableTimeoutRef.current);
                        }}
                        onRegionDidChange={async (feature: any) => {
                            // Map stopped moving
                            const coords = feature?.geometry?.coordinates;
                            if (!coords) return;
                            const [longitude, latitude] = coords;
                            
                            // Clear any pending button enable timeout (from tap without drag)
                            if (buttonEnableTimeoutRef.current) clearTimeout(buttonEnableTimeoutRef.current);
                            
                            // Region settled — the finger must be off the map (or momentum ended).
                            // Always reset the touch flag here; relying on onResponderRelease is
                            // unreliable because the native map view eats the gesture before the
                            // React responder system sees the release event.
                            isTouchingMapRef.current = false;
                            
                            // Check if position changed significantly (>10 meters ~= 0.0001 degrees)
                            const last = lastGeocodedPos.current;
                            if (last) {
                                const latDiff = Math.abs(latitude - last.lat);
                                const lngDiff = Math.abs(longitude - last.lng);
                                if (latDiff < 0.0001 && lngDiff < 0.0001) {
                                    // Position barely changed, don't geocode
                                    // But keep button disabled briefly to prevent accidental taps
                                    buttonEnableTimeoutRef.current = setTimeout(() => setPinElevated(false), 200);
                                    return;
                                }
                            }

                            // Clear any pending debounce
                            if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);

                            // Keep button disabled during entire geocoding process
                            setPinLocation({ latitude, longitude });
                            setReverseLoading(true);

                            // Small debounce to batch rapid events while staying responsive
                            geocodeDebounceRef.current = setTimeout(async () => {
                                // Abort previous geocode if still running
                                if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
                                const controller = new AbortController();
                                geocodeAbortRef.current = controller;

                                // Store this position as the last geocoded
                                lastGeocodedPos.current = { lat: latitude, lng: longitude };
                                try {
                                    const address = await reverseGeocode(latitude, longitude);
                                    if (!controller.signal.aborted) {
                                        setPinAddress(address);
                                        setSearchQuery('');
                                    }
                                } catch {
                                    // ignore aborted / failed
                                } finally {
                                    if (!controller.signal.aborted) {
                                        setReverseLoading(false);
                                        // Keep button disabled for 50ms after geocoding completes
                                        buttonEnableTimeoutRef.current = setTimeout(() => {
                                            setPinElevated(false);
                                        }, 50);
                                    }
                                }
                            }, 50); // 50ms debounce - faster response while still batching events
                        }}
                        logoEnabled={false}
                        attributionEnabled={false}
                        scaleBarEnabled={false}
                        compassEnabled={false}
                        zoomEnabled={true}
                        scrollEnabled={true}
                        pitchEnabled={false}
                        rotateEnabled={false}
                    >
                        <MapLibreGL.Camera
                            ref={cameraRef}
                            defaultSettings={{
                                centerCoordinate: mapCenter,
                                zoomLevel: 15,
                            }}
                        />
                    </MapLibreGL.MapView>

                    {/* ─── Fixed Center Pin ──────────────── */}
                    <View style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginLeft: -12,
                        marginTop: -37,
                        pointerEvents: 'none',
                    }}>
                        <CenteredPin elevated={pinElevated} />
                    </View>

                    {/* ─── Search Bar Overlay ────────────── */}
                    <View style={[styles.searchContainer, { top: searchTop }]}>
                        {/* Search Input */}
                        <View style={[styles.searchBar, {
                            backgroundColor: theme.colors.card,
                            borderColor: showResults ? '#7C3AED' : 'transparent',
                            flex: 1,
                        }]}>
                            <Ionicons name="search" size={18} color={theme.colors.subtext} />
                            <TextInput
                                ref={searchInputRef}
                                style={[styles.searchInput, { color: theme.colors.text }]}
                                placeholder={t.cart.search_address ?? "Search street, place..."}
                                placeholderTextColor={theme.colors.subtext}
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setSearchQuery('');
                                        setSearchResults([]);
                                        setShowResults(false);
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close-circle" size={18} color={theme.colors.subtext} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ─── Search Results Dropdown ───────── */}
                    {showResults && (
                        <View style={[styles.resultsDropdown, {
                            top: dropdownTop,
                            backgroundColor: theme.colors.card,
                        }]}>
                            {/* Current Location option */}
                            <TouchableOpacity
                                style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                                onPress={handleUseCurrentLocation}
                                activeOpacity={0.6}
                            >
                                <View style={[styles.resultIcon, { backgroundColor: '#7C3AED15' }]}>
                                    {locatingCurrent ? (
                                        <ActivityIndicator size="small" color="#7C3AED" />
                                    ) : (
                                        <Ionicons name="navigate" size={18} color="#7C3AED" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.resultTitle, { color: '#7C3AED' }]}>
                                        {t.cart.use_current_address}
                                    </Text>
                                    <Text style={[styles.resultSubtitle, { color: theme.colors.subtext }]}>
                                        {t.cart.use_gps ?? "Use GPS location"}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {searching ? (
                                <View style={styles.searchingContainer}>
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                    <Text style={[styles.searchingText, { color: theme.colors.subtext }]}>
                                        Searching...
                                    </Text>
                                </View>
                            ) : searchResults.length > 0 ? (
                                <FlatList
                                    data={searchResults}
                                    keyExtractor={(item) => item.id}
                                    keyboardShouldPersistTaps="handled"
                                    style={{ maxHeight: 240 }}
                                    renderItem={({ item }) => {
                                        const context = item.context?.map(c => c.text).join(', ') ?? '';
                                        return (
                                            <TouchableOpacity
                                                style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                                                onPress={() => handleSelectSearchResult(item)}
                                                activeOpacity={0.6}
                                            >
                                                <View style={[styles.resultIcon, { backgroundColor: theme.colors.background }]}>
                                                    <Ionicons name="location-outline" size={18} color={theme.colors.subtext} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                                        {item.text}
                                                    </Text>
                                                    {context ? (
                                                        <Text style={[styles.resultSubtitle, { color: theme.colors.subtext }]} numberOfLines={1}>
                                                            {context}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            ) : searchQuery.length >= 2 ? (
                                <View style={styles.noResults}>
                                    <Text style={[styles.noResultsText, { color: theme.colors.subtext }]}>
                                        No results found
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                </View>

                {/* ─── Bottom Card ─────────────────────── */}
                <View style={[styles.bottomCard, { backgroundColor: theme.colors.card }]}>
                    {/* Drag handle */}
                    <View style={styles.handle}>
                        <View style={[styles.handleBar, { backgroundColor: theme.colors.border }]} />
                    </View>

                    {/* Saved Addresses Toggle */}
                    {savedAddresses.length > 0 && !pinLocation && (
                        <TouchableOpacity
                            style={[styles.savedToggle, { borderColor: theme.colors.border }]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setShowSavedAddresses(!showSavedAddresses);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Ionicons name="bookmark" size={18} color="#7C3AED" />
                                <Text style={[styles.savedToggleText, { color: theme.colors.text }]}>
                                    {t.cart.saved_addresses ?? "Saved Addresses"}
                                </Text>
                                <View style={[styles.badge, { backgroundColor: '#7C3AED' }]}>
                                    <Text style={styles.badgeText}>{savedAddresses.length}</Text>
                                </View>
                            </View>
                            <Ionicons
                                name={showSavedAddresses ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={theme.colors.subtext}
                            />
                        </TouchableOpacity>
                    )}

                    {/* Saved Addresses List */}
                    {showSavedAddresses && savedAddresses.length > 0 && (
                        <View style={{ maxHeight: 160, marginBottom: 8 }}>
                            <FlatList
                                data={savedAddresses}
                                keyExtractor={(item) => String(item.id)}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const isDefault = item.priority === 1;
                                    return (
                                        <TouchableOpacity
                                            style={[styles.savedItem, {
                                                backgroundColor: theme.colors.background,
                                                borderColor: theme.colors.border,
                                            }]}
                                            onPress={() => handleSelectSaved(item)}
                                            activeOpacity={0.6}
                                        >
                                            <View style={[styles.savedIcon, { backgroundColor: '#7C3AED15' }]}>
                                                <Ionicons
                                                    name={getAddressIcon(item.addressName)}
                                                    size={18}
                                                    color="#7C3AED"
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={[styles.savedName, { color: theme.colors.text }]}>
                                                        {item.addressName}
                                                    </Text>
                                                    {isDefault && (
                                                        <View style={[styles.defaultBadge, { backgroundColor: '#7C3AED20' }]}>
                                                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#7C3AED' }}>
                                                                {t.common.default}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={[styles.savedAddr, { color: theme.colors.subtext }]} numberOfLines={1}>
                                                    {item.displayName}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} />
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    )}

                    {/* Selected Pin Details */}
                    {pinLocation ? (
                        <View>
                            <View style={[styles.selectedContainer, { backgroundColor: theme.colors.background }]}>
                                <View style={[styles.selectedDot, { backgroundColor: '#7C3AED' }]} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.selectedLabel, { color: theme.colors.text }]}>
                                            {t.cart.deliver_here ?? "Deliver here"}
                                        </Text>
                                        {reverseLoading && (
                                            <ActivityIndicator size="small" color="#7C3AED" />
                                        )}
                                    </View>
                                    <Text style={[styles.selectedAddress, { color: theme.colors.subtext, minHeight: 36 }]} numberOfLines={2}>
                                        {pinAddress || (t.cart.finding_address ?? "Finding address...")}
                                    </Text>
                                </View>
                            </View>

                            {/* Confirm Button */}
                            <TouchableOpacity
                                style={[styles.confirmBtn, {
                                    backgroundColor: (reverseLoading || pinElevated) ? theme.colors.border : '#7C3AED',
                                }]}
                                onPress={handleConfirm}
                                disabled={reverseLoading || pinElevated}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text style={styles.confirmText}>
                                    {t.cart.confirm_address ?? "Confirm Address"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Empty State - prompt to select */
                        <View style={styles.emptyPrompt}>
                            <Ionicons name="location-outline" size={28} color={theme.colors.subtext} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                {t.cart.tap_to_select ?? "Tap on the map or search"}
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: theme.colors.subtext }]}>
                                {t.cart.tap_to_select_subtitle ?? "Choose where you want your order delivered"}
                            </Text>
                        </View>
                    )}
                </View>
            </Wrapper>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    searchContainer: {
        position: 'absolute',
        left: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    searchBar: {
        flex: 1, height: 44, borderRadius: 22,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
        borderWidth: 2,
    },
    searchInput: {
        flex: 1, fontSize: 15, paddingVertical: 0,
    },
    resultsDropdown: {
        position: 'absolute',
        left: 12, right: 12,
        borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
        overflow: 'hidden',
        zIndex: 11,
    },
    resultItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    resultIcon: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    resultTitle: {
        fontSize: 14, fontWeight: '600',
    },
    resultSubtitle: {
        fontSize: 12, marginTop: 1,
    },
    searchingContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 16, gap: 8,
    },
    searchingText: {
        fontSize: 13,
    },
    noResults: {
        padding: 20, alignItems: 'center',
    },
    noResultsText: {
        fontSize: 13,
    },
    bottomCard: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 16, paddingBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 12,
    },
    handle: {
        alignItems: 'center', paddingVertical: 10,
    },
    handleBar: {
        width: 36, height: 4, borderRadius: 2,
    },
    savedToggle: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1,
        marginBottom: 8,
    },
    savedToggleText: {
        fontSize: 14, fontWeight: '600', marginLeft: 8, flex: 1,
    },
    badge: {
        width: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 4,
    },
    badgeText: {
        color: 'white', fontSize: 11, fontWeight: '700',
    },
    savedItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 10, borderRadius: 10,
        marginBottom: 6, gap: 10,
        borderWidth: 1,
    },
    savedIcon: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    savedName: {
        fontSize: 14, fontWeight: '600',
    },
    savedAddr: {
        fontSize: 12, marginTop: 1,
    },
    defaultBadge: {
        paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
    },
    selectedContainer: {
        flexDirection: 'row', alignItems: 'flex-start',
        padding: 12, borderRadius: 12, gap: 10,
        marginBottom: 12,
    },
    selectedDot: {
        width: 10, height: 10, borderRadius: 5,
        marginTop: 4,
    },
    selectedLabel: {
        fontSize: 15, fontWeight: '700',
    },
    selectedAddress: {
        fontSize: 13, marginTop: 2, lineHeight: 18,
    },
    selectedLoading: {
        fontSize: 13,
    },
    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 52, borderRadius: 16, gap: 8,
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    confirmText: {
        color: 'white', fontSize: 16, fontWeight: '700',
    },
    emptyPrompt: {
        alignItems: 'center', paddingVertical: 16, gap: 4,
    },
    emptyTitle: {
        fontSize: 15, fontWeight: '600', marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 13, textAlign: 'center',
    },
});
