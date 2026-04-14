"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { MapPin, Crosshair, Search, Loader2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "@/localization";
import { isPointInPolygon } from "@/lib/pointInPolygon";
import { useQuery } from "@apollo/client/react";
import { GET_SERVICE_ZONES } from "@/graphql/operations/serviceZone";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const GJILAN_CENTER = { latitude: 42.4604, longitude: 21.4694 };
const MIN_GEOCODE_DELTA = 0.00003;
// Hard fallback bounds for Gjilan (used before zones load)
const FALLBACK_BOUNDS: [[number, number], [number, number]] = [[21.3, 42.35], [21.65, 42.6]];

type ZonePolygon = Array<{ lat: number; lng: number }>;

interface AddressPickerMapProps {
    onSelect: (location: { latitude: number; longitude: number; address: string; label?: string }) => void;
    initialLocation?: { latitude: number; longitude: number } | null;
}

async function geocodeReverse(lat: number, lng: number, signal?: AbortSignal): Promise<string> {
    const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi,place&language=en,sq`,
        signal ? { signal } : undefined
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.features?.[0]?.place_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export default function AddressPickerMap({ onSelect, initialLocation }: AddressPickerMapProps) {
    const { t } = useTranslations();
    const mapRef = useRef<MapRef>(null);

    // ── Zone data ─────────────────────────────────────────
    const { data: zonesData } = useQuery(GET_SERVICE_ZONES, { fetchPolicy: "cache-and-network" });
    const serviceZones = useMemo<Array<{ polygon: ZonePolygon }>>(() => {
        const activeZones = ((zonesData as any)?.deliveryZones ?? []).filter((z: any) => z.isActive);
        const svcZones = activeZones.filter((z: any) => z.isServiceZone === true);
        return svcZones.length > 0 ? svcZones : activeZones;
    }, [zonesData]);

    /** Tight bounds from zone polygon — same algorithm as mobile AddressPicker */
    const zoneBounds = useMemo<[[number, number], [number, number]] | null>(() => {
        if (serviceZones.length === 0) return null;
        const points = serviceZones.flatMap((z) => z.polygon);
        if (points.length === 0) return null;
        const lngs = points.map((p) => p.lng);
        const lats = points.map((p) => p.lat);
        const pad = 0.02;
        return [
            [Math.min(...lngs) - pad, Math.min(...lats) - pad],
            [Math.max(...lngs) + pad, Math.max(...lats) + pad],
        ];
    }, [serviceZones]);

    // ── Map state ──────────────────────────────────────────
    const [pin, setPin] = useState(initialLocation ?? GJILAN_CENTER);
    const [geocodedLocation, setGeocodedLocation] = useState<typeof pin | null>(initialLocation ?? null);
    const [address, setAddress] = useState("");
    const [hasResolvedAddress, setHasResolvedAddress] = useState(false);
    const [isMapMoving, setIsMapMoving] = useState(false);
    const [reversingGeocode, setReversingGeocode] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locating, setLocating] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Debounce / abort refs (mirrors mobile pattern)
    const geocodeAbortRef = useRef<AbortController | null>(null);
    const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const settleTokenRef = useRef(0);
    const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Zone GeoJSON overlays ──────────────────────────────
    const zoneFillGeoJSON = useMemo<GeoJSON.FeatureCollection | null>(() => {
        if (serviceZones.length === 0) return null;
        const rings = serviceZones
            .map((z) => z.polygon.map((p) => [p.lng, p.lat] as [number, number]))
            .filter((r) => r.length >= 3)
            .map((r) => {
                const [first, last] = [r[0]!, r[r.length - 1]!];
                return first[0] !== last[0] || first[1] !== last[1] ? [...r, first] : r;
            });
        if (rings.length === 0) return null;
        return {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                properties: {},
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
                        ...rings,
                    ],
                },
            }],
        };
    }, [serviceZones]);

    const zoneOutlineGeoJSON = useMemo<GeoJSON.FeatureCollection | null>(() => {
        if (serviceZones.length === 0) return null;
        const features = serviceZones
            .map((z) => {
                const ring = z.polygon.map((p) => [p.lng, p.lat] as [number, number]);
                if (ring.length < 3) return null;
                const [first, last] = [ring[0]!, ring[ring.length - 1]!];
                const closed = first[0] !== last[0] || first[1] !== last[1] ? [...ring, first] : ring;
                return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: closed } };
            })
            .filter(Boolean) as GeoJSON.Feature[];
        return features.length ? { type: "FeatureCollection", features } : null;
    }, [serviceZones]);

    const isPinInZone = useMemo(() => {
        if (serviceZones.length === 0) return true;
        // Use geocodedLocation (confirmed position) when available; fall back to pin
        const checkPos = geocodedLocation ?? pin;
        return serviceZones.some((z) => isPointInPolygon({ lat: checkPos.latitude, lng: checkPos.longitude }, z.polygon));
    }, [pin, geocodedLocation, serviceZones]);

    // ── Map move handlers (mirrors onRegionWillChange / onRegionDidChange) ─
    const handleMoveStart = useCallback(() => {
        settleTokenRef.current += 1;
        setIsMapMoving(true);
        if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
        if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
    }, []);

    const handleMoveEnd = useCallback((e: any) => {
        const { latitude, longitude } = e.viewState;

        // Skip if position hasn't changed meaningfully
        const last = lastGeocodedRef.current;
        if (last && Math.abs(last.lat - latitude) < MIN_GEOCODE_DELTA && Math.abs(last.lng - longitude) < MIN_GEOCODE_DELTA) {
            setIsMapMoving(false);
            return;
        }

        setPin({ latitude, longitude });
        setAddress("");
        setHasResolvedAddress(false);
        setGeocodedLocation(null);
        setReversingGeocode(true);

        const token = ++settleTokenRef.current;
        if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
        geocodeDebounceRef.current = setTimeout(async () => {
            if (token !== settleTokenRef.current) return;
            if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
            const ctrl = new AbortController();
            geocodeAbortRef.current = ctrl;
            try {
                const name = await geocodeReverse(latitude, longitude, ctrl.signal);
                if (!ctrl.signal.aborted) {
                    setAddress(name);
                    setHasResolvedAddress(true);
                    setGeocodedLocation({ latitude, longitude });
                    lastGeocodedRef.current = { lat: latitude, lng: longitude };
                }
            } catch {
                if (!ctrl.signal.aborted) {
                    const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                    setAddress(fallback);
                    setHasResolvedAddress(true);
                    setGeocodedLocation({ latitude, longitude });
                    lastGeocodedRef.current = { lat: latitude, lng: longitude };
                }
            } finally {
                if (!ctrl.signal.aborted) {
                    setReversingGeocode(false);
                    setIsMapMoving(false);
                }
            }
        }, 250);
    }, []);

    const handleMapClick = useCallback((e: any) => {
        const { lng, lat } = e.lngLat;
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 400 });
    }, []);

    // ── GPS locate: flies to GPS + directly geocodes the position ─────────
    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const { latitude, longitude } = coords;
                setUserLocation({ latitude, longitude });
                mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: 600 });

                // Directly set pin + geocode — don't rely on onMoveEnd which may be skipped
                setPin({ latitude, longitude });
                setAddress("");
                setHasResolvedAddress(false);
                setGeocodedLocation(null);
                setReversingGeocode(true);
                // Clear lastGeocoded so onMoveEnd won't skip this position
                lastGeocodedRef.current = null;

                try {
                    const name = await geocodeReverse(latitude, longitude);
                    setAddress(name);
                    setHasResolvedAddress(true);
                    setGeocodedLocation({ latitude, longitude });
                    lastGeocodedRef.current = { lat: latitude, lng: longitude };
                } catch {
                    setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                    setHasResolvedAddress(true);
                    setGeocodedLocation({ latitude, longitude });
                    lastGeocodedRef.current = { lat: latitude, lng: longitude };
                } finally {
                    setReversingGeocode(false);
                    setLocating(false);
                }
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
        );
    }, []);

    // Initial setup
    useEffect(() => {
        if (initialLocation) {
            setReversingGeocode(true);
            geocodeReverse(initialLocation.latitude, initialLocation.longitude)
                .then((name) => {
                    setAddress(name);
                    setHasResolvedAddress(true);
                    setGeocodedLocation(initialLocation);
                    lastGeocodedRef.current = { lat: initialLocation.latitude, lng: initialLocation.longitude };
                })
                .catch(() => {})
                .finally(() => setReversingGeocode(false));
        } else {
            // No initial location — try GPS immediately, show loading state
            setReversingGeocode(true);
            handleLocateMe();
        }
        return () => {
            geocodeAbortRef.current?.abort();
            searchAbortRef.current?.abort();
            if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Search ─────────────────────────────────────────────
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (value.length < 2) { setSearchResults([]); setShowResults(false); return; }
        setShowResults(true);
        setSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            searchAbortRef.current?.abort();
            searchAbortRef.current = new AbortController();
            try {
                const bounds = zoneBounds
                    ? `${zoneBounds[0][0]},${zoneBounds[0][1]},${zoneBounds[1][0]},${zoneBounds[1][1]}`
                    : "21.3,42.35,21.65,42.6";
                const res = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?` +
                    `access_token=${MAPBOX_TOKEN}&proximity=${GJILAN_CENTER.longitude},${GJILAN_CENTER.latitude}` +
                    `&bbox=${bounds}&limit=5&types=address,poi,place,locality,neighborhood&language=en,sq`,
                    { signal: searchAbortRef.current.signal }
                );
                if (!res.ok) throw new Error();
                const data = await res.json();
                setSearchResults(data.features ?? []);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 350);
    }, [zoneBounds]);

    const handleSelectResult = useCallback((feature: any) => {
        const [lng, lat] = feature.center;
        setPin({ latitude: lat, longitude: lng });
        setAddress(feature.place_name);
        setHasResolvedAddress(true);
        setGeocodedLocation({ latitude: lat, longitude: lng });
        lastGeocodedRef.current = { lat, lng };
        setSearchQuery(feature.text ?? "");
        setShowResults(false);
        setSearchResults([]);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 600 });
    }, []);

    // ── Confirm (strict disable logic mirrors mobile isConfirmDisabled) ────
    const isConfirmDisabled =
        reversingGeocode ||
        isMapMoving ||
        !hasResolvedAddress ||
        !geocodedLocation ||
        !address.trim() ||
        !isPinInZone ||
        Math.abs(pin.latitude - (geocodedLocation?.latitude ?? 0)) >= 0.0001 ||
        Math.abs(pin.longitude - (geocodedLocation?.longitude ?? 0)) >= 0.0001;

    const handleConfirm = useCallback(() => {
        if (!geocodedLocation || !address) return;
        onSelect({ latitude: geocodedLocation.latitude, longitude: geocodedLocation.longitude, address });
    }, [onSelect, geocodedLocation, address]);

    const maxBounds = zoneBounds ?? FALLBACK_BOUNDS;

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] z-10" />
                    <input
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                        placeholder={t("cart.search_address")}
                        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] pl-9 pr-8 py-2 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    {searching && (
                        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--muted)]" />
                    )}
                    {!searching && searchQuery.length > 0 && (
                        <button
                            onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {showResults && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] shadow-lg max-h-52 overflow-y-auto">
                        <button
                            onClick={() => { handleLocateMe(); setShowResults(false); setSearchQuery(""); }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--background-secondary)] transition-colors border-b border-[var(--border)] text-[var(--primary)]"
                        >
                            <Crosshair size={12} className="shrink-0" />
                            <span className="font-medium">{t("address.use_my_location")}</span>
                        </button>
                        {searchResults.map((f: any) => (
                            <button
                                key={f.id}
                                onClick={() => handleSelectResult(f)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--background-secondary)] transition-colors border-b border-[var(--border)] last:border-b-0"
                            >
                                <MapPin size={12} className="shrink-0 text-[var(--muted)]" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{f.text}</p>
                                    {(f.context?.length ?? 0) > 0 && (
                                        <p className="text-xs text-[var(--muted)] truncate">{f.context.map((c: any) => c.text).join(", ")}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                        {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                            <div className="px-3 py-2.5 text-sm text-[var(--muted)]">{t("common.no_results")}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="relative rounded-[var(--radius)] overflow-hidden border border-[var(--border)]" style={{ height: "22rem" }}>
                <Map
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle={MAP_STYLE}
                    initialViewState={{ longitude: pin.longitude, latitude: pin.latitude, zoom: 14 }}
                    maxBounds={maxBounds}
                    minZoom={11}
                    onMoveStart={handleMoveStart}
                    onMoveEnd={handleMoveEnd}
                    onClick={handleMapClick}
                    style={{ width: "100%", height: "100%" }}
                >
                    <NavigationControl position="top-right" />

                    {zoneFillGeoJSON && (
                        <Source id="zone-fill-src" type="geojson" data={zoneFillGeoJSON}>
                            <Layer id="zone-fill-layer" type="fill" paint={{ "fill-color": "#000000", "fill-opacity": 0.35 }} />
                        </Source>
                    )}
                    {zoneOutlineGeoJSON && (
                        <Source id="zone-outline-src" type="geojson" data={zoneOutlineGeoJSON}>
                            <Layer id="zone-outline-layer" type="line" paint={{ "line-color": "#22C55E", "line-width": 2, "line-opacity": 0.95 }} />
                        </Source>
                    )}

                    {userLocation && (
                        <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
                            <div className="relative">
                                <div className="h-5 w-5 rounded-full border-2 border-white bg-[#0ea5e9] shadow-lg" />
                                <div className="absolute inset-0 h-5 w-5 rounded-full bg-[#0ea5e9]/40 animate-ping" />
                            </div>
                        </Marker>
                    )}
                </Map>

                {/* Centered pin — lifts during map drag (mirrors mobile CenteredPin) */}
                <div
                    className="pointer-events-none absolute inset-0 flex items-end justify-center"
                    style={{ paddingBottom: "50%" }}
                >
                    <div
                        className="flex flex-col items-center"
                        style={{
                            transition: "transform 0.15s ease, opacity 0.15s ease",
                            opacity: isMapMoving ? 0.6 : 1,
                            transform: isMapMoving ? "translateY(-6px)" : "translateY(0)",
                        }}
                    >
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-xl border-2 border-white" style={{ backgroundColor: "#7C3AED" }}>
                            <div className="h-2.5 w-2.5 rounded-full bg-white" />
                        </div>
                        <div className="h-3 w-0.5" style={{ backgroundColor: "#7C3AED" }} />
                        <div className="h-1.5 w-4 rounded-full bg-black/25" />
                    </div>
                </div>

                {/* Locate me */}
                <button
                    onClick={handleLocateMe}
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                    title={t("address.use_my_location")}
                >
                    {locating ? <Loader2 size={16} className="animate-spin text-gray-700" /> : <Crosshair size={16} className="text-gray-700" />}
                </button>
            </div>

            {/* Address display */}
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                <div className="flex items-start gap-2">
                    <MapPin size={14} className="shrink-0 text-[var(--primary)] mt-0.5" />
                    <p className="text-sm text-[var(--foreground)]">
                        {reversingGeocode || isMapMoving ? (
                            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                                <Loader2 size={12} className="animate-spin" />
                                {t("address.resolving")}
                            </span>
                        ) : (
                            address || t("address.tap_to_select")
                        )}
                    </p>
                </div>
            </div>

            {/* Out-of-zone warning — only show when settled and geocode resolved */}
            {!isPinInZone && serviceZones.length > 0 && !isMapMoving && !reversingGeocode && hasResolvedAddress && (
                <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-orange-400/40 bg-orange-500/10 px-3 py-2.5">
                    <AlertTriangle size={14} className="shrink-0 text-orange-400 mt-0.5" />
                    <p className="text-sm text-orange-400">{t("cart.outside_zone_inline_warning")}</p>
                </div>
            )}

            {/* Confirm */}
            <Button size="lg" className="w-full" onClick={handleConfirm} disabled={isConfirmDisabled}>
                {reversingGeocode || isMapMoving ? t("address.resolving") : t("address.confirm_location")}
            </Button>
        </div>
    );
}
