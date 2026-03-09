"use client";

import React, { useEffect, useMemo, useRef, useState, Fragment, useCallback } from "react";
import { useQuery, useSubscription, useMutation } from "@apollo/client/react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import {
  MapPin, X, Filter, Clock, Package, Phone,
  User, Store, Calendar, AlertCircle, WifiOff, Signal,
  SignalLow, SignalZero, ChevronDown, ChevronUp, Eye, EyeOff,
  Zap, Route, ExternalLink, Crosshair, LocateFixed
} from "lucide-react";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import { ALL_ORDERS_SUBSCRIPTION } from "@/graphql/operations/orders/subscriptions";
import { ASSIGN_DRIVER_TO_ORDER, UPDATE_ORDER_STATUS } from "@/graphql/operations/orders";
import { ADMIN_UPDATE_DRIVER_LOCATION } from "@/graphql/operations/users/mutations";
import { calculateRouteDistance } from "@/lib/utils/mapbox";
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";
import { toast } from 'sonner';

// ╔══════════════════════════════════════════════════════════╗
// ║                      CONSTANTS                          ║
// ╚══════════════════════════════════════════════════════════╝
const DEFAULT_CENTER = { latitude: 42.4635, longitude: 21.4694 };
const GJILAN_BOUNDS: [[number, number], [number, number]] = [[21.42, 42.43], [21.51, 42.5]];
const MIN_ZOOM = 11.5;
const MAX_ZOOM = 17;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "mapbox://styles/mapbox/streets-v12";

const PENDING_WARNING_MS = 2 * 60 * 1000; // 2 minutes

const ORDER_STATUS_COLORS = {
  PENDING: { bg: "bg-amber-500/10", border: "border-amber-500/50", text: "text-amber-500", marker: "#f59e0b", selectBg: "bg-amber-500/20", hex: "#f59e0b" },
  READY: { bg: "bg-blue-500/10", border: "border-blue-500/50", text: "text-blue-500", marker: "#3b82f6", selectBg: "bg-blue-500/20", hex: "#3b82f6" },
  OUT_FOR_DELIVERY: { bg: "bg-emerald-500/10", border: "border-emerald-500/50", text: "text-emerald-500", marker: "#10b981", selectBg: "bg-emerald-500/20", hex: "#10b981" },
  DELIVERED: { bg: "bg-gray-500/10", border: "border-gray-500/50", text: "text-gray-500", marker: "#6b7280", selectBg: "bg-gray-500/20", hex: "#6b7280" },
  CANCELLED: { bg: "bg-rose-500/10", border: "border-rose-500/50", text: "text-rose-500", marker: "#ef4444", selectBg: "bg-rose-500/20", hex: "#ef4444" },
};

const DRIVER_CONNECTION_COLORS = {
  CONNECTED: {
    bg: "bg-emerald-500", bgLight: "bg-emerald-500/20",
    border: "border-emerald-500", text: "text-emerald-400",
    ring: "ring-emerald-400", icon: Signal, label: "Connected",
    description: "Actively sending heartbeats", hex: "#10b981",
  },
  STALE: {
    bg: "bg-amber-500", bgLight: "bg-amber-500/20",
    border: "border-amber-500", text: "text-amber-400",
    ring: "ring-amber-400", icon: SignalLow, label: "Stale",
    description: "No heartbeat for 15s", hex: "#f59e0b",
  },
  LOST: {
    bg: "bg-rose-500", bgLight: "bg-rose-500/20",
    border: "border-rose-500", text: "text-rose-400",
    ring: "ring-rose-400", icon: SignalZero, label: "Lost",
    description: "No heartbeat for 30s", hex: "#f43f5e",
  },
  DISCONNECTED: {
    bg: "bg-slate-600", bgLight: "bg-slate-600/20",
    border: "border-slate-600", text: "text-slate-400",
    ring: "ring-slate-500", icon: WifiOff, label: "Offline",
    description: "Not connected", hex: "#64748b",
  },
};

// ╔══════════════════════════════════════════════════════════╗
// ║                   UTILITY FUNCTIONS                     ║
// ╚══════════════════════════════════════════════════════════╝
const isValidLatLng = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
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

const isDriverAssignable = (driver: any) => {
  const connectionStatus = driver?.driverConnection?.connectionStatus;
  const onlinePreference = driver?.driverConnection?.onlinePreference ?? false;
  return onlinePreference && (connectionStatus === "CONNECTED" || connectionStatus === "STALE");
};

const MAX_DRIVER_ACTIVE_ORDERS = 2;
const getActiveCountForDriver = (driverId: string, activeOrders: any[]) =>
  activeOrders.filter((o: any) => o.driver?.id === driverId).length;

const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// ╔══════════════════════════════════════════════════════════╗
// ║               PREP TIME PROGRESS RING                   ║
// ╚══════════════════════════════════════════════════════════╝
function PrepTimeRing({ size = 44, stroke = 3, progress, color, children }: {
  size?: number;
  stroke?: number;
  progress: number;
  color: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-linear" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║                    TYPES                                ║
// ╚══════════════════════════════════════════════════════════╝
interface AnimatedDriverPoint { latitude: number; longitude: number }
interface DriverMotionTarget {
  latitude: number; longitude: number;
  timestamp: number; velocityLatPerSec: number; velocityLngPerSec: number;
  updatedAtMs: number;
}

// ╔══════════════════════════════════════════════════════════╗
// ║                    MAP PAGE                             ║
// ╚══════════════════════════════════════════════════════════╝
export default function MapPage() {
  // == DATA ==
  const { data: businessData } = useQuery(GET_BUSINESSES);
  const { data: driverData, refetch: refetchDrivers } = useQuery(DRIVERS_QUERY, { pollInterval: 10000 });
  const { data: orderData, refetch: refetchOrders } = useQuery(GET_ORDERS);
  
  // Refetch when subscriptions fire (backend sends lightweight signal)
  useSubscription(ALL_ORDERS_SUBSCRIPTION, {
    onData: () => { refetchOrders(); },
  });
  useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, {
    onData: () => { refetchDrivers(); },
  });
  
  const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);

  const businesses = useMemo(() => (businessData as any)?.businesses ?? [], [businessData]);
  const orders = useMemo(() => (orderData as any)?.orders ?? [], [orderData]);
  const drivers = useMemo(() => (driverData as any)?.drivers ?? [], [driverData]);

  const activeOrders = useMemo(
    () => orders.filter((o: any) => o.status !== "DELIVERED" && o.status !== "CANCELLED"),
    [orders]
  );

  // == REFS ==
  const mapRef = useRef<any>(null);
  const prevOrderStatusRef = useRef<Record<string, string>>({});
  const driverMotionTargetsRef = useRef<Record<string, DriverMotionTarget>>({});
  const animatedDriverPositionsRef = useRef<Record<string, AnimatedDriverPoint>>({});
  const lastAnimationFrameTsRef = useRef<number>(0);
  const lastDriverLocationUpdateMsRef = useRef<Record<string, number>>({});
  const orderRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // == STATE ==
  const [now, setNow] = useState(Date.now());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "ALL", driver: "ALL", business: "ALL", unassignedOnly: false });
  const [driverFilter, setDriverFilter] = useState<string>("ALL");
  const [orderDistances, setOrderDistances] = useState<Record<string, any>>({});
  const [showPolylines, setShowPolylines] = useState<Record<string, boolean>>({});
  const [showBothRoutes, setShowBothRoutes] = useState<Record<string, boolean>>({});
  const [driverTracks, setDriverTracks] = useState<Record<string, any>>({});
  const [animatedDriverPositions, setAnimatedDriverPositions] = useState<Record<string, AnimatedDriverPoint>>({});
  const [followingDriverId, setFollowingDriverId] = useState<string | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null);
  const [statusChangeTime, setStatusChangeTime] = useState<Record<string, number>>({});
  const [driverProgressOnRoute, setDriverProgressOnRoute] = useState<Record<string, number>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showDriverPanel, setShowDriverPanel] = useState(true);
  const [detailPanelExpanded, setDetailPanelExpanded] = useState(false);

  // == FILTERED ==
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

  // == STATS ==
  const stats = useMemo(() => {
    const pendingOrders = activeOrders.filter((o: any) => o.status === "PENDING");
    const readyOrders = activeOrders.filter((o: any) => o.status === "READY");
    const outOrders = activeOrders.filter((o: any) => o.status === "OUT_FOR_DELIVERY");
    const todayDelivered = orders.filter((o: any) => {
      const d = o.orderDate ? new Date(o.orderDate) : null;
      return d && d.toDateString() === new Date().toDateString() && o.status === "DELIVERED";
    });
    const todayRevenue = todayDelivered.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);

    const pendingWarnings = pendingOrders.filter((o: any) => {
      const orderDate = o.orderDate ? new Date(o.orderDate).getTime() : now;
      return (now - orderDate) > PENDING_WARNING_MS;
    }).length;

    const driverStats = {
      connected: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "CONNECTED").length,
      stale: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "STALE").length,
      lost: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "LOST").length,
      disconnected: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "DISCONNECTED" || !d.driverConnection?.connectionStatus).length,
      assignable: drivers.filter((d: any) => isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS).length,
    };

    return { pendingOrders: pendingOrders.length, readyOrders: readyOrders.length, outOrders: outOrders.length, todayDelivered: todayDelivered.length, todayRevenue, pendingWarnings, driverStats, activeCount: activeOrders.length };
  }, [activeOrders, drivers, orders, now]);

  const driverMap = useMemo(() => {
    const map: Record<string, any> = {};
    drivers.forEach((d: any) => { map[d.id] = d; });
    return map;
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    let result = [...drivers];
    if (driverFilter !== "ALL") {
      result = result.filter((d: any) => {
        const status = d.driverConnection?.connectionStatus ?? "DISCONNECTED";
        if (driverFilter === "ASSIGNABLE") return isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS;
        if (driverFilter === "BUSY") return getActiveCountForDriver(d.id, activeOrders) > 0;
        if (driverFilter === "FREE") return getActiveCountForDriver(d.id, activeOrders) === 0;
        return status === driverFilter;
      });
    }
    result.sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { CONNECTED: 0, STALE: 1, LOST: 2, DISCONNECTED: 3 };
      return (statusOrder[a.driverConnection?.connectionStatus ?? "DISCONNECTED"] ?? 3) - (statusOrder[b.driverConnection?.connectionStatus ?? "DISCONNECTED"] ?? 3);
    });
    return result;
  }, [drivers, driverFilter, activeOrders]);

  // ╔══════════════════════════════════════════════════════════╗
  // ║                     EFFECTS                             ║
  // ╚══════════════════════════════════════════════════════════╝

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Camera tracking
  useEffect(() => {
    if (!followingDriverId || !mapRef.current) return;
    const followedTrack = driverTracks[followingDriverId];
    if (!followedTrack) return;
    const pos = animatedDriverPositions[followingDriverId] || followedTrack.to;
    if (!isValidLatLng(pos?.latitude, pos?.longitude)) return;
    mapRef.current.flyTo({ center: [pos.longitude, pos.latitude], zoom: 16, duration: 400, pitch: 0 });
  }, [followingDriverId, driverTracks, animatedDriverPositions]);

  // Track status changes
  useEffect(() => {
    setStatusChangeTime((prev) => {
      const next = { ...prev };
      activeOrders.forEach((order: any) => {
        const prevStatus = prevOrderStatusRef.current[order.id];
        if (!prevStatus) {
          const orderDate = order.orderDate ? new Date(order.orderDate).getTime() : now;
          next[order.id] = order.status === "PENDING" ? orderDate : now;
          prevOrderStatusRef.current[order.id] = order.status;
        } else if (prevStatus !== order.status) {
          next[order.id] = now;
          prevOrderStatusRef.current[order.id] = order.status;
        }
      });
      return next;
    });
  }, [activeOrders.map((o: any) => `${o.id}-${o.status}`).join(","), now]);

  // Driver tracking & motion interpolation
  useEffect(() => {
    if (!drivers.length) return;
    const nowTs = Date.now();

    setDriverTracks((prev) => {
      const next = { ...prev } as Record<string, any>;
      drivers.forEach((driver: any) => {
        const location = driver.driverLocation;
        if (!location?.latitude || !location?.longitude) return;
        const newPos = { latitude: location.latitude, longitude: location.longitude };
        const trackId = driver.id;
        const previousTarget = driverMotionTargetsRef.current[trackId];
        const updatedAtMs = driver.driverLocationUpdatedAt ? new Date(driver.driverLocationUpdatedAt).getTime() : nowTs;
        const lastSeenUpdateMs = lastDriverLocationUpdateMsRef.current[trackId] ?? 0;

        if (updatedAtMs <= lastSeenUpdateMs && previousTarget) {
          next[driver.id] = { id: driver.id, name: `${driver.firstName} ${driver.lastName}`.trim(), to: { latitude: previousTarget.latitude, longitude: previousTarget.longitude }, updatedAt: driver.driverLocationUpdatedAt };
          return;
        }

        lastDriverLocationUpdateMsRef.current[trackId] = updatedAtMs;
        let velocityLatPerSec = 0, velocityLngPerSec = 0;
        if (previousTarget) {
          const deltaSec = Math.max((updatedAtMs - previousTarget.updatedAtMs) / 1000, 0.001);
          const rawVelocityLat = (newPos.latitude - previousTarget.latitude) / deltaSec;
          const rawVelocityLng = (newPos.longitude - previousTarget.longitude) / deltaSec;
          const rawSpeedDegPerSec = Math.hypot(rawVelocityLat, rawVelocityLng);
          const minMovingSpeedDegPerSec = 0.0000025;
          if (rawSpeedDegPerSec < minMovingSpeedDegPerSec) {
            velocityLatPerSec = previousTarget.velocityLatPerSec * 0.92;
            velocityLngPerSec = previousTarget.velocityLngPerSec * 0.92;
          } else {
            const velocityBlend = 0.35;
            velocityLatPerSec = previousTarget.velocityLatPerSec * (1 - velocityBlend) + rawVelocityLat * velocityBlend;
            velocityLngPerSec = previousTarget.velocityLngPerSec * (1 - velocityBlend) + rawVelocityLng * velocityBlend;
          }
        }

        driverMotionTargetsRef.current[trackId] = { latitude: newPos.latitude, longitude: newPos.longitude, timestamp: nowTs, velocityLatPerSec, velocityLngPerSec, updatedAtMs };
        if (!animatedDriverPositionsRef.current[trackId]) {
          animatedDriverPositionsRef.current[trackId] = newPos;
        }
        next[driver.id] = { id: driver.id, name: `${driver.firstName} ${driver.lastName}`.trim(), to: newPos, updatedAt: driver.driverLocationUpdatedAt };
      });
      return next;
    });

    // Update route progress
    activeOrders.forEach((order: any) => {
      if (order.status === "OUT_FOR_DELIVERY" && order.driver) {
        const driver = drivers.find((d: any) => d.id === order.driver.id);
        const driverLocation = driver?.driverLocation;
        const routeGeometry = orderDistances[order.id]?.toDropoff?.geometry;
        if (driverLocation && routeGeometry && routeGeometry.length > 0) {
          let minDist = Infinity, closestIndex = 0;
          routeGeometry.forEach((coord: [number, number], idx: number) => {
            const dist = Math.hypot(coord[0] - driverLocation.longitude, coord[1] - driverLocation.latitude);
            if (dist < minDist) { minDist = dist; closestIndex = idx; }
          });
          const progress = routeGeometry.length > 1 ? closestIndex / (routeGeometry.length - 1) : 0;
          setDriverProgressOnRoute((prev) => ({ ...prev, [order.driver.id]: progress }));
        }
      }
    });
  }, [drivers, activeOrders, orderDistances]);

  // Smooth marker animation
  useEffect(() => {
    let rafId: number;
    const animate = (frameTs: number) => {
      if (!lastAnimationFrameTsRef.current) lastAnimationFrameTsRef.current = frameTs;
      const dtMs = Math.max(frameTs - lastAnimationFrameTsRef.current, 1);
      lastAnimationFrameTsRef.current = frameTs;
      const nowMs = Date.now();
      const nextAnimated = { ...animatedDriverPositionsRef.current };
      let hasAnyDriver = false;

      Object.entries(driverMotionTargetsRef.current).forEach(([driverId, target]) => {
        hasAnyDriver = true;
        const ageSec = Math.max((nowMs - target.timestamp) / 1000, 0);
        const lookAheadSec = 1.2;
        const staleAfterSec = 10;
        const decaySec = Math.max(ageSec - staleAfterSec, 0);
        const staleDecay = Math.exp(-decaySec / 4);
        const predictionWindowSec = Math.min(ageSec + lookAheadSec, 14);
        const predictedLat = target.latitude + target.velocityLatPerSec * staleDecay * predictionWindowSec;
        const predictedLng = target.longitude + target.velocityLngPerSec * staleDecay * predictionWindowSec;
        const current = nextAnimated[driverId] || { latitude: target.latitude, longitude: target.longitude };
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
    return () => { cancelAnimationFrame(rafId); lastAnimationFrameTsRef.current = 0; };
  }, []);

  // Route calculation
  const ROUTE_RECALC_MIN_MS = 60000;
  const ROUTE_RECALC_MIN_METERS = 80;
  const lastRouteCalcRef = useRef<Record<string, { timestamp: number; latitude: number; longitude: number }>>({});

  const haversineMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const shouldRecalculateRoute = (orderId: string, driverPos: { latitude: number; longitude: number }) => {
    const prev = lastRouteCalcRef.current[orderId];
    const n = Date.now();
    if (!prev) { lastRouteCalcRef.current[orderId] = { timestamp: n, latitude: driverPos.latitude, longitude: driverPos.longitude }; return true; }
    const elapsed = n - prev.timestamp;
    const moved = haversineMeters(prev, driverPos);
    if (elapsed < ROUTE_RECALC_MIN_MS && moved < ROUTE_RECALC_MIN_METERS) return false;
    lastRouteCalcRef.current[orderId] = { timestamp: n, latitude: driverPos.latitude, longitude: driverPos.longitude };
    return true;
  };

  useEffect(() => {
    const calculateDistances = async () => {
      for (const order of activeOrders) {
        const cacheKey = `${order.id}-${order.driver?.id || "none"}-${order.status}`;
        const existingKey = orderDistances[order.id]
          ? `${order.id}-${orderDistances[order.id].driverId || "none"}-${orderDistances[order.id].status}`
          : null;
        if (existingKey === cacheKey) continue;

        const firstBusiness = order.businesses?.[0]?.business;
        if (!firstBusiness?.location || !order.dropOffLocation) continue;
        const pickup = { longitude: firstBusiness.location.longitude, latitude: firstBusiness.location.latitude };
        const dropoff = { longitude: order.dropOffLocation.longitude, latitude: order.dropOffLocation.latitude };

        try {
          if ((order.status === "READY" || order.status === "PENDING") && order.driver) {
            const driver = drivers.find((d: any) => d.id === order.driver.id);
            const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
            if (!driverLocation) continue;
            const driverPos = { longitude: driverLocation.longitude, latitude: driverLocation.latitude };
            if (!shouldRecalculateRoute(order.id, driverPos)) continue;
            const [toPickupRoute, toDropoffRoute] = await Promise.all([
              calculateRouteDistance(driverPos, pickup),
              calculateRouteDistance(pickup, dropoff),
            ]);
            if (toPickupRoute && toDropoffRoute) {
              setOrderDistances((prev) => ({ ...prev, [order.id]: { toPickup: toPickupRoute, toDropoff: toDropoffRoute, driverId: order.driver.id, status: order.status } }));
            }
          } else if (order.status === "OUT_FOR_DELIVERY" && order.driver) {
            const driver = drivers.find((d: any) => d.id === order.driver.id);
            const driverLocation = driver?.driverLocation || order.driver?.driverLocation;
            if (!driverLocation) continue;
            const driverPos = { longitude: driverLocation.longitude, latitude: driverLocation.latitude };
            if (!shouldRecalculateRoute(order.id, driverPos)) continue;
            const toDropoffRoute = await calculateRouteDistance(driverPos, dropoff);
            if (toDropoffRoute) {
              setOrderDistances((prev) => ({ ...prev, [order.id]: { toDropoff: toDropoffRoute, driverId: order.driver.id, status: order.status } }));
            }
          } else if (!order.driver) {
            const route = await calculateRouteDistance(pickup, dropoff);
            if (route) {
              setOrderDistances((prev) => ({ ...prev, [order.id]: { toDropoff: route, driverId: null, status: order.status } }));
            }
          }
        } catch (error) {
          console.error("Error calculating distance for order:", order.id, error);
        }
      }
    };
    calculateDistances();
  }, [activeOrders.map((o: any) => `${o.id}-${o.driver?.id || "none"}-${o.status}`).join(","), drivers]);

  // Auto-show route
  useEffect(() => {
    setShowPolylines((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => { next[key] = false; });
      if (selectedOrder && orderDistances[selectedOrder.id]) next[selectedOrder.id] = true;
      return next;
    });
  }, [selectedOrder?.id, orderDistances[selectedOrder?.id || ""]]);

  // ╔══════════════════════════════════════════════════════════╗
  // ║                     ACTIONS                             ║
  // ╚══════════════════════════════════════════════════════════╝

  const handleAssignDriver = async (orderId: string, driverId: string | null) => {
    try {
      await assignDriver({ variables: { id: orderId, driverId }, refetchQueries: ["GetOrders"], awaitRefetchQueries: true });
      if (driverId) {
        setTimeout(() => { setShowPolylines((prev) => ({ ...prev, [orderId]: true })); }, 500);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign driver");
    }
  };

  const handleAutoAssign = async (orderId: string) => {
    try {
      const order = activeOrders.find((o: any) => o.id === orderId);
      if (!order) { toast.error("Order not found"); return; }
      const firstBusiness = order.businesses?.[0]?.business;
      let pickup = null;
      if (firstBusiness?.location?.latitude && firstBusiness?.location?.longitude) {
        pickup = { latitude: firstBusiness.location.latitude, longitude: firstBusiness.location.longitude };
      } else if (firstBusiness?.id && businesses.length > 0) {
        const fullBusiness = businesses.find((b: any) => b.id === firstBusiness.id);
        if (fullBusiness?.location?.latitude && fullBusiness?.location?.longitude) {
          pickup = { latitude: fullBusiness.location.latitude, longitude: fullBusiness.location.longitude };
        }
      }
      if (!pickup) { toast.error("Business location not available"); return; }

      const availableDrivers = drivers.filter((d: any) => {
        const hasLocation = d.driverLocation?.latitude && d.driverLocation?.longitude;
        const isBusy = getActiveCountForDriver(d.id, activeOrders) > 0;
        const canAssign = isDriverAssignable(d);
        return hasLocation && !isBusy && canAssign;
      });
      if (availableDrivers.length === 0) { toast.warning("No available drivers found"); return; }

      let nearestDriver = availableDrivers[0];
      let minDistance = Infinity;
      availableDrivers.forEach((driver: any) => {
        const dist = distanceMeters(pickup!, { latitude: driver.driverLocation.latitude, longitude: driver.driverLocation.longitude });
        if (dist < minDistance) { minDistance = dist; nearestDriver = driver; }
      });
      await handleAssignDriver(orderId, nearestDriver.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to auto-assign driver");
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus({ variables: { id: orderId, status }, refetchQueries: ["GetOrders"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const focusOrder = useCallback((order: any) => {
    const map = mapRef.current?.getMap?.();
    if (!map || !order.dropOffLocation) return;
    map.flyTo({ center: [order.dropOffLocation.longitude, order.dropOffLocation.latitude], zoom: 15, essential: true });
  }, []);

  const selectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    const order = activeOrders.find((o: any) => o.id === orderId);
    if (order) focusOrder(order);
  }, [activeOrders, focusOrder]);

  const recenterMap = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({ center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude], zoom: 12, essential: true });
  }, []);

  // ╔══════════════════════════════════════════════════════════╗
  // ║                      RENDER                             ║
  // ╚══════════════════════════════════════════════════════════╝

  return (
    <div className="w-[calc(100%+40px)] h-[calc(100vh-48px)] relative bg-[#09090b] overflow-hidden -m-5">
      {/* ════════════════ MAP ════════════════ */}
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
        {/* ── Business Markers ── */}
        {businesses.map((business: any) => {
          if (!business.location?.latitude || !business.location?.longitude) return null;
          const isHovered = hoveredBusinessId === business.id;
          const isInactive = !business.isActive;
          return (
            <Marker key={`b-${business.id}`} longitude={business.location.longitude} latitude={business.location.latitude} anchor="center">
              <div className="relative flex items-center justify-center group cursor-pointer"
                onMouseEnter={() => setHoveredBusinessId(business.id)}
                onMouseLeave={() => setHoveredBusinessId(null)}>
                <div className={`relative w-3 h-3 rounded-full ${isInactive ? "bg-slate-400" : "bg-violet-600"} shadow-md hover:scale-125 transition-all ${isHovered ? "ring-2 ring-violet-400 ring-offset-1" : ""}`} />
                {isHovered && (
                  <div className="absolute bottom-full mb-3 bg-black/95 text-white rounded-xl shadow-2xl z-[100] border border-white/20 overflow-hidden backdrop-blur-sm min-w-[240px] pointer-events-none">
                    {business.imageUrl && (
                      <div className="w-full h-32 bg-gradient-to-br from-violet-500/20 to-purple-500/20 relative overflow-hidden">
                        <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Store size={20} className="text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base mb-1">{business.name}</div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                            <span className={`px-2 py-0.5 rounded ${business.businessType === "RESTAURANT" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                              {business.businessType}
                            </span>
                            {isInactive && <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">INACTIVE</span>}
                          </div>
                          {business.location?.address && (
                            <div className="text-xs text-zinc-500 flex items-start gap-1 mb-2">
                              <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{business.location.address}</span>
                            </div>
                          )}
                          {business.phoneNumber && (
                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                              <Phone size={12} /><span>{business.phoneNumber}</span>
                            </div>
                          )}
                          {business.avgPrepTimeMinutes && (
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                              <Clock size={12} /><span>~{business.avgPrepTimeMinutes} min prep</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black/95" />
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* ── Route Polylines ── */}
        {activeOrders.map((order: any) => {
          if (!showPolylines[order.id] || !orderDistances[order.id]) return null;
          const routes = orderDistances[order.id];

          // PENDING: always show pickup → dropoff (amber)
          if (order.status === "PENDING") {
            if (!routes.toDropoff) return null;
            return (
              <Fragment key={`ors-${order.id}`}>
                <Source id={`or-${order.id}`} type="geojson"
                  data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toDropoff.geometry } }}>
                  <Layer id={`or-c-${order.id}`} type="line" paint={{ "line-color": "#78350f", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  <Layer id={`or-l-${order.id}`} type="line" paint={{ "line-color": "#f59e0b", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                </Source>
                {/* If driver assigned and "show both" is on, also show driver → pickup */}
                {showBothRoutes[order.id] && order.driver && routes.toPickup && (
                  <Source id={`otp-${order.id}`} type="geojson"
                    data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toPickup.geometry } }}>
                    <Layer id={`otp-c-${order.id}`} type="line" paint={{ "line-color": "#1e3a8a", "line-width": 8, "line-opacity": 0.5 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                    <Layer id={`otp-l-${order.id}`} type="line" paint={{ "line-color": "#60a5fa", "line-width": 4, "line-opacity": 0.8, "line-dasharray": [2, 2] }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  </Source>
                )}
              </Fragment>
            );
          }

          // READY: show driver → pickup (blue) if assigned, else pickup → dropoff
          if (order.status === "READY") {
            if (order.driver && routes.toPickup) {
              return (
                <Fragment key={`ors-${order.id}`}>
                  <Source id={`otp-${order.id}`} type="geojson"
                    data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toPickup.geometry } }}>
                    <Layer id={`otp-c-${order.id}`} type="line" paint={{ "line-color": "#1e3a8a", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                    <Layer id={`otp-l-${order.id}`} type="line" paint={{ "line-color": "#3b82f6", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  </Source>
                  {/* "Show both" toggle adds pickup → dropoff */}
                  {showBothRoutes[order.id] && routes.toDropoff && (
                    <Source id={`otd-${order.id}`} type="geojson"
                      data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toDropoff.geometry } }}>
                      <Layer id={`otd-c-${order.id}`} type="line" paint={{ "line-color": "#581c87", "line-width": 8, "line-opacity": 0.5 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                      <Layer id={`otd-l-${order.id}`} type="line" paint={{ "line-color": "#a855f7", "line-width": 4, "line-opacity": 0.8, "line-dasharray": [2, 2] }} layout={{ "line-cap": "round", "line-join": "round" }} />
                    </Source>
                  )}
                </Fragment>
              );
            }
            // No driver assigned — show pickup → dropoff
            if (routes.toDropoff) {
              return (
                <Source key={`or-${order.id}`} id={`order-route-${order.id}`} type="geojson"
                  data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toDropoff.geometry } }}>
                  <Layer id={`or-c-${order.id}`} type="line" paint={{ "line-color": "#1e3a8a", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                  <Layer id={`or-l-${order.id}`} type="line" paint={{ "line-color": "#3b82f6", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                </Source>
              );
            }
            return null;
          }

          // OUT_FOR_DELIVERY: show driver → dropoff (emerald) with progress
          if (order.status === "OUT_FOR_DELIVERY" && routes.toDropoff) {
            const geometry = routes.toDropoff.geometry;
            const progress = driverProgressOnRoute[order.driver?.id] || 0;
            const startIndex = Math.floor(progress * geometry.length);
            const remainingGeometry = startIndex > 0 ? geometry.slice(startIndex) : geometry;
            if (remainingGeometry.length < 2) return null;
            return (
              <Source key={`or-${order.id}`} id={`order-route-${order.id}`} type="geojson"
                data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: remainingGeometry } }}>
                <Layer id={`or-c-${order.id}`} type="line" paint={{ "line-color": "#065f46", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                <Layer id={`or-l-${order.id}`} type="line" paint={{ "line-color": "#10b981", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
              </Source>
            );
          }

          return null;
        })}

        {/* ── Order Markers ── */}
        {filteredOrders.map((order: any) => {
          const drop = order.dropOffLocation;
          if (!drop?.latitude || !drop?.longitude) return null;
          const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
          const businessNames = order.businesses?.map((b: any) => b.business?.name).filter(Boolean).join(", ") || "Order";
          const isHovered = hoveredOrderId === order.id;
          const isSelected = selectedOrderId === order.id;
          const isPending = order.status === "PENDING";
          const orderDateMs = order.orderDate ? new Date(order.orderDate).getTime() : now;
          const pendingTooLong = isPending && (now - orderDateMs) > PENDING_WARNING_MS;

          return (
            <Marker key={`o-${order.id}`} latitude={drop.latitude} longitude={drop.longitude} anchor="bottom"
              onClick={() => selectOrder(order.id)}>
              <div className="relative flex flex-col items-center cursor-pointer group"
                onMouseEnter={() => setHoveredOrderId(order.id)}
                onMouseLeave={() => setHoveredOrderId(null)}>
                {isPending && (
                  <div className={`absolute inset-0 w-5 h-5 rounded-full ${pendingTooLong ? "bg-red-500" : "bg-red-500"} animate-ping opacity-50`} />
                )}
                {pendingTooLong && (
                  <div className="absolute -inset-1 w-7 h-7 rounded-full bg-red-500/40 animate-pulse" />
                )}
                {isSelected && (
                  <div className="absolute -inset-1.5 w-8 h-8 rounded-full border-2 border-violet-400 animate-pulse" />
                )}
                <div className={`relative w-5 h-5 rounded-full ${pendingTooLong ? "bg-red-500" : "bg-violet-600"} border-2 border-white flex items-center justify-center shadow-lg hover:scale-125 transition-transform`}>
                  <Package size={12} className="text-white" />
                </div>
                {isHovered && (
                  <div className="absolute bottom-full mb-3 px-4 py-3 bg-black text-white text-sm rounded-lg shadow-2xl whitespace-nowrap z-[100] pointer-events-none border-2 border-white/20">
                    <div className="font-semibold text-base">{businessNames}</div>
                    <div className={`${statusColor.text} mt-1.5 text-xs font-medium uppercase`}>{order.status.replace(/_/g, " ")}</div>
                    {isPending && (
                      <div className={`text-xs mt-1 font-mono ${pendingTooLong ? "text-red-400 font-bold" : "text-zinc-400"}`}>
                        {formatElapsed(now - orderDateMs)}
                      </div>
                    )}
                    {order.driver && (
                      <div className="text-zinc-400 text-xs mt-1.5 flex items-center gap-1"><User size={12} />{order.driver.firstName} {order.driver.lastName}</div>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black" />
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* ── Driver Markers ── */}
        {Object.values(driverTracks).map((track: any) => {
          const pos = animatedDriverPositions[track.id] || track.to;
          if (!isValidLatLng(pos?.latitude, pos?.longitude)) return null;
          const isBusy = getActiveCountForDriver(track.id, activeOrders) > 0;
          const driver = driverMap[track.id];
          const connectionStatus = (driver?.driverConnection?.connectionStatus ?? "DISCONNECTED") as keyof typeof DRIVER_CONNECTION_COLORS;
          const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus] || DRIVER_CONNECTION_COLORS.DISCONNECTED;
          const StatusIcon = statusStyle.icon;
          const isFollowing = followingDriverId === track.id;

          return (
            <Marker key={`d-${track.id}`} latitude={pos.latitude} longitude={pos.longitude} anchor="bottom">
              <div className={`relative flex flex-col items-center group cursor-pointer ${connectionStatus === "DISCONNECTED" || connectionStatus === "LOST" ? "opacity-50" : ""}`}
                onClick={() => {
                  const newId = isFollowing ? null : track.id;
                  setFollowingDriverId(newId);
                  if (newId && mapRef.current) mapRef.current.jumpTo({ center: [pos.longitude, pos.latitude], zoom: 16 });
                }}>
                {isFollowing && <div className="absolute inset-0 w-12 h-12 -top-2 -left-2 rounded-full border-2 border-blue-400 animate-pulse" />}
                <div className={`absolute -top-2 -right-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${connectionStatus === "STALE" ? "animate-pulse" : ""}`}>
                  <StatusIcon size={10} className="text-white" />
                </div>
                {isBusy && connectionStatus === "CONNECTED" && (
                  <div className="absolute inset-0 w-8 h-8 -top-1 -left-1 rounded-full border-2 border-emerald-400 animate-pulse" />
                )}
                {driver ? (
                  <div className={`w-8 h-8 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center font-bold text-white text-xs border-2 ${statusStyle.border} shadow-lg transition-all hover:scale-125 ${isBusy ? `ring-1.5 ${statusStyle.ring}` : ""}`}>
                    {getInitials(driver.firstName, driver.lastName)}
                  </div>
                ) : (
                  <div className={`w-5 h-5 rounded-full ${statusStyle.bg} border-2 border-white shadow-lg`} />
                )}
                <div className="absolute bottom-full mb-3 hidden group-hover:block bg-black/95 text-white text-xs rounded-lg shadow-2xl z-[100] border border-white/20 min-w-[220px] backdrop-blur-sm">
                  <div className="p-3">
                    <div className="font-semibold text-sm">{driver ? `${driver.firstName} ${driver.lastName}` : track.name}</div>
                    <div className={`flex items-center gap-2 mt-2 px-2 py-1 rounded ${statusStyle.bgLight}`}>
                      <StatusIcon size={12} className={statusStyle.text} /><span className={`font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                      <Clock size={10} />Last heartbeat: {formatHeartbeatElapsed(driver?.driverConnection?.lastHeartbeatAt, now)}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-2 font-mono">{pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}</div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${isBusy ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{isBusy ? "BUSY" : "FREE"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDriverAssignable(driver) ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/20 text-slate-400"}`}>{isDriverAssignable(driver) ? "ASSIGNABLE" : "UNAVAILABLE"}</span>
                      {isFollowing && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">TRACKING</span>}
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-2 pt-2 border-t border-white/10">Click to {isFollowing ? "stop" : "start"} tracking</div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black/95" />
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* ════════════════ TOP RIGHT CONTROLS ════════════════ */}
      <div className="absolute top-4 right-[88px] z-30 flex items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl backdrop-blur-md border transition ${showFilters ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-black/80 border-white/10 text-zinc-400 hover:text-white"}`}>
          <Filter size={16} />
        </button>
        <button onClick={recenterMap} className="p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white transition" title="Recenter map">
          <Crosshair size={16} />
        </button>
      </div>

      {/* ════════════════ FILTERS DROPDOWN ════════════════ */}
      {showFilters && (
        <div className="absolute top-16 right-[88px] z-40 bg-black/95 backdrop-blur-md border border-white/15 rounded-xl p-4 space-y-3 min-w-[220px]">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={filters.unassignedOnly} onChange={(e) => setFilters({ ...filters, unassignedOnly: e.target.checked })} className="rounded" />
            Unassigned Only
          </label>
          <button onClick={() => { setFilters({ status: "ALL", driver: "ALL", business: "ALL", unassignedOnly: false }); setShowFilters(false); }}
            className="text-xs text-zinc-500 hover:text-white transition">Clear filters</button>
        </div>
      )}

      {/* ════════════════ RIGHT EDGE DRIVER AVATARS (Discord-style) ════════════════ */}
      <div className="absolute right-0 top-0 bottom-0 z-20 w-[72px] bg-[#0a0a0b]/95 border-l border-white/5 flex flex-col">
        {/* Driver count header */}
        <div className="p-2 pt-4 border-b border-white/5 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1" title="Online">
            <Signal size={10} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">{filteredDrivers.filter((d: any) => d.driverConnection?.connectionStatus === "CONNECTED").length}</span>
          </div>
          <div className="flex items-center gap-1" title="Total">
            <User size={10} className="text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-400">{filteredDrivers.length}</span>
          </div>
        </div>
        
        {/* Driver avatars */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2" style={{ maxHeight: selectedOrder ? "calc(100vh - 380px)" : "calc(100vh - 100px)" }}>
          <div className="flex flex-col items-center gap-2">
            {filteredDrivers.map((driver: any) => {
              const connectionStatus = (driver.driverConnection?.connectionStatus ?? "DISCONNECTED") as keyof typeof DRIVER_CONNECTION_COLORS;
              const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus];
              const StatusIcon = statusStyle.icon;
              const isBusy = getActiveCountForDriver(driver.id, activeOrders) > 0;
              const hasLocation = driver.driverLocation?.latitude && driver.driverLocation?.longitude;
              const isTracking = followingDriverId === driver.id;
              const assignedOrders = activeOrders.filter((o: any) => o.driver?.id === driver.id);

              return (
                <div key={driver.id} className="relative group">
                  <button
                    onClick={() => {
                      if (!hasLocation) return;
                      const newId = isTracking ? null : driver.id;
                      setFollowingDriverId(newId);
                      if (newId && mapRef.current && driver.driverLocation) {
                        mapRef.current.jumpTo({ center: [driver.driverLocation.longitude, driver.driverLocation.latitude], zoom: 16 });
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-lg transition-all hover:scale-110 ${getAvatarColor(driver.id)} ${
                      isTracking ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-[#0a0a0b] scale-110" : ""
                    } ${connectionStatus === "DISCONNECTED" || connectionStatus === "LOST" ? "opacity-40" : ""}`}
                    style={{ boxShadow: `0 4px 20px ${statusStyle.hex}40` }}
                    title={`${driver.firstName} ${driver.lastName}`}>
                    {getInitials(driver.firstName, driver.lastName)}
                  </button>
                  
                  {/* Status badge */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-md`}>
                    <StatusIcon size={9} style={{ color: statusStyle.hex }} />
                  </div>
                  
                  {/* Busy badge */}
                  {isBusy && (
                    <div className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[8px] font-bold text-white shadow-md">
                      {assignedOrders.length}
                    </div>
                  )}
                  
                  {/* Hover tooltip (left side) */}
                  <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black/95 text-white rounded-xl shadow-2xl z-[100] border border-white/20 min-w-[200px] backdrop-blur-sm pointer-events-none">
                    <div className="p-3">
                      <div className="text-sm font-semibold text-white">{driver.firstName} {driver.lastName}</div>
                      {driver.phoneNumber && (
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-1">
                          <Phone size={9} />{driver.phoneNumber}
                        </div>
                      )}
                      <div className={`flex items-center gap-2 mt-2 px-2 py-1 rounded-lg text-[10px] ${statusStyle.bgLight}`}>
                        <StatusIcon size={10} className={statusStyle.text} />
                        <span className={`font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-2">
                        Heartbeat: {formatHeartbeatElapsed(driver.driverConnection?.lastHeartbeatAt, now)}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${isBusy ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{isBusy ? `BUSY (${assignedOrders.length})` : "FREE"}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDriverAssignable(driver) ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/20 text-slate-400"}`}>
                          {isDriverAssignable(driver) ? "ASSIGNABLE" : "UNAVAIL"}
                        </span>
                      </div>
                      {assignedOrders.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          {assignedOrders.map((o: any) => (
                            <div key={o.id} className="text-[10px] text-zinc-400">
                              <span className="text-amber-400">{"\u2192"}</span> {o.businesses?.[0]?.business?.name || "Order"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent border-l-black/95" />
                  </div>
                </div>
              );
            })}
            {filteredDrivers.length === 0 && (
              <div className="text-center text-zinc-600 text-[10px] py-4">
                No drivers
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════ TRACKING INDICATOR ════════════════ */}
      {followingDriverId && driverMap[followingDriverId] && (() => {
        const driver = driverMap[followingDriverId];
        const connectionStatus = (driver?.driverConnection?.connectionStatus ?? "DISCONNECTED") as keyof typeof DRIVER_CONNECTION_COLORS;
        const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus];
        return (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 backdrop-blur-md">
            <LocateFixed size={12} className="text-blue-400 animate-pulse" />
            <span className="text-xs font-medium text-blue-300">Tracking {driver.firstName}</span>
            <div className={`w-2 h-2 rounded-full ${statusStyle.bg}`} />
            <button onClick={() => setFollowingDriverId(null)} className="ml-1 p-0.5 hover:bg-white/10 rounded-full transition">
              <X size={10} className="text-blue-300" />
            </button>
          </div>
        );
      })()}

      {/* ════════════════ LEFT ORDER CARDS SIDEBAR ════════════════ */}
      <div className="absolute left-0 top-0 bottom-0 z-20 w-[280px] bg-[#0a0a0b] border-r border-white/5 flex flex-col">
        {/* Header with stats */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">Orders</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">{filteredOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold text-amber-400">{stats.pendingOrders}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-bold text-blue-400">{stats.readyOrders}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-400">{stats.outOrders}</span>
            </div>
          </div>
        </div>
        
        {/* Order cards list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ maxHeight: selectedOrder ? "calc(100vh - 260px)" : "calc(100vh - 60px)" }}>
          <div className="p-2 space-y-2">
            {filteredOrders.map((order: any) => {
              const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
              const businessName = order.businesses?.[0]?.business?.name || "Unknown";
              const isSelected = selectedOrderId === order.id;
              const isPending = order.status === "PENDING";
              const orderDateMs = order.orderDate ? new Date(order.orderDate).getTime() : now;
              const elapsed = now - orderDateMs;
              const pendingTooLong = isPending && elapsed > PENDING_WARNING_MS;
              const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : "Unknown";
              const distanceData = orderDistances[order.id];
              const etaMin = distanceData
                ? distanceData.toPickup
                  ? Math.round(distanceData.toPickup.durationMin + distanceData.toDropoff.durationMin)
                  : Math.round(distanceData.toDropoff.durationMin)
                : null;

              return (
                <button
                  key={order.id}
                  ref={(el) => { orderRefs.current[order.id] = el; }}
                  onClick={() => selectOrder(order.id)}
                  style={!isSelected && !pendingTooLong ? { backgroundColor: `${statusColor.hex}10`, borderLeft: `3px solid ${statusColor.hex}` } : isSelected ? { borderLeft: `3px solid ${statusColor.hex}` } : undefined}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    isSelected
                      ? "bg-white/10 ring-1 ring-violet-500/50"
                      : pendingTooLong
                        ? "bg-red-500/10 hover:bg-red-500/15"
                        : "hover:bg-white/8"
                  } ${pendingTooLong ? "animate-pulse" : ""}`}>
                  
                  {/* Top row: status + time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pendingTooLong ? "#ef4444" : statusColor.hex }} />
                      <span className={`text-[10px] font-semibold uppercase ${pendingTooLong ? "text-red-400" : statusColor.text}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      {pendingTooLong && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 font-bold">LATE</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono ${pendingTooLong ? "text-red-400" : "text-zinc-500"}`}>
                      {formatElapsed(elapsed)}
                    </span>
                  </div>
                  
                  {/* Business name */}
                  <div className="text-sm font-medium text-white truncate mb-1">{businessName}</div>
                  
                  {/* Customer */}
                  <div className="text-xs text-zinc-400 truncate mb-2">
                    <span className="text-zinc-600">{"\u2192"}</span> {customerName}
                  </div>
                  
                  {/* Bottom row: driver + price + eta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.driver ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10">
                          <div className={`w-4 h-4 rounded-full ${getAvatarColor(order.driver.id)} flex items-center justify-center text-[8px] font-bold text-white`}>
                            {getInitials(order.driver.firstName, order.driver.lastName)}
                          </div>
                          <span className="text-[10px] text-emerald-400 font-medium">{order.driver.firstName}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 font-medium">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {etaMin && (
                        <span className="text-[10px] text-zinc-500">{etaMin}m</span>
                      )}
                      <span className="text-xs font-medium text-white">{"\u20AC"}{order.totalPrice?.toFixed(2) || "0"}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className="text-center text-zinc-600 text-sm py-8">
                No active orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════ BOTTOM ORDER DETAIL PANEL ════════════════ */}
      {selectedOrder && (
        <BottomDetailPanel
          order={selectedOrder}
          drivers={drivers}
          activeOrders={activeOrders}
          orderDistances={orderDistances}
          driverMap={driverMap}
          now={now}
          statusChangeTime={statusChangeTime}
          expanded={detailPanelExpanded}
          onToggleExpand={() => setDetailPanelExpanded(!detailPanelExpanded)}
          onClose={() => { setSelectedOrderId(null); setDetailPanelExpanded(false); }}
          onAssignDriver={handleAssignDriver}
          onAutoAssign={handleAutoAssign}
          onUpdateStatus={handleUpdateStatus}
          onTogglePolyline={() => setShowPolylines((prev) => ({ ...prev, [selectedOrder.id]: !prev[selectedOrder.id] }))}
          showPolyline={showPolylines[selectedOrder.id] || false}
          onToggleBothRoutes={() => setShowBothRoutes((prev) => ({ ...prev, [selectedOrder.id]: !prev[selectedOrder.id] }))}
          showBothRoutes={showBothRoutes[selectedOrder.id] || false}
          onFocus={() => focusOrder(selectedOrder)}
          driverProgressOnRoute={driverProgressOnRoute}
        />
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════╗
// ║              BOTTOM DETAIL PANEL                        ║
// ╚══════════════════════════════════════════════════════════╝
function BottomDetailPanel({
  order, drivers, activeOrders, orderDistances, driverMap, now, statusChangeTime,
  expanded, onToggleExpand, onClose, onAssignDriver, onAutoAssign, onUpdateStatus,
  onTogglePolyline, showPolyline, onToggleBothRoutes, showBothRoutes,
  onFocus, driverProgressOnRoute,
}: any) {
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
  const isPending = order.status === "PENDING";
  const orderDateMs = order.orderDate ? new Date(order.orderDate).getTime() : now;
  const elapsed = now - orderDateMs;
  const pendingTooLong = isPending && elapsed > PENDING_WARNING_MS;
  const statusStartMs = statusChangeTime[order.id] || orderDateMs;
  const statusElapsed = now - statusStartMs;
  const prepTimeMinutes = order.businesses?.[0]?.business?.avgPrepTimeMinutes;
  const prepProgress = (isPending || order.status === "READY") && prepTimeMinutes
    ? Math.min(statusElapsed / (prepTimeMinutes * 60 * 1000), 1)
    : order.status === "OUT_FOR_DELIVERY"
      ? driverProgressOnRoute[order.driver?.id] || 0
      : 0;

  useEffect(() => { setSelectedDriverId(order.driver?.id || ""); }, [order.driver?.id]);

  return (
    <div className={`absolute bottom-0 left-[280px] right-[72px] z-40 transition-all duration-300 ${expanded ? "h-[320px]" : "h-[180px]"}`}>
      <div className="absolute inset-0 bg-[#0a0a0b]/95 backdrop-blur-xl border-t border-white/10 rounded-t-xl" />

      <div className="relative h-full flex flex-col">
        {/* Handle bar + header */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
          <div className="flex items-center gap-3">
            <PrepTimeRing size={40} stroke={2.5} progress={prepProgress} color={pendingTooLong ? "#ef4444" : statusColor.hex}>
              <div className={`text-[10px] font-bold ${pendingTooLong ? "text-red-400" : statusColor.text}`}>
                {isPending ? `${Math.floor(elapsed / 60000)}m` : etaMin ? `${etaMin}m` : "\u2014"}
              </div>
            </PrepTimeRing>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase ${pendingTooLong ? "text-red-400" : statusColor.text}`}>
                  {order.status.replace(/_/g, " ")}
                </span>
                {pendingTooLong && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse font-bold">
                    OVERDUE
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-white mt-0.5">{businessNames}</div>
              <div className="text-xs text-zinc-500">{"\u2192"} {customerName}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={onFocus} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition" title="Focus on map">
              <Crosshair size={13} />
            </button>
            {distanceData && (
              <button onClick={onTogglePolyline}
                className={`p-1.5 rounded-lg transition ${showPolyline ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"}`}
                title={showPolyline ? "Hide route" : "Show route"}>
                <Route size={13} />
              </button>
            )}
            <button onClick={onToggleExpand}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition" title="Close">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-4 pb-3">
          <div className="grid grid-cols-4 gap-3">
            {/* Column 1: Order Info */}
            <div className="space-y-2">
              <div className="text-[9px] text-zinc-500 uppercase font-semibold">Order</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Value</span>
                  <span className="text-white font-medium">{"\u20AC"}{order.totalPrice?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payment</span>
                  <span className="text-white">{order.paymentMethod || "Cash"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{isPending ? "Waiting" : "In status"}</span>
                  <span className={`font-mono ${pendingTooLong ? "text-red-400 font-bold" : "text-zinc-300"}`}>
                    {isPending ? formatElapsed(elapsed) : formatElapsed(statusElapsed)}
                  </span>
                </div>
                {etaMin && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ETA</span>
                    <span className="text-emerald-400 font-medium">{etaMin} min</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: People */}
            <div className="space-y-2">
              <div className="text-[9px] text-zinc-500 uppercase font-semibold">People</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5">
                  <Store size={11} className="text-violet-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-white truncate">{businessNames}</div>
                    {businessPhones && <div className="text-[9px] text-zinc-500">{businessPhones}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5">
                  <User size={11} className="text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-white truncate">{customerName}</div>
                    {customerPhone && <div className="text-[9px] text-zinc-500">{customerPhone}</div>}
                    {order.dropOffLocation?.address && <div className="text-[9px] text-zinc-600 truncate">{order.dropOffLocation.address}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Driver Assignment */}
            <div className="space-y-2">
              <div className="text-[9px] text-zinc-500 uppercase font-semibold">Driver</div>
              {order.driver ? (
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5">
                  {(() => {
                    const driver = driverMap[order.driver.id];
                    const cs = (driver?.driverConnection?.connectionStatus ?? "DISCONNECTED") as keyof typeof DRIVER_CONNECTION_COLORS;
                    const ss = DRIVER_CONNECTION_COLORS[cs];
                    const SI = ss.icon;
                    return (
                      <>
                        <div className={`w-7 h-7 rounded-full ${getAvatarColor(order.driver.id)} flex items-center justify-center font-bold text-white text-[10px] border ${ss.border}`}>
                          {getInitials(order.driver.firstName, order.driver.lastName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-white font-medium">{order.driver.firstName} {order.driver.lastName}</div>
                          <div className={`flex items-center gap-1 text-[9px] ${ss.text}`}><SI size={8} />{ss.label}</div>
                        </div>
                        <button onClick={() => onAssignDriver(order.id, null)} className="px-1.5 py-0.5 text-[9px] bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30">×</button>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="max-h-[70px] overflow-y-auto space-y-1">
                    {drivers.filter((d: any) => isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS).map((driver: any) => {
                      const cs = (driver.driverConnection?.connectionStatus ?? "DISCONNECTED") as keyof typeof DRIVER_CONNECTION_COLORS;
                      const ss = DRIVER_CONNECTION_COLORS[cs];
                      const SI = ss.icon;
                      const isSelected = selectedDriverId === driver.id;
                      return (
                        <button key={driver.id} onClick={() => setSelectedDriverId(driver.id)}
                          className={`w-full flex items-center gap-2 p-1 rounded text-left transition ${isSelected ? "bg-blue-500/20 border border-blue-500/40" : "bg-white/5 hover:bg-white/10 border border-transparent"}`}>
                          <div className={`w-5 h-5 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center text-white text-[8px] font-bold border ${ss.border}`}>
                            {getInitials(driver.firstName, driver.lastName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-white truncate">{driver.firstName} {driver.lastName}</div>
                          </div>
                          <SI size={9} className={ss.text} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => selectedDriverId && onAssignDriver(order.id, selectedDriverId)}
                      disabled={!selectedDriverId}
                      className={`flex-1 px-2 py-1 rounded text-[10px] font-medium transition ${selectedDriverId ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
                      Assign
                    </button>
                    <button onClick={() => onAutoAssign(order.id)}
                      className="flex-1 px-2 py-1 rounded text-[10px] font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center gap-1">
                      <Zap size={9} />Auto
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Column 4: Status & Actions */}
            <div className="space-y-2">
              <div className="text-[9px] text-zinc-500 uppercase font-semibold">Status</div>
              <select value={order.status} onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className={`w-full border rounded-lg px-2 py-1.5 text-[11px] font-medium text-white ${statusColor.selectBg} ${statusColor.border}`}
                style={{ colorScheme: "dark" }}>
                <option value="PENDING" style={{ backgroundColor: "#1f2937" }}>Pending</option>
                <option value="READY" style={{ backgroundColor: "#1f2937" }}>Ready</option>
                <option value="OUT_FOR_DELIVERY" style={{ backgroundColor: "#1f2937" }}>Out for Delivery</option>
                <option value="DELIVERED" style={{ backgroundColor: "#1f2937" }}>Delivered</option>
                <option value="CANCELLED" style={{ backgroundColor: "#1f2937" }}>Cancelled</option>
              </select>

              <div className="space-y-1">
                {distanceData && (
                  <>
                    <button onClick={onTogglePolyline}
                      className={`w-full px-2 py-1 rounded text-[10px] font-medium transition flex items-center justify-center gap-1 ${showPolyline ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"}`}>
                      <Route size={10} />{showPolyline ? "Hide" : "Show"} Route {etaMin ? `(${etaMin}m)` : ""}
                    </button>
                    {order.driver && (order.status === "READY" || order.status === "PENDING") && (
                      <button onClick={onToggleBothRoutes}
                        className={`w-full px-2 py-1 rounded text-[10px] font-medium transition flex items-center justify-center gap-1 ${showBothRoutes ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"}`}>
                        <Route size={10} />{showBothRoutes ? "Hide" : "Show"} Both Routes
                      </button>
                    )}
                  </>
                )}
              </div>

              {expanded && order.businesses?.length > 0 && (
                <div>
                  <button onClick={() => setShowItems(!showItems)}
                    className="text-[9px] text-zinc-600 uppercase hover:text-zinc-400 transition flex items-center gap-1">
                    {showItems ? <ChevronDown size={9} /> : <ChevronUp size={9} />}Items
                  </button>
                  {showItems && (
                    <div className="mt-1 space-y-0.5">
                      {order.businesses.flatMap((b: any) =>
                        (b.items || []).map((item: any, idx: number) => (
                          <div key={`${b.business?.id}-${idx}`} className="flex justify-between text-[9px]">
                            <span className="text-zinc-400">{item.quantity}x {item.name || "Item"}</span>
                            <span className="text-zinc-500">{"\u20AC"}{((item.price || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
