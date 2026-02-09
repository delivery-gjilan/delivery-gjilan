"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import Map, { Marker } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";

const DEFAULT_CENTER = {
  latitude: 42.4635,
  longitude: 21.4694,
};

const GJILAN_BOUNDS: [[number, number], [number, number]] = [
  [21.42, 42.43],
  [21.51, 42.5],
];

const MIN_ZOOM = 11.5;
const MAX_ZOOM = 17;

const USE_CUSTOM_BUSINESSES = true;

const ORIENTATION_POI_CLASSES = [
  "hospital",
  "police",
  "school",
  "college",
  "university",
  "park",
  "bus",
  "bus_station",
  "train",
  "station",
  "subway",
  "tram",
  "ferry",
  "airport",
];

const CUSTOM_BUSINESSES = [
  {
    id: "custom-1",
    name: "My First Business",
    location: {
      latitude: 42.4635,
      longitude: 21.4694,
      address: "Gjilan, Kosovo",
    },
  },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "mapbox://styles/mapbox/streets-v12";

const isValidLatLng = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

export default function MapPage() {
  const { data, loading } = useQuery<any>(GET_BUSINESSES);
  const { data: driversData } = useQuery<any>(DRIVERS_QUERY, {
    pollInterval: 5000,
  });
  const { data: ordersData } = useQuery<any>(GET_ORDERS, {
    pollInterval: 20000,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const [now, setNow] = useState(Date.now());
  const [driverTracks, setDriverTracks] = useState<Record<string, any>>({});

  const businesses = useMemo(() => {
    if (USE_CUSTOM_BUSINESSES) return CUSTOM_BUSINESSES;
    return data?.businesses ?? [];
  }, [data]);

  const drivers = useMemo(() => driversData?.drivers ?? [], [driversData]);

  const center = useMemo(() => {
    if (!businesses.length) return DEFAULT_CENTER;
    const valid = businesses.filter((b: any) => b.location?.latitude && b.location?.longitude);
    if (!valid.length) return DEFAULT_CENTER;
    const sum = valid.reduce(
      (acc: any, b: any) => ({
        latitude: acc.latitude + b.location.latitude,
        longitude: acc.longitude + b.location.longitude,
      }),
      { latitude: 0, longitude: 0 }
    );
    return {
      latitude: sum.latitude / valid.length,
      longitude: sum.longitude / valid.length,
    };
  }, [businesses]);

  const selectedBusiness = businesses.find((b: any) => b.id === selectedId) ?? null;
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData]);
  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order: any) => order.status !== "DELIVERED" && order.status !== "CANCELLED"
      ),
    [orders]
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!drivers.length) return;
    setDriverTracks((prev) => {
      const next = { ...prev } as Record<string, any>;
      drivers.forEach((driver: any) => {
        const location = driver.driverLocation;
        if (!location?.latitude || !location?.longitude) return;

        const existing = next[driver.id];
        const current = existing
          ? getInterpolatedPosition(existing, now)
          : { latitude: location.latitude, longitude: location.longitude };

        next[driver.id] = {
          id: driver.id,
          name: `${driver.firstName} ${driver.lastName}`.trim(),
          from: current,
          to: { latitude: location.latitude, longitude: location.longitude },
          start: now,
          end: now + 20000,
          updatedAt: driver.driverLocationUpdatedAt,
        };
      });
      return next;
    });
  }, [drivers, now]);

  const getInterpolatedPosition = (track: any, timestamp: number) => {
    const { from, to, start, end } = track;
    if (!from || !to || start === end) return to || from;
    const t = Math.max(0, Math.min(1, (timestamp - start) / (end - start)));
    return {
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    };
  };

  const focusBusiness = (business: any) => {
    if (!business?.location) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({
      center: [business.location.longitude, business.location.latitude],
      zoom: 14,
      essential: true,
    });
  };

  const focusDriver = (driver: any) => {
    if (!driver?.driverLocation) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({
      center: [driver.driverLocation.longitude, driver.driverLocation.latitude],
      zoom: 14,
      essential: true,
    });
  };

  const focusOrder = (order: any) => {
    const drop = order?.dropOffLocation;
    if (!drop) return;
    const lat = Number(drop.latitude);
    const lng = Number(drop.longitude);
    if (!isValidLatLng(lat, lng)) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({
      center: [lng, lat],
      zoom: 14,
      essential: true,
    });
  };

  const tuneLandmarkLabels = () => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const layers = map.getStyle()?.layers || [];
    layers.forEach((layer: any) => {
      if (layer.type !== "symbol") return;
      if (layer["source-layer"] !== "poi_label") return;
      const existingFilter = map.getFilter(layer.id) as any;
      const landmarkFilter: any = ["in", "class", ...ORIENTATION_POI_CLASSES];
      const nextFilter = existingFilter ? ["all", existingFilter, landmarkFilter] : landmarkFilter;
      try {
        map.setFilter(layer.id, nextFilter);
        map.setLayoutProperty(layer.id, "text-size", 10);
        map.setPaintProperty(layer.id, "text-color", "#9CA3AF");
        map.setPaintProperty(layer.id, "text-halo-color", "#0A0A0A");
        map.setPaintProperty(layer.id, "text-halo-width", 0.5);
        map.setPaintProperty(layer.id, "text-opacity", 0.6);
      } catch {
        // ignore style incompatibilities
      }
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-[#161616] border border-[#262626] rounded-lg overflow-hidden relative">
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: center.latitude,
            longitude: center.longitude,
            zoom: 12,
          }}
          mapStyle={MAP_STYLE}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%" }}
          maxBounds={GJILAN_BOUNDS}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onLoad={tuneLandmarkLabels}
          onStyleData={tuneLandmarkLabels}
        >
          {businesses.map((business: any) => {
            const location = business.location;
            const lat = Number(location?.latitude);
            const lng = Number(location?.longitude);
            if (!isValidLatLng(lat, lng)) return null;
            return (
              <Marker
                key={business.id}
                latitude={lat}
                longitude={lng}
                anchor="bottom"
                onClick={(event) => {
                  event.originalEvent.stopPropagation();
                  setSelectedId(business.id);
                }}
              >
                <div className="flex flex-col items-center group">
                  <div className="bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition">
                    {business.name}
                  </div>
                  <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow" />
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-orange-500 -mt-1" />
                </div>
              </Marker>
            );
          })}

          {Object.values(driverTracks).map((track: any) => {
            const pos = getInterpolatedPosition(track, now);
            const lat = Number(pos?.latitude);
            const lng = Number(pos?.longitude);
            if (!isValidLatLng(lat, lng)) return null;
            return (
              <Marker
                key={`driver-${track.id}`}
                latitude={lat}
                longitude={lng}
                anchor="bottom"
                onClick={(event) => {
                  event.originalEvent.stopPropagation();
                  setSelectedDriverId(track.id);
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow">
                    {track.name || 'Driver'}
                  </div>
                  <div className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow" />
                </div>
              </Marker>
            );
          })}

          {activeOrders.map((order: any) => {
            const drop = order.dropOffLocation;
            const lat = Number(drop?.latitude);
            const lng = Number(drop?.longitude);
            if (!isValidLatLng(lat, lng)) return null;

            const items = order.businesses
              ?.flatMap((b: any) => b.items || [])
              ?.map((item: any) => `${item.name} x${item.quantity}`) || [];
            const itemsText = items.length ? items.join(', ') : 'Items unavailable';

            return (
              <Marker
                key={`order-${order.id}`}
                latitude={lat}
                longitude={lng}
                anchor="bottom"
              >
                <div className="flex flex-col items-center group">
                  <div className="bg-red-600 text-white text-[11px] px-2 py-1 rounded-lg shadow opacity-0 group-hover:opacity-100 transition max-w-[220px] text-center">
                    {itemsText}
                  </div>
                  <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow" />
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-red-600 -mt-1" />
                </div>
              </Marker>
            );
          })}
        </Map>

        {selectedBusiness && null}

        <div className="absolute right-4 top-4 bottom-4 w-80 bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin size={18} />
              Drivers
            </h3>

            {drivers.length === 0 && (
              <div className="text-neutral-500 text-sm">No drivers online.</div>
            )}

            <div className="space-y-3">
              {drivers.map((driver: any) => (
                <button
                  key={`driver-${driver.id}`}
                  onClick={() => {
                    setSelectedDriverId(driver.id);
                    focusDriver(driver);
                  }}
                  className={`w-full text-left bg-[#161616] border border-[#262626] rounded-lg p-3 hover:bg-[#1c1c1c] transition ${
                    selectedDriverId === driver.id ? "border-emerald-500/60" : ""
                  }`}
                >
                  <div className="font-medium text-white">
                    {driver.firstName} {driver.lastName}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {driver.driverLocationUpdatedAt
                      ? "Live location"
                      : "No location yet"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MapPin size={18} />
            Orders
          </h3>

          {activeOrders.length === 0 && (
            <div className="text-neutral-500 text-sm">No active orders.</div>
          )}

          <div className="space-y-3">
            {activeOrders.map((order: any) => {
              const businessNames = order.businesses
                .map((b: any) => b.business.name)
                .join(", ");
              return (
                <button
                  key={order.id}
                  onClick={() => focusOrder(order)}
                  className="w-full text-left bg-[#161616] border border-[#262626] rounded-lg p-3 hover:bg-[#1c1c1c] transition"
                >
                  <div className="font-medium text-white">{businessNames}</div>
                  <div className="text-xs text-neutral-400 mt-1 line-clamp-2">
                    {order.dropOffLocation?.address || "No dropoff address"}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-2">
                    Status: {order.status}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
