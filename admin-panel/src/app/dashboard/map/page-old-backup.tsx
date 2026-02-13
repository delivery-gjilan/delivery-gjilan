"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client/react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import { GET_DELIVERY_ZONES } from "@/graphql/operations/deliveryZones/queries";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import { ALL_ORDERS_SUBSCRIPTION } from "@/graphql/operations/orders/subscriptions";
import { ASSIGN_DRIVER_TO_ORDER, UPDATE_ORDER_STATUS } from "@/graphql/operations/orders";
import { ADMIN_UPDATE_DRIVER_LOCATION } from "@/graphql/operations/users/mutations";
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

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const offsetByMeters = (origin: { latitude: number; longitude: number }, meters: number) => {
  const angle = Math.random() * Math.PI * 2;
  const latOffset = (meters * Math.cos(angle)) / 111320;
  const lngOffset = (meters * Math.sin(angle)) / (111320 * Math.cos((origin.latitude * Math.PI) / 180));
  return {
    latitude: origin.latitude + latOffset,
    longitude: origin.longitude + lngOffset,
  };
};

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
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
  const [adminUpdateDriverLocation] = useMutation(ADMIN_UPDATE_DRIVER_LOCATION);
  const [assigningDriverOrderId, setAssigningDriverOrderId] = useState<string | null>(null);
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<string | null>(null);
  const [orderDistances, setOrderDistances] = useState<Record<string, { 
    toPickup?: { distanceKm: number; durationMin: number; geometry: Array<[number, number]> };
    toDropoff: { distanceKm: number; durationMin: number; geometry: Array<[number, number]> };
    driverId?: string;
    status?: string;
  }>>({});
  const [orderRouteDistances, setOrderRouteDistances] = useState<Record<string, number | null>>({});
  const orderDistanceInFlight = useRef<Set<string>>(new Set());
  const [freshOrderIds, setFreshOrderIds] = useState<string[]>([]);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const [panelView, setPanelView] = useState<"orders" | "drivers">("orders");
  const simulationTimersRef = useRef<Record<string, number>>({});
  const [simulatingDrivers, setSimulatingDrivers] = useState<Record<string, boolean>>({});
  const [simulationRoutes, setSimulationRoutes] = useState<Record<string, Array<[number, number]>>>({});
  const [showPolylines, setShowPolylines] = useState<Record<string, boolean>>({});
  const [driverProgressOnRoute, setDriverProgressOnRoute] = useState<Record<string, number>>({});

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
  const [driverDetailsId, setDriverDetailsId] = useState<string | null>(null);
  
  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order: any) => order.status !== "DELIVERED" && order.status !== "CANCELLED"
      ),
    [orders]
  );

  const selectedDriver = useMemo(
    () => drivers.find((driver: any) => driver.id === driverDetailsId) ?? null,
    [drivers, driverDetailsId]
  );

  const selectedDriverOrder = useMemo(
    () =>
      driverDetailsId
        ? activeOrders.find((order: any) => order.driver?.id === driverDetailsId) ?? null
        : null,
    [activeOrders, driverDetailsId]
  );

  useEffect(() => {
    const currentIds = new Set(activeOrders.map((order: any) => order.id));
    const prevIds = prevOrderIdsRef.current;
    const newIds = activeOrders
      .filter((order: any) => !prevIds.has(order.id))
      .map((order: any) => order.id);

    if (newIds.length) {
      setFreshOrderIds((prev) => Array.from(new Set([...prev, ...newIds])));
      newIds.forEach((id) => {
        setTimeout(() => {
          setFreshOrderIds((prev) => prev.filter((orderId) => orderId !== id));
        }, 6000);
      });
    }

    prevOrderIdsRef.current = currentIds;
  }, [activeOrders]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(simulationTimersRef.current).forEach((timerId) => {
        window.clearInterval(timerId);
      });
      simulationTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!drivers.length) return;
    setDriverTracks((prev) => {
      const next = { ...prev } as Record<string, any>;
      drivers.forEach((driver: any) => {
        const location = driver.driverLocation;
        if (!location?.latitude || !location?.longitude) return;

        next[driver.id] = {
          id: driver.id,
          name: `${driver.firstName} ${driver.lastName}`.trim(),
          to: { latitude: location.latitude, longitude: location.longitude },
          updatedAt: driver.driverLocationUpdatedAt,
        };
      });
      return next;
    });
    
    // Update progress on route for non-simulated active deliveries
    activeOrders.forEach((order: any) => {
      if (order.status === 'OUT_FOR_DELIVERY' && order.driver && !simulatingDrivers[order.driver.id]) {
        const driver = drivers.find((d: any) => d.id === order.driver.id);
        const driverLocation = driver?.driverLocation;
        const routeGeometry = orderDistances[order.id]?.toDropoff?.geometry;
        
        if (driverLocation && routeGeometry && routeGeometry.length > 0) {
          // Find closest point on route to driver's current position
          let minDist = Infinity;
          let closestIndex = 0;
          
          routeGeometry.forEach((coord: [number, number], idx: number) => {
            const dist = Math.hypot(
              coord[0] - driverLocation.longitude,
              coord[1] - driverLocation.latitude
            );
            if (dist < minDist) {
              minDist = dist;
              closestIndex = idx;
            }
          });
          
          const progress = routeGeometry.length > 1 ? closestIndex / (routeGeometry.length - 1) : 0;
          setDriverProgressOnRoute((prev) => ({
            ...prev,
            [order.driver.id]: progress,
          }));
        }
      }
    });
  }, [drivers, activeOrders, orderDistances, simulatingDrivers]);

  // Calculate distances for all active orders
  useEffect(() => {
    const calculateDistances = async () => {
      for (const order of activeOrders) {
        // Check if we need to recalculate based on driver/status changes
        const cacheKey = `${order.id}-${order.driver?.id || 'none'}-${order.status}`;
        const existingKey = orderDistances[order.id] ? 
          `${order.id}-${orderDistances[order.id].driverId || 'none'}-${orderDistances[order.id].status}` : null;
        
        if (existingKey === cacheKey) continue; // Already calculated for this state
        
        // Get first business location (pickup)
        const firstBusiness = order.businesses?.[0]?.business;
        if (!firstBusiness?.location || !order.dropOffLocation) {
          console.log('No business or dropoff location for order:', order.id);
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
        
        console.log('Processing order:', order.id, {
          status: order.status,
          hasDriver: !!order.driver,
          driverId: order.driver?.id,
          hasDriverLocation: !!order.driver?.driverLocation
        });
        
        try {
          if (order.status === 'READY' && order.driver) {
            // Find driver in drivers list to get latest location
            const driver = drivers.find((d: any) => d.id === order.driver.id);
            const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
            
            if (!driverLocation) {
              console.log('No driver location for READY order:', order.id, 'driver:', order.driver.id);
              continue;
            }
            
            // For READY: calculate driver → pickup and pickup → dropoff
            const driverPos = {
              longitude: driverLocation.longitude,
              latitude: driverLocation.latitude,
            };
            
            console.log('Calculating READY routes for order:', order.id, {
              driverPos,
              pickup,
              dropoff
            });
            
            const [toPickupRoute, toDropoffRoute] = await Promise.all([
              calculateRouteDistance(driverPos, pickup),
              calculateRouteDistance(pickup, dropoff),
            ]);
            
            console.log('READY routes calculated:', {
              orderId: order.id,
              toPickup: toPickupRoute,
              toDropoff: toDropoffRoute
            });
            
            if (toPickupRoute && toDropoffRoute) {
              setOrderDistances((prev) => ({
                ...prev,
                [order.id]: {
                  toPickup: toPickupRoute,
                  toDropoff: toDropoffRoute,
                  driverId: order.driver.id,
                  status: order.status,
                },
              }));
            }
          } else if (order.status === 'OUT_FOR_DELIVERY' && order.driver) {
            // Find driver in drivers list to get latest location
            const driver = drivers.find((d: any) => d.id === order.driver.id);
            const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
            
            if (!driverLocation) {
              console.log('No driver location for OUT_FOR_DELIVERY order:', order.id);
              continue;
            }
            
            // For OUT_FOR_DELIVERY: calculate driver → dropoff
            const driverPos = {
              longitude: driverLocation.longitude,
              latitude: driverLocation.latitude,
            };
            
            const toDropoffRoute = await calculateRouteDistance(driverPos, dropoff);
            
            if (toDropoffRoute) {
              setOrderDistances((prev) => ({
                ...prev,
                [order.id]: {
                  toDropoff: toDropoffRoute,
                  driverId: order.driver.id,
                  status: order.status,
                },
              }));
            }
          } else {
            // Fallback: just calculate pickup → dropoff for reference
            const route = await calculateRouteDistance(pickup, dropoff);
            if (route) {
              setOrderDistances((prev) => ({
                ...prev,
                [order.id]: {
                  toDropoff: route,
                  driverId: order.driver?.id,
                  status: order.status,
                },
              }));
            }
          }
        } catch (error) {
          console.error('Error calculating distance for order:', order.id, error);
        }
      }
    };
    
    calculateDistances();
  }, [activeOrders.map((o: any) => `${o.id}-${o.driver?.id || 'none'}-${o.status}`).join(','), drivers]);

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

  const fetchRouteGeometry = async (from: any, to: any) => {
    if (!MAPBOX_TOKEN) return null;
    const fromLat = Number(from?.latitude);
    const fromLng = Number(from?.longitude);
    const toLat = Number(to?.latitude);
    const toLng = Number(to?.longitude);
    if (!isValidLatLng(fromLat, fromLng) || !isValidLatLng(toLat, toLng)) return null;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.routes?.[0]?.geometry?.coordinates ?? null;
  };

  const stopDriverSimulation = (driverId: string) => {
    const timerId = simulationTimersRef.current[driverId];
    if (timerId) {
      window.clearInterval(timerId);
      delete simulationTimersRef.current[driverId];
    }
    setSimulatingDrivers((prev) => ({ ...prev, [driverId]: false }));
    setSimulationRoutes((prev) => {
      if (!prev[driverId]) return prev;
      const next = { ...prev } as Record<string, Array<[number, number]>>;
      delete next[driverId];
      return next;
    });
    setDriverProgressOnRoute((prev) => {
      if (!prev[driverId]) return prev;
      const next = { ...prev };
      delete next[driverId];
      return next;
    });
  };

  const startDriverSimulation = async (driver: any, order: any) => {
    if (simulationTimersRef.current[driver.id]) {
      stopDriverSimulation(driver.id);
      return;
    }

    if (!order) return;

    const pickup = getOrderPickupLocation(order);
    const dropoff = order?.dropOffLocation;
    const target = order.status === "OUT_FOR_DELIVERY" ? dropoff : pickup;
    let start = driver?.driverLocation || pickup || dropoff;

    if (!start || !target) return;

    let startLat = Number(start.latitude);
    let startLng = Number(start.longitude);
    const endLat = Number(target.latitude);
    const endLng = Number(target.longitude);

    if (!isValidLatLng(startLat, startLng) || !isValidLatLng(endLat, endLng)) return;

    const distance = distanceMeters(
      { latitude: startLat, longitude: startLng },
      { latitude: endLat, longitude: endLng }
    );
    if (distance < 120) {
      const nudged = offsetByMeters({ latitude: endLat, longitude: endLng }, 200);
      start = nudged;
      startLat = nudged.latitude;
      startLng = nudged.longitude;
    }

    const routeCoordinates = await fetchRouteGeometry(start, target);
    if (routeCoordinates && routeCoordinates.length > 1) {
      setSimulationRoutes((prev) => ({
        ...prev,
        [driver.id]: routeCoordinates,
      }));
    }

    const path = (routeCoordinates && routeCoordinates.length > 1)
      ? routeCoordinates.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }))
      : [{ latitude: startLat, longitude: startLng }, { latitude: endLat, longitude: endLng }];

    const targetSteps = 80;
    const stepStride = Math.max(1, Math.ceil(path.length / targetSteps));
    const intervalMs = 700;
    let index = 0;

    setSimulatingDrivers((prev) => ({ ...prev, [driver.id]: true }));

    const timerId = window.setInterval(async () => {
      index = Math.min(path.length - 1, index + stepStride);
      const current = path[index] || { latitude: endLat, longitude: endLng };
      const latitude = current.latitude;
      const longitude = current.longitude;

      // Update progress percentage for polyline trimming
      const progress = path.length > 1 ? index / (path.length - 1) : 1;
      setDriverProgressOnRoute((prev) => ({
        ...prev,
        [driver.id]: progress,
      }));

      try {
        await adminUpdateDriverLocation({
          variables: {
            driverId: driver.id,
            latitude,
            longitude,
          },
        });
      } catch (error) {
        console.error("Simulation update failed", error);
        stopDriverSimulation(driver.id);
        return;
      }

      if (index >= path.length - 1) {
        stopDriverSimulation(driver.id);
      }
    }, intervalMs);

    simulationTimersRef.current[driver.id] = timerId;
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

  const handleUpdateStatus = async (orderId: string, status: string, event: React.ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    setUpdatingStatusOrderId(orderId);
    try {
      await updateOrderStatus({
        variables: {
          id: orderId,
          status,
        },
        refetchQueries: ['GetOrders'],
      });
    } catch (error: any) {
      alert(error.message || "Failed to update status");
    } finally {
      setUpdatingStatusOrderId(null);
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
          {Object.entries(simulationRoutes).map(([driverId, coordinates]) => (
            <Source
              key={`sim-route-${driverId}`}
              id={`sim-route-${driverId}`}
              type="geojson"
              data={{
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates,
                },
              }}
            >
              <Layer
                id={`sim-route-casing-${driverId}`}
                type="line"
                paint={{
                  "line-color": "#075985",
                  "line-width": 8,
                  "line-opacity": 0.6,
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
              <Layer
                id={`sim-route-line-${driverId}`}
                type="line"
                paint={{
                  "line-color": "#38bdf8",
                  "line-width": 5,
                  "line-opacity": 1,
                }}
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
              />
            </Source>
          ))}
          
          {/* Render polylines for orders with routes */}
          {activeOrders.map((order: any) => {
            if (!order.driver || !showPolylines[order.id] || !orderDistances[order.id]) {
              return null;
            }
            
            const routes = orderDistances[order.id];
            
            console.log('Rendering polylines for order:', order.id, {
              status: order.status,
              hasDriver: !!order.driver,
              showPolyline: showPolylines[order.id],
              routes: routes,
              hasToPickup: !!routes.toPickup,
              hasToDropoff: !!routes.toDropoff
            });
            
            // For READY status: show driver → pickup (blue) and pickup → dropoff (purple)
            if (order.status === 'READY' && routes.toPickup && routes.toDropoff) {
              console.log('Rendering READY polylines with geometries:', {
                toPickupGeometry: routes.toPickup.geometry?.length,
                toDropoffGeometry: routes.toDropoff.geometry?.length
              });
              
              return (
                <Fragment key={`order-routes-${order.id}`}>
                  {/* Driver to Pickup - Blue with darker outline */}
                  <Source
                    key={`order-to-pickup-${order.id}`}
                    id={`order-to-pickup-${order.id}`}
                    type="geojson"
                    data={{
                      type: "Feature",
                      properties: {},
                      geometry: {
                        type: "LineString",
                        coordinates: routes.toPickup.geometry,
                      },
                    }}
                  >
                    <Layer
                      id={`order-to-pickup-casing-${order.id}`}
                      type="line"
                      paint={{
                        "line-color": "#1e3a8a",
                        "line-width": 8,
                        "line-opacity": 0.6,
                      }}
                      layout={{
                        "line-cap": "round",
                        "line-join": "round",
                      }}
                    />
                    <Layer
                      id={`order-to-pickup-line-${order.id}`}
                      type="line"
                      paint={{
                        "line-color": "#3b82f6",
                        "line-width": 5,
                        "line-opacity": 1,
                      }}
                      layout={{
                        "line-cap": "round",
                        "line-join": "round",
                      }}
                    />
                  </Source>
                  
                  {/* Pickup to Dropoff - Purple with darker outline */}
                  <Source
                    key={`order-to-dropoff-${order.id}`}
                    id={`order-to-dropoff-${order.id}`}
                    type="geojson"
                    data={{
                      type: "Feature",
                      properties: {},
                      geometry: {
                        type: "LineString",
                        coordinates: routes.toDropoff.geometry,
                      },
                    }}
                  >
                    <Layer
                      id={`order-to-dropoff-casing-${order.id}`}
                      type="line"
                      paint={{
                        "line-color": "#581c87",
                        "line-width": 8,
                        "line-opacity": 0.6,
                      }}
                      layout={{
                        "line-cap": "round",
                        "line-join": "round",
                      }}
                    />
                    <Layer
                      id={`order-to-dropoff-line-${order.id}`}
                      type="line"
                      paint={{
                        "line-color": "#a855f7",
                        "line-width": 5,
                        "line-opacity": 1,
                      }}
                      layout={{
                        "line-cap": "round",
                        "line-join": "round",
                      }}
                    />
                  </Source>
                </Fragment>
              );
            }
            // For OUT_FOR_DELIVERY: show driver → dropoff (emerald) with progressive trimming
            else if (order.status === 'OUT_FOR_DELIVERY' && routes.toDropoff) {
              const geometry = routes.toDropoff.geometry;
              const driverId = order.driver?.id;
              const progress = driverId && driverProgressOnRoute[driverId] ? driverProgressOnRoute[driverId] : 0;
              
              // Calculate which point in the route to start from (trim the already-traveled portion)
              const startIndex = Math.floor(progress * geometry.length);
              const remainingGeometry = startIndex > 0 ? geometry.slice(startIndex) : geometry;
              
              // Only show polyline if there's remaining route
              if (remainingGeometry.length < 2) {
                return null;
              }
              
              return (
                <Source
                  key={`order-route-${order.id}`}
                  id={`order-route-${order.id}`}
                  type="geojson"
                  data={{
                    type: "Feature",
                    properties: {},
                    geometry: {
                      type: "LineString",
                      coordinates: remainingGeometry,
                    },
                  }}
                >
                  <Layer
                    id={`order-route-casing-${order.id}`}
                    type="line"
                    paint={{
                      "line-color": "#065f46",
                      "line-width": 8,
                      "line-opacity": 0.6,
                    }}
                    layout={{
                      "line-cap": "round",
                      "line-join": "round",
                    }}
                  />
                  <Layer
                    id={`order-route-line-${order.id}`}
                    type="line"
                    paint={{
                      "line-color": "#10b981",
                      "line-width": 5,
                      "line-opacity": 1,
                    }}
                    layout={{
                      "line-cap": "round",
                      "line-join": "round",
                    }}
                  />
                </Source>
              );
            }
            
            return null;
          })}
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
            const pos = track.to; // Use exact position instead of interpolated
            const lat = Number(pos?.latitude);
            const lng = Number(pos?.longitude);
            if (!isValidLatLng(lat, lng)) return null;
            const isDelivering = activeOrders.some(
              (order: any) =>
                order.driver?.id === track.id && order.status === "OUT_FOR_DELIVERY"
            );
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
                <div className="flex flex-col items-center group relative">
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow">
                      {track.name || "Driver"}
                    </div>
                  </div>
                  <div className="relative">
                    {isDelivering && (
                      <>
                        <span className="absolute -inset-1.5 rounded-full bg-emerald-400/40 driver-pulse" />
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 border border-white shadow" />
                      </>
                    )}
                    <div className="relative w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow" />
                  </div>
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
          @keyframes listFlashPending {
            0%, 100% { background-color: rgba(251, 191, 36, 0.05); }
            50% { background-color: rgba(251, 191, 36, 0.18); }
          }
          @keyframes listFlashReady {
            0%, 100% { background-color: rgba(56, 189, 248, 0.08); }
            50% { background-color: rgba(56, 189, 248, 0.2); }
          }
          .order-flash-pending {
            animation: listFlashPending 1.6s ease-in-out infinite;
            border-color: rgba(251, 191, 36, 0.35);
          }
          .order-flash-ready {
            animation: listFlashReady 1.6s ease-in-out infinite;
            border-color: rgba(56, 189, 248, 0.45);
          }
          @keyframes driverPulse {
            0%, 100% {
              transform: scale(0.8);
              opacity: 0.35;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.7;
            }
          }
          .driver-pulse {
            animation: driverPulse 0.9s ease-in-out infinite;
          }
        `}</style>

        {selectedBusiness && null}

        {driverDetailsId && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
            <div className="w-[420px] max-w-[90vw] rounded-2xl bg-[#0b0b0b] border border-[#262626] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400">Driver</div>
                  <div className="text-lg font-semibold text-white">
                    {selectedDriver
                      ? `${selectedDriver.firstName} ${selectedDriver.lastName}`.trim()
                      : "Unknown driver"}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    {selectedDriver?.driverLocationUpdatedAt
                      ? "Live location"
                      : "No location yet"}
                  </div>
                </div>
                <button
                  onClick={() => setDriverDetailsId(null)}
                  className="text-xs px-2.5 py-1 rounded-full border border-[#2a2a2a] text-neutral-200 hover:text-white hover:border-[#3a3a3a] transition"
                >
                  Close
                </button>
              </div>

              {selectedDriverOrder ? (
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400">Active order</div>
                  <div className="text-sm font-semibold text-white mt-2">
                    {selectedDriverOrder.businesses
                      ?.map((b: any) => b.business?.name)
                      ?.filter(Boolean)
                      ?.join(", ")}
                  </div>
                  {selectedDriverOrder.user && (
                    <div className="text-xs text-neutral-400 mt-1">
                      Customer: {selectedDriverOrder.user.firstName} {selectedDriverOrder.user.lastName}
                    </div>
                  )}
                  {selectedDriverOrder.user?.phoneNumber && (
                    <div className="text-xs text-neutral-400 mt-1">
                      Phone: {selectedDriverOrder.user.phoneNumber}
                    </div>
                  )}
                  {selectedDriverOrder.dropOffLocation?.address && (
                    <div className="text-xs text-neutral-400 mt-1">
                      Dropoff: {selectedDriverOrder.dropOffLocation.address}
                    </div>
                  )}
                  {selectedDriverOrder.businesses && (
                    <div className="text-xs text-neutral-400 mt-2">
                      Items:{" "}
                      {(() => {
                        const items = selectedDriverOrder.businesses
                          .flatMap((b: any) => b.items || [])
                          .slice(0, 4);
                        const extra =
                          selectedDriverOrder.businesses
                            .flatMap((b: any) => b.items || []).length - items.length;
                        const label = items
                          .map((item: any) => `${item.quantity}x ${item.name}`)
                          .join(", ");
                        return `${label}${extra > 0 ? `, +${extra} more` : ""}`;
                      })()}
                    </div>
                  )}
                  <div className="mt-3 rounded-xl border border-[#1f1f1f] bg-[#101010] p-3">
                    <div className="text-[11px] text-neutral-400">ETA</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {orderDistances[selectedDriverOrder.id]
                        ? `~${Math.round(
                            orderDistances[selectedDriverOrder.id].toPickup 
                              ? orderDistances[selectedDriverOrder.id].toPickup.durationMin + orderDistances[selectedDriverOrder.id].toDropoff.durationMin
                              : orderDistances[selectedDriverOrder.id].toDropoff.durationMin
                          )} min`
                        : "Calculating..."}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1">
                      {orderDistances[selectedDriverOrder.id]
                        ? `${(
                            orderDistances[selectedDriverOrder.id].toPickup 
                              ? orderDistances[selectedDriverOrder.id].toPickup.distanceKm + orderDistances[selectedDriverOrder.id].toDropoff.distanceKm
                              : orderDistances[selectedDriverOrder.id].toDropoff.distanceKm
                          ).toFixed(1)} km`
                        : ""}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => focusOrder(selectedDriverOrder)}
                      className="flex-1 text-xs px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 transition"
                    >
                      Show order location
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDriverId(selectedDriverOrder.driver?.id || null);
                        focusDriver(selectedDriver);
                      }}
                      className="flex-1 text-xs px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                    >
                      Focus driver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-[#1f1f1f] bg-[#101010] p-3 text-sm text-neutral-400">
                  No active order assigned to this driver.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute right-0 top-0 bottom-0 w-[360px] bg-[#0a0a0a]/95 border-l border-[#262626] p-4 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-white font-semibold text-sm tracking-wide uppercase">
              {panelView === "orders" ? "Orders" : "Drivers"}
            </h3>
            <button
              onClick={() => setPanelView(panelView === "orders" ? "drivers" : "orders")}
              className="text-[11px] px-2.5 py-1 rounded-full border border-[#2a2a2a] text-neutral-200 hover:text-white hover:border-[#3a3a3a] transition"
            >
              {panelView === "orders" ? `Show drivers (${drivers.length})` : `Show orders (${activeOrders.length})`}
            </button>
          </div>

          {panelView === "orders" ? (
            <>
              {activeOrders.length === 0 && (
                <div className="text-neutral-500 text-sm">No active orders.</div>
              )}

              <div className="space-y-2">
                {activeOrders.map((order: any) => {
                  const businessNames = order.businesses
                    .map((b: any) => b.business.name)
                    .join(", ");
                  const routeDistance = orderRouteDistances[order.id];
                  const fallbackDistance = orderDistances[order.id]?.distanceKm;
                  const distanceValue = Number.isFinite(routeDistance)
                    ? routeDistance
                    : Number.isFinite(fallbackDistance)
                    ? fallbackDistance
                    : null;
                  const distanceLabel = distanceValue !== null
                    ? `${distanceValue.toFixed(1)} km`
                    : "Calculating...";
                  const isPending = order.status === "PENDING";
                  const isReady = order.status === "READY";
                  const orderDateMs = order.orderDate ? new Date(order.orderDate).getTime() : null;
                  const elapsedLabel = orderDateMs ? formatElapsed(now - orderDateMs) : "--";
                  const statusClasses =
                    order.status === "PENDING"
                      ? "border-amber-500/50 bg-amber-500/10"
                      : order.status === "READY"
                      ? "border-sky-500/50 bg-sky-500/10"
                      : order.status === "OUT_FOR_DELIVERY"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : order.status === "CANCELLED"
                      ? "border-rose-500/40 bg-rose-500/10"
                      : "border-[#1f1f1f] bg-[#111111]";
                  return (
                    <div
                      key={order.id}
                      className={`border rounded-md p-2.5 hover:bg-[#161616] transition ${statusClasses} ${
                        isPending ? "order-flash-pending" : isReady ? "order-flash-ready" : ""
                      }`}
                    >
                      <button
                        onClick={() => focusOrder(order)}
                        className="w-full text-left"
                      >
                        <div className="text-sm font-semibold text-white truncate">{businessNames}</div>
                        <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                          {order.dropOffLocation?.address || "No dropoff address"}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">
                          {order.status} · 📍 {distanceLabel} · ⏱ {elapsedLabel}
                        </div>
                      </button>
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value, e)}
                          disabled={updatingStatusOrderId === order.id}
                          className="flex-1 text-[11px] bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1 text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="READY">Ready</option>
                          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <select
                          value={order.driver?.id || ""}
                          onChange={(e) => handleAssignDriver(order.id, e.target.value || null, e as any)}
                          disabled={assigningDriverOrderId === order.id}
                          className="flex-1 text-[11px] bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1 text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Driver</option>
                          {drivers.map((driver: any) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.firstName} {driver.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                      {((order.status === "OUT_FOR_DELIVERY" || order.status === "READY") && order.driver && orderDistances[order.id]) && (
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPolylines(prev => ({
                                ...prev,
                                [order.id]: !prev[order.id]
                              }));
                            }}
                            className={`text-[10px] px-2 py-1 rounded border transition ${
                              showPolylines[order.id]
                                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                                : "border-[#2a2a2a] text-neutral-400 hover:border-[#3a3a3a] hover:text-neutral-200"
                            }`}
                          >
                            {showPolylines[order.id] ? "Hide route" : "Show route"}
                          </button>
                          {orderDistances[order.id] && (
                            <div className="text-[10px] text-neutral-400">
                              ETA: {Math.round(
                                orderDistances[order.id].toPickup 
                                  ? orderDistances[order.id].toPickup.durationMin + orderDistances[order.id].toDropoff.durationMin
                                  : orderDistances[order.id].toDropoff.durationMin
                              )} min
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {drivers.length === 0 && (
                <div className="text-neutral-500 text-xs mt-2">No drivers online.</div>
              )}

              <div className="space-y-2">
                {drivers.map((driver: any) => (
                  <div
                    key={`driver-${driver.id}`}
                    className={`w-full bg-[#111111] border border-[#1f1f1f] rounded-md px-2 py-2 hover:bg-[#161616] transition ${
                      selectedDriverId === driver.id ? "border-emerald-500/60" : ""
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">
                      {driver.firstName} {driver.lastName}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {driver.driverLocationUpdatedAt ? "Live location" : "No location yet"}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedDriverId(driver.id);
                          focusDriver(driver);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded border border-[#2a2a2a] text-neutral-200 hover:text-white hover:border-[#3a3a3a] transition"
                      >
                        Focus
                      </button>
                      <button
                        onClick={() => {
                          const driverOrder = activeOrders.find(
                            (order: any) => order.driver?.id === driver.id
                          );
                          startDriverSimulation(driver, driverOrder);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded border transition ${
                          activeOrders.some((order: any) => order.driver?.id === driver.id)
                            ? "border-sky-500/40 text-sky-200 hover:border-sky-400/60"
                            : "border-[#2a2a2a] text-neutral-500 cursor-not-allowed"
                        }`}
                        disabled={!activeOrders.some((order: any) => order.driver?.id === driver.id)}
                      >
                        {simulatingDrivers[driver.id]
                          ? "Stop sim"
                          : (() => {
                              const driverOrder = activeOrders.find(
                                (order: any) => order.driver?.id === driver.id
                              );
                              if (!driverOrder) return "Simulate";
                              return driverOrder.status === "OUT_FOR_DELIVERY"
                                ? "Simulate delivery"
                                : "Simulate pickup";
                            })()}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDriverId(driver.id);
                          setDriverDetailsId(driver.id);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded border border-[#2a2a2a] text-neutral-200 hover:text-white hover:border-[#3a3a3a] transition"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
