"use client";

import React, { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client/react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import { MapPin, X, Filter, TrendingUp, Users, Clock, DollarSign, Package, Navigation, Phone, User, Store, Calendar, AlertCircle, Wifi, WifiOff, Signal, SignalLow, SignalZero } from "lucide-react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import { ALL_ORDERS_SUBSCRIPTION } from "@/graphql/operations/orders/subscriptions";
import { ASSIGN_DRIVER_TO_ORDER, UPDATE_ORDER_STATUS } from "@/graphql/operations/orders";
import { ADMIN_UPDATE_DRIVER_LOCATION } from "@/graphql/operations/users/mutations";
import { calculateRouteDistance } from "@/lib/utils/mapbox";
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";

// ==== CONSTANTS ====
const DEFAULT_CENTER = { latitude: 42.4635, longitude: 21.4694 };
const GJILAN_BOUNDS: [[number, number], [number, number]] = [[21.42, 42.43], [21.51, 42.5]];
const MIN_ZOOM = 11.5;
const MAX_ZOOM = 17;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "mapbox://styles/mapbox/streets-v12";

const ORDER_STATUS_COLORS = {
  PENDING: { bg: "bg-amber-500/10", border: "border-amber-500/50", text: "text-amber-500", marker: "#f59e0b", selectBg: "bg-amber-500/20" },
  READY: { bg: "bg-blue-500/10", border: "border-blue-500/50", text: "text-blue-500", marker: "#3b82f6", selectBg: "bg-blue-500/20" },
  OUT_FOR_DELIVERY: { bg: "bg-emerald-500/10", border: "border-emerald-500/50", text: "text-emerald-500", marker: "#10b981", selectBg: "bg-emerald-500/20" },
  DELIVERED: { bg: "bg-gray-500/10", border: "border-gray-500/50", text: "text-gray-500", marker: "#6b7280", selectBg: "bg-gray-500/20" },
  CANCELLED: { bg: "bg-rose-500/10", border: "border-rose-500/50", text: "text-rose-500", marker: "#ef4444", selectBg: "bg-rose-500/20" },
};

// Driver connection status styling
const DRIVER_CONNECTION_COLORS = {
  CONNECTED: { 
    bg: "bg-emerald-500", 
    bgLight: "bg-emerald-500/20", 
    border: "border-emerald-500", 
    text: "text-emerald-400", 
    ring: "ring-emerald-400",
    icon: Signal,
    label: "Connected",
    description: "Actively sending heartbeats"
  },
  STALE: { 
    bg: "bg-amber-500", 
    bgLight: "bg-amber-500/20", 
    border: "border-amber-500", 
    text: "text-amber-400", 
    ring: "ring-amber-400",
    icon: SignalLow,
    label: "Stale",
    description: "No heartbeat for 15s (warning)"
  },
  LOST: { 
    bg: "bg-rose-500", 
    bgLight: "bg-rose-500/20", 
    border: "border-rose-500", 
    text: "text-rose-400", 
    ring: "ring-rose-400",
    icon: SignalZero,
    label: "Lost",
    description: "No heartbeat for 30s (offline)"
  },
  DISCONNECTED: { 
    bg: "bg-slate-600", 
    bgLight: "bg-slate-600/20", 
    border: "border-slate-600", 
    text: "text-slate-400", 
    ring: "ring-slate-500",
    icon: WifiOff,
    label: "Offline",
    description: "Not connected"
  },
};

// ==== UTILITY FUNCTIONS ====
const isValidLatLng = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

const formatHeartbeatElapsed = (lastHeartbeat: string | null | undefined, now: number) => {
  if (!lastHeartbeat) return "Never";
  const elapsed = now - new Date(lastHeartbeat).getTime();
  if (elapsed < 0) return "Just now";
  if (elapsed < 5000) return "Just now";
  if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
  return `${Math.floor(elapsed / 3600000)}h ago`;
};

// Check if driver can be assigned orders
const isDriverAssignable = (driver: any) => {
  const connectionStatus = driver?.driverConnection?.connectionStatus ?? 'DISCONNECTED';
  const onlinePreference = driver?.driverConnection?.onlinePreference ?? false;
  // Driver must be online preference ON and connection status is CONNECTED or STALE (grace period)
  return onlinePreference && (connectionStatus === 'CONNECTED' || connectionStatus === 'STALE');
};

// Maximum number of active orders a single driver can have
const MAX_DRIVER_ACTIVE_ORDERS = 2;

const getActiveCountForDriver = (driverId: string, activeOrders: any[]) => {
  if (!driverId) return 0;
  return activeOrders.filter((o: any) => o.driver?.id === driverId).length;
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

type AnimatedDriverPoint = {
  latitude: number;
  longitude: number;
};

type DriverMotionTarget = {
  latitude: number;
  longitude: number;
  timestamp: number;
  velocityLatPerSec: number;
  velocityLngPerSec: number;
  updatedAtMs: number;
};

export default function MapPage() {
  const { data: businessesData } = useQuery<any>(GET_BUSINESSES);
  const { data: driversData } = useQuery<any>(DRIVERS_QUERY, { fetchPolicy: 'cache-and-network' });
  const { data: driversSubscriptionData } = useSubscription<any>(DRIVERS_UPDATED_SUBSCRIPTION);
  const { data: subscriptionData } = useSubscription<any>(ALL_ORDERS_SUBSCRIPTION);
  const { data: ordersData } = useQuery<any>(GET_ORDERS, { fetchPolicy: 'cache-and-network' });
  
  const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
  const [adminUpdateDriverLocation] = useMutation(ADMIN_UPDATE_DRIVER_LOCATION);

  // ==== STATE ====
  const mapRef = useRef<any>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "ALL" as string,
    driver: "ALL" as string,
    business: "ALL" as string,
    unassignedOnly: false,
  });
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [orderDistances, setOrderDistances] = useState<Record<string, any>>({});
  const [showPolylines, setShowPolylines] = useState<Record<string, boolean>>({});
  const [showDriverToBusinessRoute, setShowDriverToBusinessRoute] = useState<Record<string, boolean>>({});
  const [driverProgressOnRoute, setDriverProgressOnRoute] = useState<Record<string, number>>({});
  const [driverTracks, setDriverTracks] = useState<Record<string, any>>({});
  const [animatedDriverPositions, setAnimatedDriverPositions] = useState<Record<string, AnimatedDriverPoint>>({});
  const animatedDriverPositionsRef = useRef<Record<string, AnimatedDriverPoint>>({});
  const driverMotionTargetsRef = useRef<Record<string, DriverMotionTarget>>({});
  const lastAnimationFrameTsRef = useRef<number>(0);
  const lastDriverLocationUpdateMsRef = useRef<Record<string, number>>({});
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null);
  const [showDriversPanel, setShowDriversPanel] = useState(false);
  const [statusChangeTime, setStatusChangeTime] = useState<Record<string, number>>({});
  const orderRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevOrderStatusRef = useRef<Record<string, string>>({});
  
  // Camera tracking state
  const [followingDriverId, setFollowingDriverId] = useState<string | null>(null);

  // ==== DATA ====
  const orders = useMemo(() => subscriptionData?.allOrdersUpdated ?? ordersData?.orders ?? [], [subscriptionData, ordersData]);
  const drivers = useMemo(() => driversSubscriptionData?.driversUpdated ?? driversData?.drivers ?? [], [driversSubscriptionData, driversData]);
  const businesses = useMemo(() => businessesData?.businesses ?? [], [businessesData]);

  const activeOrders = useMemo(
    () => orders.filter((order: any) => order.status !== "DELIVERED" && order.status !== "CANCELLED"),
    [orders]
  );

  // ==== FILTERED ORDERS ====
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order: any) => {
      if (filters.status !== "ALL" && order.status !== filters.status) return false;
      if (filters.driver !== "ALL" && order.driver?.id !== filters.driver) return false;
      if (filters.business !== "ALL" && !order.businesses?.some((b: any) => b.business?.id === filters.business)) return false;
      if (filters.unassignedOnly && order.driver) return false;
      return true;
    });
  }, [activeOrders, filters]);

  const selectedOrder = useMemo(
    () => activeOrders.find((o: any) => o.id === selectedOrderId) ?? null,
    [activeOrders, selectedOrderId]
  );

  // ==== STATS ====
  const stats = useMemo(() => {
    const activeCount = activeOrders.length;
    const availableDrivers = drivers.filter((d: any) => getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS).length;
    const busyDrivers = drivers.length - availableDrivers;
    const todayOrders = orders.filter((o: any) => {
      const orderDate = o.orderDate ? new Date(o.orderDate) : null;
      return orderDate && orderDate.toDateString() === new Date().toDateString();
    }).length;
    const avgDeliveryTime = "~25m";
    const todayRevenue = orders
      .filter((o: any) => {
        const orderDate = o.orderDate ? new Date(o.orderDate) : null;
        return orderDate && orderDate.toDateString() === new Date().toDateString() && o.status === "DELIVERED";
      })
      .reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);

    // Find oldest pending order
    const pendingOrders = activeOrders.filter((o: any) => o.status === 'PENDING');
    const oldestPending = pendingOrders.reduce((oldest: any, order: any) => {
      if (!order.orderDate) return oldest;
      if (!oldest || new Date(order.orderDate) < new Date(oldest.orderDate)) {
        return order;
      }
      return oldest;
    }, null);

    const oldestPendingTime = oldestPending?.orderDate ? new Date(oldestPending.orderDate).getTime() : null;

    // Driver connection stats
    const driverStats = {
      connected: drivers.filter((d: any) => d.driverConnection?.connectionStatus === 'CONNECTED').length,
      stale: drivers.filter((d: any) => d.driverConnection?.connectionStatus === 'STALE').length,
      lost: drivers.filter((d: any) => d.driverConnection?.connectionStatus === 'LOST').length,
      disconnected: drivers.filter((d: any) => d.driverConnection?.connectionStatus === 'DISCONNECTED' || !d.driverConnection?.connectionStatus).length,
      assignable: drivers.filter((d: any) => isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS).length,
    };

    return { activeCount, availableDrivers, busyDrivers, todayOrders, avgDeliveryTime, todayRevenue, oldestPendingTime, driverStats };
  }, [activeOrders, drivers, orders]);

  // ==== DRIVER MAP FOR QUICK LOOKUP ====
  const driverMap = useMemo(() => {
    const map: Record<string, any> = {};
    drivers.forEach((driver: any) => {
      map[driver.id] = driver;
    });
    return map;
  }, [drivers]);

  // ==== FILTERED DRIVERS ====
  const filteredDrivers = useMemo(() => {
    let result = [...drivers];
    
    if (driverFilter !== 'ALL') {
      result = result.filter((d: any) => {
        const status = d.driverConnection?.connectionStatus ?? 'DISCONNECTED';
        if (driverFilter === 'ASSIGNABLE') return isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS;
        if (driverFilter === 'BUSY') return getActiveCountForDriver(d.id, activeOrders) > 0;
        if (driverFilter === 'FREE') return getActiveCountForDriver(d.id, activeOrders) === 0;
        return status === driverFilter;
      });
    }
    
    // Sort by connection status (connected first)
    result.sort((a: any, b: any) => {
      const statusOrder = { CONNECTED: 0, STALE: 1, LOST: 2, DISCONNECTED: 3 };
      const statusA = a.driverConnection?.connectionStatus ?? 'DISCONNECTED';
      const statusB = b.driverConnection?.connectionStatus ?? 'DISCONNECTED';
      return (statusOrder[statusA as keyof typeof statusOrder] ?? 3) - (statusOrder[statusB as keyof typeof statusOrder] ?? 3);
    });
    
    return result;
  }, [drivers, driverFilter, activeOrders]);

  // Driver lookup map
  const driversMap = useMemo(() => {
    const map: Record<string, any> = {};
    drivers.forEach((driver: any) => {
      map[driver.id] = driver;
    });
    return map;
  }, [drivers]);

  // ==== CLOCK TICK ====
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ==== CAMERA TRACKING: Follow driver in real-time ====
  useEffect(() => {
    if (!followingDriverId || !mapRef.current) return;
    
    const followedTrack = driverTracks[followingDriverId];
    if (!followedTrack) return;
    
    const pos = animatedDriverPositions[followingDriverId] || followedTrack.to;
    if (!isValidLatLng(pos?.latitude, pos?.longitude)) return;
    
    // Smoothly fly to driver position during continuous tracking (zoom 16 for driver tracking)
    // Use short duration for smoother real-time following
    mapRef.current.flyTo({
      center: [pos.longitude, pos.latitude],
      zoom: 16,
      duration: 400,
      pitch: 0,
    });
  }, [followingDriverId, driverTracks, animatedDriverPositions]);

  // ==== TRACK STATUS CHANGES ====
  useEffect(() => {
    setStatusChangeTime((prev) => {
      const next = { ...prev };
      activeOrders.forEach((order: any) => {
        const prevStatus = prevOrderStatusRef.current[order.id];
        
        // Initialize for new orders
        if (!prevStatus) {
          // For PENDING orders, use orderDate (or fallback to now)
          // For non-PENDING orders, also use orderDate since it's the creation time
          const orderDate = order.orderDate ? new Date(order.orderDate).getTime() : now;
          next[order.id] = order.status === 'PENDING' ? orderDate : now;
          prevOrderStatusRef.current[order.id] = order.status;
        }
        // When status changes, always update to current time
        else if (prevStatus !== order.status) {
          next[order.id] = now;
          prevOrderStatusRef.current[order.id] = order.status;
        }
      });
      return next;
    });
  }, [activeOrders.map((o: any) => `${o.id}-${o.status}`).join(','), now, orderDistances, showPolylines, showDriverToBusinessRoute]);

  // ==== DRIVER TRACKING ====
  useEffect(() => {
    if (!drivers.length) return;

    const nowTs = Date.now();

    setDriverTracks((prev) => {
      const next = { ...prev } as Record<string, any>;
      drivers.forEach((driver: any) => {
        const location = driver.driverLocation;
        if (!location?.latitude || !location?.longitude) return;
        const newPos = { latitude: location.latitude, longitude: location.longitude };

        // Update motion target for predictive interpolation
        const trackId = driver.id;
        const previousTarget = driverMotionTargetsRef.current[trackId];
        const updatedAtMs = driver.driverLocationUpdatedAt
          ? new Date(driver.driverLocationUpdatedAt).getTime()
          : nowTs;

        const lastSeenUpdateMs = lastDriverLocationUpdateMsRef.current[trackId] ?? 0;
        if (updatedAtMs <= lastSeenUpdateMs && previousTarget) {
          next[driver.id] = {
            id: driver.id,
            name: `${driver.firstName} ${driver.lastName}`.trim(),
            to: { latitude: previousTarget.latitude, longitude: previousTarget.longitude },
            updatedAt: driver.driverLocationUpdatedAt,
          };
          return;
        }

        lastDriverLocationUpdateMsRef.current[trackId] = updatedAtMs;

        let velocityLatPerSec = 0;
        let velocityLngPerSec = 0;

        if (previousTarget) {
          const deltaSec = Math.max((updatedAtMs - previousTarget.updatedAtMs) / 1000, 0.001);
          const rawVelocityLat = (newPos.latitude - previousTarget.latitude) / deltaSec;
          const rawVelocityLng = (newPos.longitude - previousTarget.longitude) / deltaSec;

          const rawSpeedDegPerSec = Math.hypot(rawVelocityLat, rawVelocityLng);
          const minMovingSpeedDegPerSec = 0.0000025; // ~0.28 m/s around Gjilan

          if (rawSpeedDegPerSec < minMovingSpeedDegPerSec) {
            velocityLatPerSec = previousTarget.velocityLatPerSec * 0.92;
            velocityLngPerSec = previousTarget.velocityLngPerSec * 0.92;
          } else {
            const velocityBlend = 0.35;
            velocityLatPerSec =
              previousTarget.velocityLatPerSec * (1 - velocityBlend) + rawVelocityLat * velocityBlend;
            velocityLngPerSec =
              previousTarget.velocityLngPerSec * (1 - velocityBlend) + rawVelocityLng * velocityBlend;
          }
        }

        driverMotionTargetsRef.current[trackId] = {
          latitude: newPos.latitude,
          longitude: newPos.longitude,
          timestamp: nowTs,
          velocityLatPerSec,
          velocityLngPerSec,
          updatedAtMs,
        };

        if (!animatedDriverPositionsRef.current[trackId]) {
          animatedDriverPositionsRef.current[trackId] = newPos;
        }
        
        next[driver.id] = {
          id: driver.id,
          name: `${driver.firstName} ${driver.lastName}`.trim(),
          to: newPos,
          updatedAt: driver.driverLocationUpdatedAt,
        };
      });
      return next;
    });

    // Update progress on route for active deliveries
    activeOrders.forEach((order: any) => {
      if (order.status === 'OUT_FOR_DELIVERY' && order.driver) {
        const driver = drivers.find((d: any) => d.id === order.driver.id);
        const driverLocation = driver?.driverLocation;
        const routeGeometry = orderDistances[order.id]?.toDropoff?.geometry;

        if (driverLocation && routeGeometry && routeGeometry.length > 0) {
          let minDist = Infinity;
          let closestIndex = 0;

          routeGeometry.forEach((coord: [number, number], idx: number) => {
            const dist = Math.hypot(coord[0] - driverLocation.longitude, coord[1] - driverLocation.latitude);
            if (dist < minDist) {
              minDist = dist;
              closestIndex = idx;
            }
          });

          const progress = routeGeometry.length > 1 ? closestIndex / (routeGeometry.length - 1) : 0;
          setDriverProgressOnRoute((prev) => ({ ...prev, [order.driver.id]: progress }));
        }
      }
    });
  }, [drivers, activeOrders, orderDistances]);

  // ==== SMOOTH MARKER ANIMATION ====
  useEffect(() => {
    let rafId: number;
    
    const animate = (frameTs: number) => {
      if (!lastAnimationFrameTsRef.current) {
        lastAnimationFrameTsRef.current = frameTs;
      }

      const dtMs = Math.max(frameTs - lastAnimationFrameTsRef.current, 1);
      lastAnimationFrameTsRef.current = frameTs;

      const now = Date.now();
      const nextAnimated = { ...animatedDriverPositionsRef.current };
      let hasAnyDriver = false;

      Object.entries(driverMotionTargetsRef.current).forEach(([driverId, target]) => {
        hasAnyDriver = true;

        const ageSec = Math.max((now - target.timestamp) / 1000, 0);
        const lookAheadSec = 1.2;
        const staleAfterSec = 10;
        const decaySec = Math.max(ageSec - staleAfterSec, 0);
        const staleDecay = Math.exp(-decaySec / 4);
        const predictionWindowSec = Math.min(ageSec + lookAheadSec, 14);

        const predictedLat =
          target.latitude + target.velocityLatPerSec * staleDecay * predictionWindowSec;
        const predictedLng =
          target.longitude + target.velocityLngPerSec * staleDecay * predictionWindowSec;

        const current =
          nextAnimated[driverId] || {
            latitude: target.latitude,
            longitude: target.longitude,
          };

        const tauMs = 300;
        const alpha = 1 - Math.exp(-dtMs / tauMs);

        nextAnimated[driverId] = {
          latitude: current.latitude + (predictedLat - current.latitude) * alpha,
          longitude: current.longitude + (predictedLng - current.longitude) * alpha,
        };
      });

      if (hasAnyDriver) {
        animatedDriverPositionsRef.current = nextAnimated;
        setAnimatedDriverPositions(nextAnimated);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      lastAnimationFrameTsRef.current = 0;
    };
  }, []);

  const ROUTE_RECALC_MIN_MS = 60000;
  const ROUTE_RECALC_MIN_METERS = 80;
  const lastRouteCalcRef = useRef<
    Record<string, { timestamp: number; latitude: number; longitude: number }>
  >({});

  const haversineMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const shouldRecalculateRoute = (
    orderId: string,
    driverPos: { latitude: number; longitude: number }
  ) => {
    const prev = lastRouteCalcRef.current[orderId];
    const now = Date.now();

    if (!prev) {
      lastRouteCalcRef.current[orderId] = {
        timestamp: now,
        latitude: driverPos.latitude,
        longitude: driverPos.longitude,
      };
      return true;
    }

    const elapsed = now - prev.timestamp;
    const moved = haversineMeters(prev, driverPos);

    if (elapsed < ROUTE_RECALC_MIN_MS && moved < ROUTE_RECALC_MIN_METERS) {
      return false;
    }

    lastRouteCalcRef.current[orderId] = {
      timestamp: now,
      latitude: driverPos.latitude,
      longitude: driverPos.longitude,
    };
    return true;
  };

  // ==== ROUTE CALCULATION ====
  useEffect(() => {
    const calculateDistances = async () => {
      for (const order of activeOrders) {
        const cacheKey = `${order.id}-${order.driver?.id || 'none'}-${order.status}`;
        const existingKey = orderDistances[order.id]
          ? `${order.id}-${orderDistances[order.id].driverId || 'none'}-${orderDistances[order.id].status}`
          : null;

        if (existingKey === cacheKey) continue;

        const firstBusiness = order.businesses?.[0]?.business;
        if (!firstBusiness?.location || !order.dropOffLocation) continue;

        const pickup = {
          longitude: firstBusiness.location.longitude,
          latitude: firstBusiness.location.latitude,
        };

        const dropoff = {
          longitude: order.dropOffLocation.longitude,
          latitude: order.dropOffLocation.latitude,
        };

        try {
          if ((order.status === 'READY' || order.status === 'PENDING') && order.driver) {
            console.log(`Calculating route for ${order.status} order:`, order.id);
            const driver = drivers.find((d: any) => d.id === order.driver.id);
            const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
            if (!driverLocation) {
              console.warn('Driver location not found for order:', order.id);
              continue;
            }

            const driverPos = {
              longitude: driverLocation.longitude,
              latitude: driverLocation.latitude,
            };

            if (!shouldRecalculateRoute(order.id, driverPos)) {
              continue;
            }

            const [toPickupRoute, toDropoffRoute] = await Promise.all([
              calculateRouteDistance(driverPos, pickup),
              calculateRouteDistance(pickup, dropoff),
            ]);

            if (toPickupRoute && toDropoffRoute) {
              console.log('Routes calculated successfully for order:', order.id);
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
            const driver = drivers.find((d: any) => d.id === order.driver.id);
            const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
            if (!driverLocation) continue;

            const driverPos = {
              longitude: driverLocation.longitude,
              latitude: driverLocation.latitude,
            };

            if (!shouldRecalculateRoute(order.id, driverPos)) {
              continue;
            }

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
          } else if (!order.driver) {
            // Calculate distance for unassigned orders (for display purposes)
            const route = await calculateRouteDistance(pickup, dropoff);
            if (route) {
              setOrderDistances((prev) => ({
                ...prev,
                [order.id]: {
                  toDropoff: route,
                  driverId: null,
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

  // ==== AUTO-SHOW ROUTE WHEN ORDER IS SELECTED ====
  useEffect(() => {
    setShowPolylines((prev) => {
      const next = { ...prev };
      
      // Hide all polylines first
      Object.keys(next).forEach(key => {
        next[key] = false;
      });
      
      // Show the selected order's polyline if it has route data (assigned or unassigned)
      if (selectedOrder && orderDistances[selectedOrder.id]) {
        next[selectedOrder.id] = true;
      }
      
      return next;
    });
  }, [selectedOrder?.id, orderDistances[selectedOrder?.id || '']]);

  // ==== ACTIONS ====
  const handleAssignDriver = async (orderId: string, driverId: string | null) => {
    try {
      console.log('Assigning driver:', { orderId, driverId });
      const result = await assignDriver({
        variables: { id: orderId, driverId },
        refetchQueries: ['GetOrders'],
        awaitRefetchQueries: true,
      });
      console.log('Assignment successful:', result);
      // Switch to orders panel to see the update
      setShowDriversPanel(false);
      // Auto-show route after assignment
      if (driverId) {
        setTimeout(() => {
          setShowPolylines(prev => ({ ...prev, [orderId]: true }));
        }, 500);
      }
    } catch (error: any) {
      console.error('Assignment error:', error);
      alert(error.message || "Failed to assign driver");
    }
  };

  const handleAutoAssign = async (orderId: string) => {
    try {
      console.log('Auto-assign started for order:', orderId);
      const order = activeOrders.find((o: any) => o.id === orderId);
      if (!order) {
        console.error('Order not found:', orderId);
        alert("Order not found");
        return;
      }

      const firstBusiness = order.businesses?.[0]?.business;
      let pickup = null;
      
      // Try to get location from order's business
      if (firstBusiness?.location?.latitude && firstBusiness?.location?.longitude) {
        pickup = { latitude: firstBusiness.location.latitude, longitude: firstBusiness.location.longitude };
      } else if (firstBusiness?.id && businesses.length > 0) {
        // Fallback: lookup business in full businesses list
        const fullBusiness = businesses.find((b: any) => b.id === firstBusiness.id);
        if (fullBusiness?.location?.latitude && fullBusiness?.location?.longitude) {
          pickup = { latitude: fullBusiness.location.latitude, longitude: fullBusiness.location.longitude };
        }
      }
      
      if (!pickup) {
        console.error('Business location not found for order:', orderId, firstBusiness);
        alert("Business location not available");
        return;
      }
      console.log('Pickup location:', pickup);

      // Find nearest available driver (must be assignable - CONNECTED or STALE, with online preference ON)
      const availableDrivers = drivers.filter((d: any) => {
        const hasLocation = d.driverLocation?.latitude && d.driverLocation?.longitude;
        const isBusy = getActiveCountForDriver(d.id, activeOrders) > 0;
        const canAssign = isDriverAssignable(d);
        return hasLocation && !isBusy && canAssign;
      });

      console.log('Available assignable drivers:', availableDrivers.length);

      if (availableDrivers.length === 0) {
        alert("No available drivers found. Ensure drivers are online and connected.");
        return;
      }

      let nearestDriver = availableDrivers[0];
      let minDistance = Infinity;

      availableDrivers.forEach((driver: any) => {
        const dist = distanceMeters(pickup, {
          latitude: driver.driverLocation.latitude,
          longitude: driver.driverLocation.longitude,
        });
        console.log(`Driver ${driver.firstName} ${driver.lastName} distance:`, dist);
        if (dist < minDistance) {
          minDistance = dist;
          nearestDriver = driver;
        }
      });

      console.log('Nearest driver selected:', nearestDriver.firstName, nearestDriver.lastName, 'Distance:', minDistance);
      await handleAssignDriver(orderId, nearestDriver.id);
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      alert(error.message || "Failed to auto-assign driver");
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus({
        variables: { id: orderId, status },
        refetchQueries: ['GetOrders'],
      });
    } catch (error: any) {
      alert(error.message || "Failed to update status");
    }
  };

  const focusOrder = (order: any) => {
    const map = mapRef.current?.getMap?.();
    if (!map || !order.dropOffLocation) return;
    map.flyTo({
      center: [order.dropOffLocation.longitude, order.dropOffLocation.latitude],
      zoom: 15,
      essential: true,
    });
  };

  return (
    <div className="h-screen flex bg-[#09090b] text-white">
      {/* ==== LEFT SIDEBAR ==== */}
      <div className="w-72 bg-[#111111] border-r border-[#1f1f1f] flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-[#1f1f1f]">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm hover:text-white transition mb-2"
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>
          {showFilters && (
            <div className="space-y-2 mt-2">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-xs"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="READY">Ready</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              </select>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.unassignedOnly}
                  onChange={(e) => setFilters({ ...filters, unassignedOnly: e.target.checked })}
                  className="rounded"
                />
                Unassigned Only
              </label>
            </div>
          )}
        </div>

        {/* Orders/Drivers Toggle */}
        <div className="border-b border-[#1f1f1f] flex">
          <button
            onClick={() => setShowDriversPanel(false)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              !showDriversPanel ? "text-white border-b-2 border-emerald-400" : "text-zinc-500 hover:text-white"
            }`}
          >
            Orders ({filteredOrders.length})
          </button>
          <button
            onClick={() => setShowDriversPanel(true)}
            className={`flex-1 py-2 text-xs font-medium transition flex items-center justify-center gap-2 ${
              showDriversPanel ? "text-white border-b-2 border-blue-400" : "text-zinc-500 hover:text-white"
            }`}
          >
            <span>Drivers</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
              <span className="text-emerald-400">{stats.driverStats.connected}</span>
              {stats.driverStats.stale > 0 && (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Stale" />
                  <span className="text-amber-400">{stats.driverStats.stale}</span>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Orders/Drivers List */}
        <div className="flex-1 overflow-y-auto" id="orders-list-container">
          {!showDriversPanel ? (
            <div className="p-4 space-y-2">
              {filteredOrders.map((order: any) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  orderDistances={orderDistances}
                  now={now}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setShowDriversPanel(false);
                  }}
                  isSelected={selectedOrderId === order.id}
                  ref={(el: HTMLDivElement | null) => {
                    orderRefs.current[order.id] = el;
                  }}
                  onFocus={() => focusOrder(order)}
                  statusChangeTime={statusChangeTime}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Driver Stats Summary */}
              <div className="p-3 border-b border-[#1f1f1f] bg-[#09090b]">
                <div className="grid grid-cols-5 gap-1 text-center">
                  <button 
                    onClick={() => setDriverFilter(driverFilter === 'CONNECTED' ? 'ALL' : 'CONNECTED')}
                    className={`p-1.5 rounded ${driverFilter === 'CONNECTED' ? 'bg-emerald-500/30 ring-1 ring-emerald-500' : 'hover:bg-emerald-500/10'} transition`}
                  >
                    <div className="text-sm font-bold text-emerald-400">{stats.driverStats.connected}</div>
                    <div className="text-[8px] text-emerald-400/70 uppercase">Connected</div>
                  </button>
                  <button 
                    onClick={() => setDriverFilter(driverFilter === 'STALE' ? 'ALL' : 'STALE')}
                    className={`p-1.5 rounded ${driverFilter === 'STALE' ? 'bg-amber-500/30 ring-1 ring-amber-500' : 'hover:bg-amber-500/10'} transition`}
                  >
                    <div className="text-sm font-bold text-amber-400">{stats.driverStats.stale}</div>
                    <div className="text-[8px] text-amber-400/70 uppercase">Stale</div>
                  </button>
                  <button 
                    onClick={() => setDriverFilter(driverFilter === 'LOST' ? 'ALL' : 'LOST')}
                    className={`p-1.5 rounded ${driverFilter === 'LOST' ? 'bg-rose-500/30 ring-1 ring-rose-500' : 'hover:bg-rose-500/10'} transition`}
                  >
                    <div className="text-sm font-bold text-rose-400">{stats.driverStats.lost}</div>
                    <div className="text-[8px] text-rose-400/70 uppercase">Lost</div>
                  </button>
                  <button 
                    onClick={() => setDriverFilter(driverFilter === 'DISCONNECTED' ? 'ALL' : 'DISCONNECTED')}
                    className={`p-1.5 rounded ${driverFilter === 'DISCONNECTED' ? 'bg-slate-500/30 ring-1 ring-slate-500' : 'hover:bg-slate-500/10'} transition`}
                  >
                    <div className="text-sm font-bold text-slate-400">{stats.driverStats.disconnected}</div>
                    <div className="text-[8px] text-slate-400/70 uppercase">Offline</div>
                  </button>
                  <button 
                    onClick={() => setDriverFilter(driverFilter === 'ASSIGNABLE' ? 'ALL' : 'ASSIGNABLE')}
                    className={`p-1.5 rounded ${driverFilter === 'ASSIGNABLE' ? 'bg-blue-500/30 ring-1 ring-blue-500' : 'hover:bg-blue-500/10'} transition`}
                  >
                    <div className="text-sm font-bold text-blue-400">{stats.driverStats.assignable}</div>
                    <div className="text-[8px] text-blue-400/70 uppercase">Ready</div>
                  </button>
                </div>
                {driverFilter !== 'ALL' && (
                  <button 
                    onClick={() => setDriverFilter('ALL')}
                    className="mt-2 w-full text-[10px] text-zinc-500 hover:text-white transition flex items-center justify-center gap-1"
                  >
                    <X size={10} />
                    Clear filter ({filteredDrivers.length} shown)
                  </button>
                )}
              </div>
              
              {/* Driver List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredDrivers.length === 0 ? (
                  <div className="text-center text-zinc-600 text-sm py-8">
                    No drivers match filter
                  </div>
                ) : (
                  filteredDrivers.map((driver: any) => (
                    <DriverCard 
                      key={driver.id} 
                      driver={driver} 
                      activeOrders={activeOrders} 
                      now={now}
                      onTrack={() => {
                        // Toggle tracking: if already tracking this driver, untrack; otherwise track
                        const newTrackingId = followingDriverId === driver.id ? null : driver.id;
                        setFollowingDriverId(newTrackingId);
                        
                        // Immediately jump to driver position when starting to track
                        if (newTrackingId && mapRef.current) {
                          const track = driverTracks[driver.id];
                          if (track?.to?.latitude && track?.to?.longitude) {
                            mapRef.current.jumpTo({
                              center: [track.to.longitude, track.to.latitude],
                              zoom: 16,
                            });
                          }
                        }
                      }}
                      isTracking={followingDriverId === driver.id}
                    />
                  ))
                )}
              </div>
              
              {/* Legend */}
              <div className="p-2 border-t border-[#1f1f1f] bg-[#09090b] flex items-center justify-center gap-3 text-[9px]">
                <span className="text-emerald-400 flex items-center gap-1"><Signal size={10} /> Active</span>
                <span className="text-amber-400 flex items-center gap-1"><SignalLow size={10} /> Warning</span>
                <span className="text-rose-400 flex items-center gap-1"><SignalZero size={10} /> Offline</span>
                <span className="text-slate-400 flex items-center gap-1"><WifiOff size={10} /> Disconnected</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==== MAP ==== */}
      <div className="flex-1 relative">
        {/* Floating Driver Status Widget */}
        <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 shadow-xl">
          <div className="px-3 py-2 border-b border-white/10">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">Driver Status</div>
          </div>
          <div className="px-3 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5" title="Connected (Active)">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-400">{stats.driverStats.connected}</span>
            </div>
            {stats.driverStats.stale > 0 && (
              <div className="flex items-center gap-1.5" title="Stale (Warning)">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-semibold text-amber-400">{stats.driverStats.stale}</span>
              </div>
            )}
            {stats.driverStats.lost > 0 && (
              <div className="flex items-center gap-1.5" title="Lost (Offline)">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-sm font-semibold text-rose-400">{stats.driverStats.lost}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5" title="Disconnected">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-sm font-semibold text-slate-400">{stats.driverStats.disconnected}</span>
            </div>
            <div className="border-l border-white/20 pl-3 ml-1">
              <span className="text-[10px] text-blue-400 uppercase">Assignable: <span className="font-semibold text-sm">{stats.driverStats.assignable}</span></span>
            </div>
          </div>
        </div>
        
        <Map
          ref={mapRef}
          initialViewState={{ latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude, zoom: 12 }}
          mapStyle={MAP_STYLE}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%" }}
          maxBounds={GJILAN_BOUNDS}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        >
          {/* Business Markers */}
          {businesses.map((business: any) => {
            if (!business.location?.latitude || !business.location?.longitude) return null;
            const isHovered = hoveredBusinessId === business.id;
            const isInactive = !business.isActive;

            return (
              <Marker
                key={`business-${business.id}`}
                longitude={business.location.longitude}
                latitude={business.location.latitude}
                anchor="center"
              >
                <div
                  className="relative flex items-center justify-center group cursor-pointer"
                  onMouseEnter={() => setHoveredBusinessId(business.id)}
                  onMouseLeave={() => setHoveredBusinessId(null)}
                >
                  {/* Main marker */}
                  <div className={`relative w-3 h-3 rounded-full ${
                    isInactive ? 'bg-slate-400' : 'bg-violet-600'
                  } shadow-md hover:scale-125 transition-all ${
                    isHovered ? 'ring-2 ring-violet-400 ring-offset-1' : ''
                  }`}>
                  </div>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-3 bg-black/95 text-white rounded-xl shadow-2xl z-[100] border border-white/20 overflow-hidden backdrop-blur-sm min-w-[240px] pointer-events-none">
                      {/* Business image */}
                      {business.imageUrl && (
                        <div className="w-full h-32 bg-gradient-to-br from-violet-500/20 to-purple-500/20 relative overflow-hidden">
                          <img
                            src={business.imageUrl}
                            alt={business.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Business info */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <Store size={20} className="text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base mb-1">{business.name}</div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                              <span className={`px-2 py-0.5 rounded ${
                                business.businessType === 'RESTAURANT' 
                                  ? 'bg-orange-500/20 text-orange-400' 
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {business.businessType}
                              </span>
                              {isInactive && (
                                <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">
                                  INACTIVE
                                </span>
                              )}
                            </div>
                            {business.location?.address && (
                              <div className="text-xs text-zinc-500 flex items-start gap-1 mb-2">
                                <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                                <span className="line-clamp-2">{business.location.address}</span>
                              </div>
                            )}
                            {business.phoneNumber && (
                              <div className="text-xs text-zinc-500 flex items-center gap-1">
                                <Phone size={12} />
                                <span>{business.phoneNumber}</span>
                              </div>
                            )}
                            {business.avgPrepTimeMinutes && (
                              <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                <Clock size={12} />
                                <span>~{business.avgPrepTimeMinutes} min prep time</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Arrow pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black/95" />
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}

          {/* Render polylines */}
          {activeOrders.map((order: any) => {
            if (!showPolylines[order.id] || !orderDistances[order.id]) {
              if (showPolylines[order.id] && !orderDistances[order.id]) {
                console.log('Polyline requested but no route data for order:', order.id);
              }
              return null;
            }
            const routes = orderDistances[order.id];

            // For unassigned orders, show just the business-to-customer route
            if (!order.driver && routes.toDropoff) {
              return (
                <Source
                  key={`order-route-${order.id}`}
                  id={`order-route-${order.id}`}
                  type="geojson"
                  data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toDropoff.geometry } }}
                >
                  <Layer id={`order-route-casing-${order.id}`} type="line" paint={{ "line-color": "#78350f", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  <Layer id={`order-route-line-${order.id}`} type="line" paint={{ "line-color": "#f59e0b", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                </Source>
              );
            } else if (order.driver && (order.status === 'READY' || order.status === 'PENDING') && routes.toPickup && routes.toDropoff) {
              return (
                <Fragment key={`order-routes-${order.id}`}>
                  <Source
                    id={`order-to-pickup-${order.id}`}
                    type="geojson"
                    data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toPickup.geometry } }}
                  >
                    <Layer id={`order-to-pickup-casing-${order.id}`} type="line" paint={{ "line-color": "#1e3a8a", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                    <Layer id={`order-to-pickup-line-${order.id}`} type="line" paint={{ "line-color": "#3b82f6", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  </Source>
                  <Source
                    id={`order-to-dropoff-${order.id}`}
                    type="geojson"
                    data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toDropoff.geometry } }}
                  >
                    <Layer id={`order-to-dropoff-casing-${order.id}`} type="line" paint={{ "line-color": "#581c87", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                    <Layer id={`order-to-dropoff-line-${order.id}`} type="line" paint={{ "line-color": "#a855f7", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  </Source>
                </Fragment>
              );
            } else if (order.driver && order.status === 'OUT_FOR_DELIVERY' && routes.toDropoff) {
              const geometry = routes.toDropoff.geometry;
              const progress = driverProgressOnRoute[order.driver?.id] || 0;
              const startIndex = Math.floor(progress * geometry.length);
              const remainingGeometry = startIndex > 0 ? geometry.slice(startIndex) : geometry;
              if (remainingGeometry.length < 2) return null;

              return (
                <Source
                  key={`order-route-${order.id}`}
                  id={`order-route-${order.id}`}
                  type="geojson"
                  data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: remainingGeometry } }}
                >
                  <Layer id={`order-route-casing-${order.id}`} type="line" paint={{ "line-color": "#065f46", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  <Layer id={`order-route-line-${order.id}`} type="line" paint={{ "line-color": "#10b981", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                </Source>
              );
            }
            return null;
          })}

          {/* Render driver-to-business routes (separate toggle) */}
          {activeOrders.map((order: any) => {
            if (!order.driver || !showDriverToBusinessRoute[order.id] || !orderDistances[order.id]?.toPickup) {
              return null;
            }
            const route = orderDistances[order.id].toPickup;
            return (
              <Source
                key={`driver-to-business-${order.id}`}
                id={`driver-to-business-${order.id}`}
                type="geojson"
                data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.geometry } }}
              >
                <Layer id={`driver-to-business-casing-${order.id}`} type="line" paint={{ "line-color": "#1e40af", "line-width": 8, "line-opacity": 0.5 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                <Layer id={`driver-to-business-line-${order.id}`} type="line" paint={{ "line-color": "#60a5fa", "line-width": 4, "line-opacity": 0.8, "line-dasharray": [2, 2] }} layout={{ "line-cap": "round", "line-join": "round" }} />
              </Source>
            );
          })}

          {/* Order markers */}
          {filteredOrders.map((order: any) => {
            const drop = order.dropOffLocation;
            if (!drop?.latitude || !drop?.longitude) return null;
            const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
            const businessNames = order.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(", ") || "Order";
            const isHovered = hoveredOrderId === order.id;

            return (
              <Marker
                key={`order-${order.id}`}
                latitude={drop.latitude}
                longitude={drop.longitude}
                anchor="bottom"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setShowDriversPanel(false);
                  // Scroll to order in sidebar
                  setTimeout(() => {
                    const orderElement = orderRefs.current[order.id];
                    if (orderElement) {
                      orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
              >
                <div 
                  className="relative flex flex-col items-center cursor-pointer group"
                  onMouseEnter={() => setHoveredOrderId(order.id)}
                  onMouseLeave={() => setHoveredOrderId(null)}
                >
                  <div className="absolute inset-0 w-5 h-5 rounded-full bg-red-500 animate-ping opacity-50" />
                  <div className="relative w-5 h-5 rounded-full bg-violet-600 border-2 border-white flex items-center justify-center shadow-lg hover:scale-125 transition-transform">
                    <Package size={12} className="text-white" />
                  </div>
                  {isHovered && (
                    <div className="absolute bottom-full mb-3 px-4 py-3 bg-black text-white text-sm rounded-lg shadow-2xl whitespace-nowrap z-[100] pointer-events-none border-2 border-white/20">
                      <div className="font-semibold text-base">{businessNames}</div>
                      <div className={`${statusColor.text} mt-1.5 text-xs font-medium uppercase`}>{order.status.replace(/_/g, ' ')}</div>
                      {order.driver && (
                        <div className="text-zinc-400 text-xs mt-1.5 flex items-center gap-1">
                          <User size={12} />
                          {order.driver.firstName} {order.driver.lastName}
                        </div>
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black" />
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}

          {/* Driver markers */}
          {Object.values(driverTracks).map((track: any) => {
            const pos = animatedDriverPositions[track.id] || track.to;
            if (!isValidLatLng(pos?.latitude, pos?.longitude)) return null;
            const isBusy = getActiveCountForDriver(track.id, activeOrders) > 0;
            const driver = driverMap[track.id];
            // New architecture: onlinePreference (user toggle) vs connectionStatus (system-detected)
            const onlinePreference = driver?.driverConnection?.onlinePreference ?? false;
            const connectionStatus = (driver?.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
            const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus] || DRIVER_CONNECTION_COLORS.DISCONNECTED;
            const StatusIcon = statusStyle.icon;
            const isAssignable = isDriverAssignable(driver);
            const lastHeartbeat = driver?.driverConnection?.lastHeartbeatAt;
            const isFollowing = followingDriverId === track.id;

            return (
              <Marker key={`driver-${track.id}`} latitude={pos.latitude} longitude={pos.longitude} anchor="bottom">
                <div 
                  className={`relative flex flex-col items-center group cursor-pointer ${connectionStatus === 'DISCONNECTED' || connectionStatus === 'LOST' ? 'opacity-50' : ''} ${isFollowing ? 'ring-2 ring-offset-2 ring-blue-500 rounded-full' : ''}`}
                  onClick={() => {
                    // Toggle tracking: if already tracking this driver, untrack; otherwise track
                    const newTrackingId = isFollowing ? null : track.id;
                    setFollowingDriverId(newTrackingId);
                    
                    // Immediately jump to driver position when starting to track
                    if (newTrackingId && mapRef.current) {
                      mapRef.current.jumpTo({
                        center: [pos.longitude, pos.latitude],
                        zoom: 16,
                      });
                    }
                  }}
                >
                  {/* Following indicator ring */}
                  {isFollowing && (
                    <div className="absolute inset-0 w-12 h-12 -top-2 -left-2 rounded-full border-2 border-blue-400 animate-pulse" />
                  )}
                  
                  {/* Connection status indicator badge */}
                  <div className={`absolute -top-2 -right-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${connectionStatus === 'STALE' ? 'animate-pulse' : ''}`}>
                    <StatusIcon size={10} className="text-white" />
                  </div>
                  
                  {/* Busy ring indicator */}
                  {isBusy && connectionStatus === 'CONNECTED' && (
                    <div className="absolute inset-0 w-8 h-8 -top-1 -left-1 rounded-full border-2 border-emerald-400 animate-pulse" />
                  )}
                  
                  {/* Avatar */}
                  {driver ? (
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center font-bold text-white text-xs border-2 ${statusStyle.border} shadow-lg transition-all hover:scale-125 ${isBusy ? `ring-1.5 ${statusStyle.ring}` : ''}`}>
                      {getInitials(driver.firstName, driver.lastName)}
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full ${statusStyle.bg} border-2 border-white shadow-lg`} />
                  )}
                  
                  {/* Hover tooltip - Enhanced */}
                  <div className="absolute bottom-full mb-3 hidden group-hover:block bg-black/95 text-white text-xs rounded-lg shadow-2xl z-[100] border border-white/20 min-w-[220px] backdrop-blur-sm">
                    <div className="p-3">
                      <div className="font-semibold text-sm">
                        {driver ? `${driver.firstName} ${driver.lastName}` : track.name}
                      </div>
                      
                      {/* Connection Status */}
                      <div className={`flex items-center gap-2 mt-2 px-2 py-1 rounded ${statusStyle.bgLight}`}>
                        <StatusIcon size={12} className={statusStyle.text} />
                        <span className={`font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
                      </div>
                      
                      {/* Last heartbeat */}
                      <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                        <Clock size={10} />
                        Last heartbeat: {formatHeartbeatElapsed(lastHeartbeat, now)}
                      </div>
                      
                      {/* Online preference */}
                      <div className="text-[10px] mt-1 flex items-center gap-1">
                        <span className={onlinePreference ? 'text-emerald-400' : 'text-slate-400'}>
                          {onlinePreference ? 'âœ“ Online preference ON' : 'âœ— Online preference OFF'}
                        </span>
                      </div>
                      
                      {/* Location coordinates */}
                      <div className="text-[10px] text-zinc-400 mt-2 font-mono">
                        {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
                      </div>
                      
                      {/* Status badges */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${isBusy ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {isBusy ? 'BUSY' : 'FREE'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${isAssignable ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          {isAssignable ? 'ASSIGNABLE' : 'UNAVAILABLE'}
                        </span>
                        {isFollowing && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            ðŸ‘ï¸ TRACKING
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[9px] text-zinc-500 mt-2 pt-2 border-t border-white/10">
                        Click to {isFollowing ? 'stop' : 'start'} tracking
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black/95" />
                  </div>
                </div>
              </Marker>
            );
          })}
        </Map>
        
        {/* Floating Tracking Panel */}
        {followingDriverId && driverMap[followingDriverId] && (() => {
          const driver = driverMap[followingDriverId];
          const track = driverTracks[followingDriverId];
          const pos = animatedDriverPositions[followingDriverId] || track?.to;
          const connectionStatus = (driver?.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
          const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus];
          const StatusIcon = statusStyle.icon;
          
          return (
            <div className="absolute top-4 right-4 bg-black/90 border border-blue-500/50 rounded-lg p-4 max-w-xs backdrop-blur-sm shadow-2xl z-50">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusStyle.bg}`} />
                  <span className="text-sm font-semibold text-white">Tracking</span>
                </div>
                <button
                  onClick={() => setFollowingDriverId(null)}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors"
                  title="Stop tracking"
                >
                  <X size={16} className="text-zinc-500" />
                </button>
              </div>
              
              {/* Driver Info */}
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Driver</div>
                  <div className="text-sm font-semibold text-white">
                    {driver.firstName} {driver.lastName}
                  </div>
                </div>
                
                {/* Location */}
                {pos && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Location</div>
                    <div className="text-xs font-mono text-blue-300">
                      {pos.latitude.toFixed(5)}
                    </div>
                    <div className="text-xs font-mono text-blue-300">
                      {pos.longitude.toFixed(5)}
                    </div>
                  </div>
                )}
                
                {/* Connection Status */}
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Status</div>
                  <div className={`flex items-center gap-2 text-xs font-medium ${statusStyle.text}`}>
                    <StatusIcon size={12} />
                    {statusStyle.label}
                  </div>
                </div>
                
                {/* Last Heartbeat */}
                <div>
                  <div className="text-xs text-zinc-500 uppercase">Last Heartbeat</div>
                  <div className="text-xs text-zinc-400">
                    {formatHeartbeatElapsed(driver?.driverConnection?.lastHeartbeatAt, now)}
                  </div>
                </div>
              </div>
              
              {/* Stop Tracking Button */}
              <button
                onClick={() => setFollowingDriverId(null)}
                className="w-full mt-4 px-3 py-2 rounded-md bg-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-500/30 transition-colors border border-rose-500/50"
              >
                Stop Tracking
              </button>
            </div>
          );
        })()}
      </div>

      {/* ==== ORDER DETAIL DRAWER ==== */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          drivers={drivers}
          activeOrders={activeOrders}
          orderDistances={orderDistances}
          onClose={() => setSelectedOrderId(null)}
          onAssignDriver={handleAssignDriver}
          onAutoAssign={handleAutoAssign}
          onUpdateStatus={handleUpdateStatus}
          onTogglePolyline={() => {
            console.log('Toggle polyline for order:', selectedOrder.id, 'Current state:', showPolylines[selectedOrder.id]);
            setShowPolylines(prev => ({ ...prev, [selectedOrder.id]: !prev[selectedOrder.id] }));
          }}
          showPolyline={showPolylines[selectedOrder.id] || false}
          onToggleDriverToBusinessRoute={() => {
            setShowDriverToBusinessRoute(prev => ({ ...prev, [selectedOrder.id]: !prev[selectedOrder.id] }));
          }}
          showDriverToBusinessRoute={showDriverToBusinessRoute[selectedOrder.id] || false}
          onFocus={() => focusOrder(selectedOrder)}
          now={now}
          statusChangeTime={statusChangeTime}
        />
      )}
    </div>
  );
}

// ==== SUB-COMPONENTS ====

function StatCard({ icon, label, value, color, subtitle }: { icon: React.ReactNode; label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div className="bg-[#09090b] border border-[#1f1f1f] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={color}>{icon}</div>
        <span className="text-[10px] text-zinc-500 uppercase">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      {subtitle && <div className="text-[9px] text-zinc-600 mt-0.5">{subtitle}</div>}
    </div>
  );
}

const OrderCard = React.forwardRef(({ order, orderDistances, now, onClick, isSelected, onFocus, statusChangeTime }: any, ref: any) => {
  const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
  const businessNames = order.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(", ") || "Unknown";
  const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : "Unknown";
  const orderDateMs = order.orderDate ? new Date(order.orderDate).getTime() : now;
  const elapsedLabel = formatElapsed(now - orderDateMs);
  const statusElapsed = statusChangeTime[order.id] ? formatElapsed(now - statusChangeTime[order.id]) : "0m 0s";
  const distanceData = orderDistances[order.id];
  const etaMin = distanceData
    ? distanceData.toPickup
      ? Math.round(distanceData.toPickup.durationMin + distanceData.toDropoff.durationMin)
      : Math.round(distanceData.toDropoff.durationMin)
    : null;
  const isPending = order.status === 'PENDING';

  return (
    <button
      ref={ref}
      onClick={() => {
        onClick?.();
        onFocus?.();
      }}
      className={`w-full text-left p-3 rounded-lg border transition ${
        isSelected
          ? `${statusColor.bg} ${statusColor.border} border-2`
          : "bg-[#09090b] border-[#1f1f1f] hover:border-[#2a2a2a]"
      } ${isPending ? 'ring-2 ring-rose-500 ring-opacity-50 animate-pulse' : ''}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className={`text-[10px] font-semibold ${statusColor.text} uppercase flex items-center gap-1`}>
          {isPending && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
          {order.status.replace(/_/g, " ")}
        </div>
        <div className="text-[10px] text-zinc-600 text-right space-y-0.5">
          {isPending ? (
            <div className="text-zinc-500">{elapsedLabel}</div>
          ) : (
            <>
              <div className="flex justify-end gap-1">
                <span className="text-zinc-600">in status:</span>
                <span className="text-zinc-500">{statusElapsed}</span>
              </div>
              <div className="flex justify-end gap-1">
                <span className="text-zinc-600">total:</span>
                <span className="text-zinc-500">{elapsedLabel}</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="text-sm font-medium text-white mb-1">{businessNames}</div>
      <div className="text-xs text-zinc-500">â†’ {customerName}</div>
      {order.driver && (
        <div className="text-[10px] text-zinc-600 mt-1">
          Driver: {order.driver.firstName} {order.driver.lastName}
        </div>
      )}
      {etaMin && <div className="text-[10px] text-emerald-400 mt-1">ETA: {etaMin}min</div>}
    </button>
  );
});

OrderCard.displayName = 'OrderCard';

function OrderDetailDrawer({ order, drivers, activeOrders, orderDistances, onClose, onAssignDriver, onAutoAssign, onUpdateStatus, onTogglePolyline, showPolyline, onToggleDriverToBusinessRoute, showDriverToBusinessRoute, onFocus, now, statusChangeTime }: any) {
  const [selectedDriverId, setSelectedDriverId] = useState(order.driver?.id || "");
  const [showItems, setShowItems] = useState(false);
  const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
  const businessNames = order.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(", ") || "Unknown";
  const businessPhones = order.businesses?.map((b: any) => b.business?.phoneNumber).filter(Boolean).join(", ") || "";
  const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : "Unknown";
  const customerPhone = order.user?.phoneNumber || "";
  const distanceData = orderDistances[order.id];
  const etaMin = distanceData
    ? distanceData.toPickup
      ? Math.round(distanceData.toPickup.durationMin + distanceData.toDropoff.durationMin)
      : Math.round(distanceData.toDropoff.durationMin)
    : null;

  // Sync selectedDriverId with order changes
  useEffect(() => {
    setSelectedDriverId(order.driver?.id || "");
  }, [order.driver?.id]);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-[#111111] border-l border-[#1f1f1f] shadow-2xl overflow-y-auto z-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className={`text-xs font-semibold ${statusColor.text} uppercase mb-1`}>{order.status.replace(/_/g, " ")}</div>
            <h3 className="text-lg font-semibold text-white">Order Details</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Business Info */}
        <div className="bg-[#09090b] border border-[#1f1f1f] rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Store size={14} className="text-amber-400" />
            <span className="text-xs text-zinc-500 uppercase">Business</span>
          </div>
          <div className="text-sm font-medium text-white">{businessNames}</div>
          {businessPhones && (
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <Phone size={12} />
              {businessPhones}
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-[#09090b] border border-[#1f1f1f] rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase">Customer</span>
          </div>
          <div className="text-sm font-medium text-white">{customerName}</div>
          {customerPhone && (
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <Phone size={12} />
              {customerPhone}
            </div>
          )}
          {order.dropOffLocation?.address && (
            <div className="text-xs text-zinc-500 mt-2">{order.dropOffLocation.address}</div>
          )}
        </div>

        {/* Order Info */}
        <div className="bg-[#09090b] border border-[#1f1f1f] rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-emerald-400" />
            <span className="text-xs text-zinc-500 uppercase">Order Details</span>
          </div>
          <div className="text-xs text-zinc-500 space-y-1">
            <div>Value: â‚¬{order.totalPrice?.toFixed(2) || "0.00"}</div>
            <div>Payment: {order.paymentMethod || "Cash"}</div>
            {order.orderDate && (
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(order.orderDate).toLocaleString()}
              </div>
            )}
          </div>
          {order.notes && <div className="text-xs text-zinc-500 mt-2 italic">{order.notes}</div>}
          
          {/* Time Tracking */}
          <div className="mt-3 pt-3 border-t border-[#1f1f1f] space-y-1">
            {order.status === 'PENDING' ? (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Time pending:</span>
                <span className="text-zinc-400 font-medium">{formatElapsed(now - (order.orderDate ? new Date(order.orderDate).getTime() : now))}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">In {order.status.replace(/_/g, ' ')}:</span>
                  <span className="text-zinc-400 font-medium">{statusChangeTime[order.id] ? formatElapsed(now - statusChangeTime[order.id]) : '--'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Total time:</span>
                  <span className="text-zinc-400 font-medium">{formatElapsed(now - (order.orderDate ? new Date(order.orderDate).getTime() : now))}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Items */}
          {order.businesses && order.businesses.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1f1f1f]">
              <button
                onClick={() => setShowItems(!showItems)}
                className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase mb-2 hover:text-zinc-400 transition"
              >
                <span>{showItems ? 'â–¼' : 'â–¶'}</span>
                Items
              </button>
              {showItems && (
                <div className="space-y-1">
                  {order.businesses.flatMap((b: any) => 
                    (b.items || []).map((item: any, idx: number) => (
                      <div key={`${b.business?.id}-${idx}`} className="flex justify-between text-xs">
                        <span className="text-zinc-400">
                          {item.quantity}x {item.name || 'Item'}
                        </span>
                        <span className="text-zinc-500">â‚¬{((item.price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/*div className={`rounded-lg border-2 ${statusColor.border} ${statusColor.selectBg} overflow-hidden`}>
            <select
              value={order.status}
              onChange={(e) => onUpdateStatus(order.id, e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              <option value="PENDING" className="bg-[#09090b] text-white">Pending</option>
              <option value="READY" className="bg-[#09090b] text-white">Ready</option>
              <option value="OUT_FOR_DELIVERY" className="bg-[#09090b] text-white">Out for Delivery</option>
              <option value="DELIVERED" className="bg-[#09090b] text-white">Delivered</option>
              <option value="CANCELLED" className="bg-[#09090b] text-white">Cancelled</option>
            </select>
          </div
        {/* Status Control */}
        <div className="mb-3">
          <label className="text-xs text-zinc-500 uppercase mb-2 block">Update Status</label>
          <select
            value={order.status}
            onChange={(e) => onUpdateStatus(order.id, e.target.value)}
            className={`w-full border-2 rounded-lg px-3 py-2 text-sm font-medium text-white ${statusColor.selectBg} ${statusColor.border}`}
            style={{
              colorScheme: 'dark',
            }}
          >
            <option value="PENDING" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Pending</option>
            <option value="READY" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Ready</option>
            <option value="OUT_FOR_DELIVERY" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Out for Delivery</option>
            <option value="DELIVERED" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Delivered</option>
            <option value="CANCELLED" style={{ backgroundColor: '#1f2937', color: '#fff' }}>Cancelled</option>
          </select>
        </div>

        {/* Driver Assignment */}
        {!order.driver ? (
          <div className="mb-3">
            <label className="text-xs text-zinc-500 uppercase mb-2 block">Assign Driver</label>
            
            {/* Enhanced Driver Selection */}
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {drivers.map((driver: any) => {
                const connectionStatus = (driver.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
                const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus] || DRIVER_CONNECTION_COLORS.DISCONNECTED;
                const StatusIcon = statusStyle.icon;
                const canAssign = isDriverAssignable(driver);
                const isBusy = getActiveCountForDriver(driver.id, activeOrders) > 0;
                const isSelected = selectedDriverId === driver.id;
                
                return (
                  <button
                    key={driver.id}
                    onClick={() => canAssign && !isBusy && setSelectedDriverId(driver.id)}
                    disabled={!canAssign || isBusy}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : canAssign && !isBusy
                          ? 'border-zinc-800 bg-[#09090b] hover:border-[#3a3a3a] cursor-pointer'
                          : 'border-[#1a1a1a] bg-[#09090b] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center text-white text-[10px] font-bold border ${statusStyle.border}`}>
                        {getInitials(driver.firstName, driver.lastName)}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium">
                          {driver.firstName} {driver.lastName}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] px-1 py-0.5 rounded ${statusStyle.bgLight} ${statusStyle.text} flex items-center gap-0.5`}>
                            <StatusIcon size={8} />
                            {statusStyle.label}
                          </span>
                          {isBusy && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">BUSY</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canAssign && !isBusy && (
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-neutral-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    )}
                    {(!canAssign || isBusy) && (
                      <span className="text-[9px] text-zinc-600">
                        {isBusy ? 'Busy' : 'Unavailable'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* No assignable drivers warning */}
            {!drivers.some((d: any) => isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS) && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 mb-2">
                <AlertCircle size={14} className="text-amber-400" />
                <span className="text-xs text-amber-400">No drivers available for assignment</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => selectedDriverId && onAssignDriver(order.id, selectedDriverId)}
                disabled={!selectedDriverId}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedDriverId 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-[#1a1a1a] text-zinc-600 cursor-not-allowed'
                }`}
              >
                Assign Selected
              </button>
            </div>
            <button
              onClick={() => onAutoAssign(order.id)}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Navigation size={14} />
              Auto-Assign Nearest
            </button>
          </div>
        ) : (
          <div className="mb-3">
            <label className="text-xs text-zinc-500 uppercase mb-2 block">Assigned Driver</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-medium flex items-center">
                {order.driver.firstName} {order.driver.lastName}
              </div>
              <button
                onClick={() => onAssignDriver(order.id, null)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-lg text-sm font-medium transition"
              >
                Unassign
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {distanceData && (
            <>
              <button
                onClick={onTogglePolyline}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                  showPolyline
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-[#09090b] text-zinc-400 border border-zinc-800 hover:border-[#3a3a3a]"
                }`}
              >
                {showPolyline ? "Hide Route" : "Show Route"}
                {etaMin && <span className="ml-2 text-xs">({etaMin}min)</span>}
              </button>
              {order.driver && distanceData.toPickup && (
                <button
                  onClick={onToggleDriverToBusinessRoute}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition ${
                    showDriverToBusinessRoute
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-[#09090b] text-zinc-400 border border-zinc-800 hover:border-[#3a3a3a]"
                  }`}
                >
                  {showDriverToBusinessRoute ? "Hide" : "Show"} Driver â†’ Business
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DriverCard({ driver, activeOrders, now, onTrack, isTracking }: any) {
  const assignedOrders = activeOrders.filter((o: any) => o.driver?.id === driver.id);
  const assignedOrder = assignedOrders[0] ?? null;
  const isBusy = assignedOrders.length >= MAX_DRIVER_ACTIVE_ORDERS;
  const hasLocation = driver.driverLocation?.latitude && driver.driverLocation?.longitude;
  // New architecture: onlinePreference (user toggle) vs connectionStatus (system-detected)
  const onlinePreference = driver.driverConnection?.onlinePreference ?? false;
  const connectionStatus = (driver.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
  const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus] || DRIVER_CONNECTION_COLORS.DISCONNECTED;
  const StatusIcon = statusStyle.icon;
  const lastHeartbeat = driver.driverConnection?.lastHeartbeatAt;
  const canAssign = isDriverAssignable(driver) && getActiveCountForDriver(driver.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS;

  return (
    <div className={`bg-[#09090b] border rounded-lg p-3 transition-all ${statusStyle.border} ${isTracking ? 'ring-2 ring-blue-500/50 bg-blue-500/5' : ''} ${connectionStatus === 'DISCONNECTED' || connectionStatus === 'LOST' ? 'opacity-60' : ''} cursor-pointer hover:border-blue-500/50`}
      onClick={hasLocation ? onTrack : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center font-bold text-white text-xs border-2 ${statusStyle.border} ${isTracking ? 'ring-2 ring-blue-400' : ''}`}>
            {getInitials(driver.firstName, driver.lastName)}
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {driver.firstName} {driver.lastName}
            </div>
            {driver.phoneNumber && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Phone size={9} />
                {driver.phoneNumber}
              </div>
            )}
          </div>
        </div>
        {/* Connection status badge */}
        <div className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded ${statusStyle.bgLight} ${statusStyle.text} ${connectionStatus === 'STALE' ? 'animate-pulse' : ''}`}>
          <StatusIcon size={10} />
          {statusStyle.label}
        </div>
      </div>
      
      {/* Status row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${!isBusy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {isBusy ? 'BUSY' : 'FREE'}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${onlinePreference ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
          {onlinePreference ? 'PREF ON' : 'PREF OFF'}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${canAssign ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
          {canAssign ? 'ASSIGNABLE' : 'UNAVAILABLE'}
        </span>
        {isTracking && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 ml-auto flex items-center gap-1">
            ðŸ‘ï¸ Tracking
          </span>
        )}
      </div>
      
      {/* Last heartbeat */}
      <div className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1">
        <Clock size={10} />
        Last heartbeat: {formatHeartbeatElapsed(lastHeartbeat, now)}
      </div>
      
      {/* Warnings */}
      {!hasLocation && (
        <div className="flex items-center gap-1 text-[10px] text-rose-400 mt-1">
          <AlertCircle size={10} />
          No GPS signal
        </div>
      )}
      
      {/* Current assignment */}
      {assignedOrder && (
        <div className="mt-2 pt-2 border-t border-[#1f1f1f] text-[10px] text-zinc-500">
          <span className="text-amber-400">Delivering:</span> {assignedOrder.businesses?.[0]?.business?.name || 'Order'}
        </div>
      )}
      
      {/* Track info */}
      {hasLocation && (
        <div className="text-[9px] text-zinc-500 mt-2 pt-2 border-t border-[#1f1f1f]">
          Click to {isTracking ? 'stop' : 'track'} on map
        </div>
      )}
    </div>
  );
}
