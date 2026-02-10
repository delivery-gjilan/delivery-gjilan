"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client/react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import { GET_DELIVERY_ZONES } from "@/graphql/operations/deliveryZones/queries";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import { ALL_ORDERS_SUBSCRIPTION } from "@/graphql/operations/orders/subscriptions";
import { ASSIGN_DRIVER_TO_ORDER } from "@/graphql/operations/orders";
import { calculateRouteDistance } from "@/lib/utils/mapbox";

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

const USE_CUSTOM_BUSINESSES = false;

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
  const { data: zonesData } = useQuery<any>(GET_DELIVERY_ZONES);
  const { data: driversData } = useQuery<any>(DRIVERS_QUERY, {
    pollInterval: 5000,
  });
  
  // Real-time order updates via WebSocket subscription
  const { data: subscriptionData } = useSubscription<any>(ALL_ORDERS_SUBSCRIPTION);
  const { data: ordersData } = useQuery<any>(GET_ORDERS, {
    fetchPolicy: 'cache-and-network',
  });
  
  // Use subscription data if available, otherwise fall back to query data
  const orders = useMemo(
    () => subscriptionData?.allOrdersUpdated ?? ordersData?.orders ?? [],
    [subscriptionData, ordersData]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const [now, setNow] = useState(Date.now());
  const [driverTracks, setDriverTracks] = useState<Record<string, any>>({});
  const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
  const [assigningDriverOrderId, setAssigningDriverOrderId] = useState<string | null>(null);
  const [orderDistances, setOrderDistances] = useState<Record<string, { distanceKm: number; durationMin: number }>>({});
  const [orderRouteDistances, setOrderRouteDistances] = useState<Record<string, number | null>>({});
  const orderDistanceInFlight = useRef<Set<string>>(new Set());

  const businesses = useMemo(() => {
    if (USE_CUSTOM_BUSINESSES) return CUSTOM_BUSINESSES;
    return data?.businesses ?? [];
  }, [data]);

  const drivers = useMemo(() => driversData?.drivers ?? [], [driversData]);
  const zones = useMemo(() => zonesData?.deliveryZones ?? [], [zonesData]);

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

  // Calculate distances for all active orders
  useEffect(() => {
    const calculateDistances = async () => {
      for (const order of activeOrders) {
        if (orderDistances[order.id]) continue; // Already calculated
        
        // Get first business location (pickup)
        const firstBusiness = order.businesses?.[0]?.business;
        if (!firstBusiness?.location) {
          console.log('No business location for order:', order.id);
          continue;
        }
        
        const pickup = {
          longitude: firstBusiness.location.longitude,
          latitude: firstBusiness.location.latitude,
        };
        
        const dropoff = {
          longitude: order.dropOffLocation.longitude,
          latitude: order.dropOffLocation.latitude,
        };
        
        console.log('Calculating distance for order:', order.id, 'from:', pickup, 'to:', dropoff);
        
        try {
          const distance = await calculateRouteDistance(pickup, dropoff);
          console.log('Distance result:', distance);
          if (distance) {
            setOrderDistances((prev) => ({
              ...prev,
              [order.id]: distance,
            }));
          }
        } catch (error) {
          console.error('Error calculating distance for order:', order.id, error);
        }
      }
    };
    
    calculateDistances();
  }, [activeOrders.map((o: any) => o.id).join(',')]);

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

  const getOrderPickupLocation = (order: any) => {
    const businessWithLocation = order?.businesses
      ?.map((b: any) => b.business)
      ?.find((b: any) => b?.location?.latitude && b?.location?.longitude);
    return businessWithLocation?.location || null;
  };

  const fetchRouteDistanceKm = async (from: any, to: any) => {
    if (!MAPBOX_TOKEN) return null;
    const fromLat = Number(from?.latitude);
    const fromLng = Number(from?.longitude);
    const toLat = Number(to?.latitude);
    const toLng = Number(to?.longitude);
    if (!isValidLatLng(fromLat, fromLng) || !isValidLatLng(toLat, toLng)) return null;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const meters = data?.routes?.[0]?.distance;
    if (!Number.isFinite(meters)) return null;
    return Math.round((meters / 1000) * 10) / 10;
  };

  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    activeOrders.forEach((order: any) => {
      if (orderRouteDistances[order.id] !== undefined) return;
      if (orderDistanceInFlight.current.has(order.id)) return;

      const pickup = getOrderPickupLocation(order);
      const drop = order?.dropOffLocation;
      if (!pickup || !drop) return;

      orderDistanceInFlight.current.add(order.id);
      fetchRouteDistanceKm(pickup, drop)
        .then((distance) => {
          setOrderRouteDistances((prev) => ({
            ...prev,
            [order.id]: distance,
          }));
        })
        .finally(() => {
          orderDistanceInFlight.current.delete(order.id);
        });
    });
  }, [activeOrders, orderRouteDistances]);

  const handleAssignDriver = async (orderId: string, driverId: string | null, event: React.MouseEvent) => {
    event.stopPropagation();
    setAssigningDriverOrderId(orderId);
    try {
      await assignDriver({
        variables: {
          id: orderId,
          driverId: driverId || null,
        },
        refetchQueries: ['GetOrders'],
      });
    } catch (error: any) {
      alert(error.message || "Failed to assign driver");
    } finally {
      setAssigningDriverOrderId(null);
    }
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
          {zones.map((zone: any) => {
            try {
              const geom = JSON.parse(zone.geometry);
              return (
                <Source
                  key={`zone-${zone.id}`}
                  id={`zone-${zone.id}`}
                  type="geojson"
                  data={{ type: "Feature", properties: {}, geometry: geom }}
                >
                  <Layer
                    id={`zone-fill-${zone.id}`}
                    type="fill"
                    paint={{
                      "fill-color": zone.color || "#3b82f6",
                      "fill-opacity": 0.08,
                    }}
                  />
                </Source>
              );
            } catch {
              return null;
            }
          })}

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
              ?.flatMap((b: any) => b.items || []) || [];
            const businessNames = order.businesses
              ?.map((b: any) => b.business?.name)
              ?.filter(Boolean)
              ?.join(', ');
            const businessPhones = order.businesses
              ?.map((b: any) => b.business?.phoneNumber)
              ?.filter(Boolean)
              ?.join(' / ');
            const customerName = order.user
              ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim()
              : 'Unknown customer';
            const customerPhone = order.user?.phoneNumber || null;
            const orderIdShort = order.id ? order.id.slice(0, 6) : 'order';
            const isPending = order.status === 'PENDING';

            const visibleItems = items.slice(0, 4);
            const extraItems = items.length - visibleItems.length;

            return (
              <Marker
                key={`order-${order.id}`}
                latitude={lat}
                longitude={lng}
                anchor="bottom"
              >
                <div className="relative flex flex-col items-center">
                  <div className="relative flex items-center justify-center peer">
                    {isPending && (
                      <span className="absolute inline-flex h-10 w-10 rounded-full bg-amber-400/70 pulse-strong-ring peer-hover:opacity-0 transition-opacity" />
                    )}
                    <MapPin
                      size={22}
                      className="text-red-600 drop-shadow"
                      strokeWidth={2.2}
                    />
                  </div>

                  <div className="absolute bottom-full mb-2 bg-[#0b0b0b] border border-[#2a2a2a] text-white px-3 py-3 rounded-xl shadow-xl opacity-0 transition w-[360px] pointer-events-none peer-hover:opacity-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold">Order #{orderIdShort}</div>
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f2937] text-amber-300 font-semibold">
                        {order.status}
                      </div>
                    </div>

                    {businessNames && (
                      <div className="text-[11px] text-neutral-300 mt-2">
                        <span className="text-amber-300 font-semibold">Business:</span>{" "}
                        <span className="font-semibold text-white">{businessNames}</span>
                      </div>
                    )}
                    {businessPhones && (
                      <div className="text-[11px] text-neutral-300 mt-1">
                        <span className="text-amber-300 font-semibold">Business Phone:</span>{" "}
                        <span className="font-semibold text-white">{businessPhones}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-neutral-300 mt-1">
                      <span className="text-amber-300 font-semibold">Customer:</span>{" "}
                      <span className="font-semibold text-white">{customerName}</span>
                    </div>
                    {customerPhone && (
                      <div className="text-[11px] text-neutral-300 mt-1">
                        <span className="text-amber-300 font-semibold">Phone:</span>{" "}
                        <span className="font-semibold text-white">{customerPhone}</span>
                      </div>
                    )}
                    {drop?.address && (
                      <div className="text-[11px] text-neutral-300 mt-1">
                        <span className="text-amber-300 font-semibold">Address:</span>{" "}
                        <span className="font-semibold text-white">{drop.address}</span>
                      </div>
                    )}

                    {visibleItems.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] text-amber-300 font-semibold mb-2">Items</div>
                        <div className="grid grid-cols-3 gap-2">
                          {visibleItems.map((item: any, index: number) => (
                            <div key={`${item.productId || item.name}-${index}`} className="flex items-center gap-2">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-8 w-8 rounded-md object-cover border border-[#262626]"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-md bg-[#1f2937] border border-[#262626]" />
                              )}
                              <div className="text-[10px] text-neutral-300 leading-tight">
                                <div className="line-clamp-1 font-semibold text-white">{item.name}</div>
                                <div className="text-neutral-500 font-semibold">x{item.quantity}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {extraItems > 0 && (
                          <div className="text-[10px] text-neutral-500 mt-2">
                            +{extraItems} more item{extraItems > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Marker>
            );
          })}
        </Map>

        <style jsx global>{`
          @keyframes strongPulse {
            0%, 100% {
              transform: scale(0.9);
              opacity: 0.6;
            }
            50% {
              transform: scale(1.3);
              opacity: 0.95;
            }
          }
          .pulse-strong-ring {
            animation: strongPulse 0.95s ease-in-out infinite;
          }
        `}</style>

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
              const distance = orderDistances[order.id];
              const distanceLabel = distance
                ? `${distance.distanceKm.toFixed(1)} km`
                : "Calculating...";
              return (
                <div
                  key={order.id}
                  className="bg-[#161616] border border-[#262626] rounded-lg p-3 hover:bg-[#1c1c1c] transition"
                >
                  <button
                    onClick={() => focusOrder(order)}
                    className="w-full text-left mb-2"
                  >
                    <div className="font-medium text-white">{businessNames}</div>
                    <div className="text-xs text-neutral-400 mt-1 line-clamp-2">
                      {order.dropOffLocation?.address || "No dropoff address"}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-2">
                      Status: {order.status}
                    </div>
                    <div className="text-[10px] text-cyan-400 mt-1 font-medium">
                      📍 {distanceLabel}
                    </div>
                  </button>
                  <div className="mt-2 pt-2 border-t border-[#262626]">
                    <label className="text-[10px] text-neutral-400 block mb-1">Assign Driver</label>
                    <select
                      value={order.driver?.id || ""}
                      onChange={(e) => handleAssignDriver(order.id, e.target.value || null, e as any)}
                      disabled={assigningDriverOrderId === order.id}
                      className="w-full text-xs bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((driver: any) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.firstName} {driver.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
