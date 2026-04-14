// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useRef, useState, Fragment, useCallback } from "react";
import { useMutation, useLazyQuery, useQuery, useSubscription } from "@apollo/client/react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import {
  MapPin, X, Filter, Clock, Package, Phone,
  User, Store, Calendar, AlertCircle, WifiOff, Signal,
  SignalLow, SignalZero, ChevronDown, ChevronUp, Eye, EyeOff,
  Zap, Route, ExternalLink, Crosshair, LocateFixed, Mic, Radio, Utensils,
  MessageSquare, Send, BatteryLow, Battery, BatteryCharging, ChevronLeft,
  Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { ASSIGN_DRIVER_TO_ORDER, UPDATE_ORDER_STATUS, ADMIN_CANCEL_ORDER, SET_ORDER_ADMIN_NOTE, APPROVE_ORDER, START_PREPARING } from "@/graphql/operations/orders";
import { ADMIN_UPDATE_DRIVER_LOCATION, ADMIN_SET_SHIFT_DRIVERS, UPDATE_USER_NOTE_MUTATION } from "@/graphql/operations/users/mutations";
import { getDirectionsTelemetry } from "@/lib/utils/mapbox";
import { USERS_QUERY } from "@/graphql/operations/users/queries";
import { SEND_DRIVER_MESSAGE, MARK_DRIVER_MESSAGES_READ } from "@/graphql/operations/driverMessages/mutations";
import { GET_DRIVER_MESSAGES } from "@/graphql/operations/driverMessages/queries";
import { ADMIN_MESSAGE_RECEIVED } from "@/graphql/operations/driverMessages/subscriptions";
import { SEND_BUSINESS_MESSAGE, MARK_BUSINESS_MESSAGES_READ } from "@/graphql/operations/businessMessages/mutations";
import { GET_BUSINESS_MESSAGES } from "@/graphql/operations/businessMessages/queries";
import { ADMIN_BUSINESS_MESSAGE_RECEIVED } from "@/graphql/operations/businessMessages/subscriptions";
import { GET_BUSINESS_DEVICE_HEALTH } from "@/graphql/operations/notifications";
import { GET_ORDER_COVERAGE } from "@/graphql/operations/inventory/queries";
import InventoryCoverageModal from "@/components/inventory/InventoryCoverageModal";
import CancelOrderModal from "@/components/orders/CancelOrderModal";
import type { CancelReasonCategory } from "@/components/orders/CancelOrderModal";
import { getInitials, getAvatarColor } from "@/lib/avatarUtils";
import { useAdminPtt } from "@/lib/hooks/useAdminPtt";

import { useMapRealtimeData } from "@/lib/hooks/useMapRealtimeData";
import { useOrderRouteDistances } from "@/lib/hooks/useOrderRouteDistances";
import { usePrepTimeAlerts, type PrepTimeAlert } from "@/lib/hooks/usePrepTimeAlerts";
import { toast } from 'sonner';

// ╔══════════════════════════════════════════════════════════╗
// ║                      CONSTANTS                          ║
// ╚══════════════════════════════════════════════════════════╝
const DEFAULT_CENTER = { latitude: 42.4635, longitude: 21.4694 };
const GJILAN_BOUNDS: [[number, number], [number, number]] = [[21.39, 42.40], [21.55, 42.53]];
const MIN_ZOOM = 11.5;
const MAX_ZOOM = 17;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "mapbox://styles/mapbox/dark-v11";
const TRUSTED_CUSTOMER_MARKER = '[TRUSTED_CUSTOMER]';
const APPROVAL_MODAL_SUPPRESS_MARKER = '[SUPPRESS_APPROVAL_MODAL]';

const PENDING_WARNING_MS = 2 * 60 * 1000; // 2 minutes

function getMarginSeverity(netMargin: number): 'healthy' | 'thin' | 'negative' {
  return netMargin < 0 ? 'negative' : netMargin < 1.5 ? 'thin' : 'healthy';
}
const READY_WARNING_MS = 3 * 60 * 1000;
const OUT_FOR_DELIVERY_WARNING_MS = 10 * 60 * 1000;
const ANIMATION_COMMIT_INTERVAL_MS = 33; // ~30 FPS UI commits
const DRIVER_GAP_DEFAULT_MS = 5000;
const DRIVER_GAP_MIN_MS = 500;
const DRIVER_GAP_MAX_MS = 15000;
const DRIVER_TAU_MIN_MS = 110;
const DRIVER_TAU_MAX_MS = 480;
const DRIVER_LOOKAHEAD_MIN_SEC = 0.35;
const DRIVER_LOOKAHEAD_MAX_SEC = 1.2;
const DRIVER_TELEPORT_GUARD_METERS = 800;
const DRIVER_JITTER_DEAD_ZONE_METERS = 5; // ignore GPS jitter below this threshold
const INCIDENT_STORAGE_KEY = 'admin.map.incidentNotes.v1';

type IncidentNote = { tag: string; rootCause: string; updatedAt: number };
type RealtimeHealth = {
  driverLastSubAtMs: number;
  orderLastSubAtMs: number;
  driverPollingFallback: boolean;
  orderFallbackRefetchAtMs: number;
};

const ORDER_STATUS_COLORS = {
  AWAITING_APPROVAL: { bg: "bg-rose-500/10", border: "border-rose-500/50", text: "text-rose-400", marker: "#f43f5e", selectBg: "bg-rose-500/20", hex: "#f43f5e" },
  PENDING: { bg: "bg-amber-500/10", border: "border-amber-500/50", text: "text-amber-500", marker: "#f59e0b", selectBg: "bg-amber-500/20", hex: "#f59e0b" },
  PREPARING: { bg: "bg-violet-500/10", border: "border-violet-500/50", text: "text-violet-400", marker: "#8b5cf6", selectBg: "bg-violet-500/20", hex: "#8b5cf6" },
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

const SERVER_TS_NO_TZ_REGEX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
const SERVER_TS_HAS_TZ_REGEX = /(Z|[+-]\d{2}:\d{2})$/i;

const parseServerTimeMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  // Treat backend naive timestamps as UTC to avoid local TZ drift.
  const isoLike = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  const normalized = SERVER_TS_NO_TZ_REGEX.test(isoLike) && !SERVER_TS_HAS_TZ_REGEX.test(isoLike)
    ? `${isoLike}Z`
    : isoLike;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatLocalDateTime = (timestampMs: number | null) => {
  if (!timestampMs) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestampMs));
};

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

const formatHeartbeatElapsed = (lastHeartbeat: string | null | undefined, now: number) => {
  const heartbeatMs = parseServerTimeMs(lastHeartbeat);
  if (!heartbeatMs) return "Never";
  const elapsed = now - heartbeatMs;
  if (elapsed < 0) return "Just now";
  if (elapsed < 5000) return "Just now";
  if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
  return `${Math.floor(elapsed / 3600000)}h ago`;
};

const isTrustedCustomer = (user: any) => {
  if (!user) return false;
  if (user.isTrustedCustomer) return true;
  if (String(user.flagColor || '').toLowerCase() === 'green') return true;
  return String(user.adminNote || '').toUpperCase().includes(TRUSTED_CUSTOMER_MARKER);
};

const upsertTrustMarker = (note?: string | null) => {
  const cleaned = String(note || '').replace(TRUSTED_CUSTOMER_MARKER, '').trim();
  return cleaned ? `${TRUSTED_CUSTOMER_MARKER}\n${cleaned}` : TRUSTED_CUSTOMER_MARKER;
};

const removeTrustMarker = (note?: string | null) => {
  const cleaned = String(note || '').replace(TRUSTED_CUSTOMER_MARKER, '').trim();
  return cleaned || null;
};

const isApprovalModalSuppressed = (user: any) => {
  if (!user) return false;
  return String(user.adminNote || '').toUpperCase().includes(APPROVAL_MODAL_SUPPRESS_MARKER);
};

const upsertApprovalModalSuppressMarker = (note?: string | null) => {
  const cleaned = String(note || '').replace(APPROVAL_MODAL_SUPPRESS_MARKER, '').trim();
  return cleaned ? `${APPROVAL_MODAL_SUPPRESS_MARKER}\n${cleaned}` : APPROVAL_MODAL_SUPPRESS_MARKER;
};

const removeApprovalModalSuppressMarker = (note?: string | null) => {
  const cleaned = String(note || '').replace(APPROVAL_MODAL_SUPPRESS_MARKER, '').trim();
  return cleaned || null;
};

const getApprovalReasons = (order: any): Array<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'> => {
  const normalized = new Set<'FIRST_ORDER' | 'HIGH_VALUE' | 'OUT_OF_ZONE'>();
  for (const reason of order?.approvalReasons || []) {
    if (reason === 'FIRST_ORDER' || reason === 'HIGH_VALUE' || reason === 'OUT_OF_ZONE') {
      normalized.add(reason);
    }
  }

  if (order?.locationFlagged) normalized.add('OUT_OF_ZONE');

  // Fallback for sparse payloads: keep high-value visibility for approval-needed orders.
  if (order?.needsApproval && normalized.size === 0 && Number(order?.totalPrice || 0) > 20) {
    normalized.add('HIGH_VALUE');
  }

  return Array.from(normalized);
};

const getOrderStatusStartMs = (order: any, fallbackNow: number) => {
  const createdMs = parseServerTimeMs(order?.orderDate);
  const updatedMs = parseServerTimeMs(order?.updatedAt);
  const preparingMs = parseServerTimeMs(order?.preparingAt);

  if (order?.status === "PENDING") return createdMs ?? updatedMs ?? fallbackNow;
  if (order?.status === "READY") return preparingMs ?? updatedMs ?? createdMs ?? fallbackNow;
  if (order?.status === "OUT_FOR_DELIVERY") return updatedMs ?? preparingMs ?? createdMs ?? fallbackNow;
  if (order?.status === "DELIVERED" || order?.status === "CANCELLED") return updatedMs ?? createdMs ?? fallbackNow;

  return updatedMs ?? createdMs ?? fallbackNow;
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

const bearingDeg = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
  const fromLatRad = (from.latitude * Math.PI) / 180;
  const toLatRad = (to.latitude * Math.PI) / 180;
  const deltaLngRad = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLngRad) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad);
  const angleDeg = (Math.atan2(y, x) * 180) / Math.PI;
  return (angleDeg + 360) % 360;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const getStatusElapsedMs = (order: any, nowMs: number, statusChangeTime: Record<string, number>) => {
  const statusStartMs = statusChangeTime[order.id] || getOrderStatusStartMs(order, nowMs);
  return Math.max(0, nowMs - statusStartMs);
};

const getOrderSlaRisk = (order: any, nowMs: number, statusChangeTime: Record<string, number>) => {
  const statusElapsedMs = getStatusElapsedMs(order, nowMs, statusChangeTime);
  if (order.status === 'PENDING') {
    if (statusElapsedMs > PENDING_WARNING_MS * 2) return { level: 'critical', delayMs: statusElapsedMs - PENDING_WARNING_MS };
    if (statusElapsedMs > PENDING_WARNING_MS) return { level: 'warning', delayMs: statusElapsedMs - PENDING_WARNING_MS };
  }
  if (order.status === 'READY') {
    if (statusElapsedMs > READY_WARNING_MS * 2) return { level: 'critical', delayMs: statusElapsedMs - READY_WARNING_MS };
    if (statusElapsedMs > READY_WARNING_MS) return { level: 'warning', delayMs: statusElapsedMs - READY_WARNING_MS };
  }
  if (order.status === 'OUT_FOR_DELIVERY') {
    if (statusElapsedMs > OUT_FOR_DELIVERY_WARNING_MS * 2) return { level: 'critical', delayMs: statusElapsedMs - OUT_FOR_DELIVERY_WARNING_MS };
    if (statusElapsedMs > OUT_FOR_DELIVERY_WARNING_MS) return { level: 'warning', delayMs: statusElapsedMs - OUT_FOR_DELIVERY_WARNING_MS };
  }
  return { level: 'ok', delayMs: 0 };
};

const ROUTE_SNAP_MAX_DISTANCE_M = 50;

/** Snap a lat/lng point to the nearest segment of a [lon,lat][] polyline. */
const snapToRoute = (
  point: { latitude: number; longitude: number },
  geometry: [number, number][],
): { latitude: number; longitude: number } | null => {
  if (geometry.length < 2) return null;
  const latRad = (point.latitude * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);
  const px = point.longitude * mPerDegLng;
  const py = point.latitude * mPerDegLat;

  let bestDist = Infinity;
  let bestLat = point.latitude;
  let bestLng = point.longitude;

  for (let i = 0; i < geometry.length - 1; i++) {
    const ax = geometry[i][0] * mPerDegLng;
    const ay = geometry[i][1] * mPerDegLat;
    const bx = geometry[i + 1][0] * mPerDegLng;
    const by = geometry[i + 1][1] * mPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq < 1e-9 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
    const projX = ax + dx * t;
    const projY = ay + dy * t;
    const dist = Math.hypot(px - projX, py - projY);
    if (dist < bestDist) {
      bestDist = dist;
      bestLat = geometry[i][1] + (geometry[i + 1][1] - geometry[i][1]) * t;
      bestLng = geometry[i][0] + (geometry[i + 1][0] - geometry[i][0]) * t;
    }
  }

  return bestDist <= ROUTE_SNAP_MAX_DISTANCE_M ? { latitude: bestLat, longitude: bestLng } : null;
};

const getOrderBusinesses = (order: any) => (
  Array.isArray(order?.businesses) ? order.businesses : []
);

const getOrderBusinessItems = (businessEntry: any) => (
  Array.isArray(businessEntry?.items) ? businessEntry.items : []
);

const normalizeOrderShape = (order: any) => ({
  ...order,
  businesses: getOrderBusinesses(order).map((businessEntry: any) => ({
    ...businessEntry,
    items: getOrderBusinessItems(businessEntry),
  })),
});

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

function getOrderEtaMinutes(
  order: any,
  distanceData: any,
  nowMs: number,
  routeProgress: number,
  driver: any,
): number | null {
  const liveEtaOrderId = driver?.driverConnection?.activeOrderId;
  const liveEtaSeconds = driver?.driverConnection?.remainingEtaSeconds;
  const liveEtaUpdatedAt = driver?.driverConnection?.etaUpdatedAt;
  const liveEtaUpdatedAtMs = liveEtaUpdatedAt ? new Date(liveEtaUpdatedAt).getTime() : 0;
  const liveEtaIsFresh = liveEtaUpdatedAtMs > 0 && nowMs - liveEtaUpdatedAtMs <= 20000;

  if (
    liveEtaIsFresh &&
    liveEtaOrderId === order.id &&
    typeof liveEtaSeconds === "number" &&
    Number.isFinite(liveEtaSeconds)
  ) {
    if (liveEtaSeconds <= 0) return 0;
    return Math.max(1, Math.round(liveEtaSeconds / 60));
  }

  if (!distanceData) return null;

  const calculatedAtMs = distanceData.calculatedAtMs ?? nowMs;
  const elapsedSec = Math.max(0, (nowMs - calculatedAtMs) / 1000);

  const toPickupSec = distanceData?.toPickup?.durationMin
    ? Math.max(0, distanceData.toPickup.durationMin * 60)
    : 0;
  const toDropoffSec = distanceData?.toDropoff?.durationMin
    ? Math.max(0, distanceData.toDropoff.durationMin * 60)
    : 0;

  if (order.status === "OUT_FOR_DELIVERY") {
    const progressRemainingSec = toDropoffSec > 0 ? toDropoffSec * Math.max(0, 1 - routeProgress) : 0;
    const decayedSec = Math.max(0, toDropoffSec - elapsedSec);
    const remainingSec = Math.min(progressRemainingSec || decayedSec, decayedSec || progressRemainingSec);
    if (remainingSec <= 0) return 0;
    return Math.max(1, Math.round(remainingSec / 60));
  }

  if (toPickupSec > 0 || toDropoffSec > 0) {
    const totalSec = toPickupSec + toDropoffSec;
    const remainingSec = Math.max(0, totalSec - elapsedSec);
    if (remainingSec <= 0) return 0;
    return Math.max(1, Math.round(remainingSec / 60));
  }

  return null;
}

// ╔══════════════════════════════════════════════════════════╗
// ║                    MAP PAGE                             ║
// ╚══════════════════════════════════════════════════════════╝
export default function MapPage() {
  // Realtime data sync is encapsulated in a dedicated hook to keep page logic UI-focused.
  const { businesses, orders: rawOrders, drivers, realtimeHealth } = useMapRealtimeData() as {
    businesses: any[];
    orders: any[];
    drivers: any[];
    realtimeHealth: RealtimeHealth;
  };
  
  const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS, { fetchPolicy: "no-cache" });
  const [startPreparingOrder, { loading: startPreparingLoading }] = useMutation(START_PREPARING, { fetchPolicy: "no-cache" });
  const [sendDriverMessage] = useMutation(SEND_DRIVER_MESSAGE);
  const [setShiftDrivers] = useMutation(ADMIN_SET_SHIFT_DRIVERS);
  const [sendBusinessMessage] = useMutation(SEND_BUSINESS_MESSAGE);
  const [markBusinessMessagesRead] = useMutation(MARK_BUSINESS_MESSAGES_READ);
  const { data: bizDeviceData } = useQuery(GET_BUSINESS_DEVICE_HEALTH, {
    variables: { hours: 2 },
    pollInterval: 15000,
    fetchPolicy: 'cache-and-network',
  });
  const bizDeviceRows: any[] = (bizDeviceData as any)?.businessDeviceHealth ?? [];
  // Business chat state
  const [chatBizUserId, setChatBizUserId] = useState<string | null>(null);
  const [chatBizInput, setChatBizInput] = useState('');
  const [chatBizMessages, setChatBizMessages] = useState<any[]>([]);
  const chatBizBottomRef = useRef<HTMLDivElement | null>(null);
  const [loadBizMessages, { loading: chatBizLoading }] = useLazyQuery(GET_BUSINESS_MESSAGES, {
    fetchPolicy: 'no-cache',
    onCompleted: (data) => {
      const msgs = [...((data as any)?.businessMessages ?? [])].reverse();
      setChatBizMessages(msgs);
      setTimeout(() => chatBizBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });
  const [inventoryModalOrder, setInventoryModalOrder] = useState<any | null>(null);
  const [fetchOrderCoverage, { data: coverageData, loading: coverageLoading }] = useLazyQuery(GET_ORDER_COVERAGE, { fetchPolicy: 'network-only' });
  useSubscription(ADMIN_BUSINESS_MESSAGE_RECEIVED, {
    variables: { businessUserId: chatBizUserId ?? '' },
    skip: !chatBizUserId,
    onData: ({ data }) => {
      const msg = data.data?.adminBusinessMessageReceived;
      if (!msg) return;
      setChatBizMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(() => chatBizBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });
  const { data: usersData } = useQuery(USERS_QUERY, {
    variables: { limit: 2000, offset: 0 },
    fetchPolicy: 'cache-first',
  });

  const orders = useMemo(
    () => (rawOrders as any[]).map(normalizeOrderShape),
    [rawOrders],
  );

  const activeOrders = useMemo(
    () => orders.filter((o: any) => o.status !== "DELIVERED" && o.status !== "CANCELLED"),
    [orders]
  );

  const WORKING_DRIVERS_KEY = 'admin.map.workingDriverIds.v1';
  const [workingDriverIds, setWorkingDriverIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(WORKING_DRIVERS_KEY);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleWorkingDriver = async (driverId: string) => {
    const prev = new Set(workingDriverIds);
    const next = new Set(prev);
    if (next.has(driverId)) { next.delete(driverId); } else { next.add(driverId); }
    const nextArr = [...next];
    // Optimistic update
    setWorkingDriverIds(next);
    try { localStorage.setItem(WORKING_DRIVERS_KEY, JSON.stringify(nextArr)); } catch {}
    try {
      await setShiftDrivers({ variables: { driverIds: nextArr } });
    } catch {
      // Revert on failure so UI stays in sync with server
      setWorkingDriverIds(prev);
      try { localStorage.setItem(WORKING_DRIVERS_KEY, JSON.stringify([...prev])); } catch {}
      toast.error('Failed to update shift — driver list not saved');
    }
  };
  // A driver is considered "on shift" if workingDriverIds is empty (backward compat) OR they are explicitly marked working
  const isOnShift = (driverId: string) => workingDriverIds.size === 0 || workingDriverIds.has(driverId);

  // == REFS ==
  const mapRef = useRef<any>(null);
  const prevOrderStatusRef = useRef<Record<string, string>>({});
  const driverMotionTargetsRef = useRef<Record<string, DriverMotionTarget>>({});
  const animatedDriverPositionsRef = useRef<Record<string, AnimatedDriverPoint>>({});
  const lastAnimationFrameTsRef = useRef<number>(0);
  const lastAnimationCommitTsRef = useRef<number>(0);
  const lastDriverLocationUpdateMsRef = useRef<Record<string, number>>({});
  const observedDriverGapMsRef = useRef<Record<string, number>>({});
  const smoothedDriverGapMsRef = useRef<Record<string, number>>({});
  const driverHeadingDegRef = useRef<Record<string, number>>({});
  const orderRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeOrdersRef = useRef<any[]>([]);
  const orderDistancesRef = useRef<any>({});

  // == STATE ==
  const [now, setNow] = useState(Date.now());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "ALL", driver: "ALL", business: "ALL", unassignedOnly: false });
  const [driverFilter, setDriverFilter] = useState<string>("ALL");
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
  const [showSlaHeat, setShowSlaHeat] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showDriverPanel, setShowDriverPanel] = useState(true);
  const [detailPanelExpanded, setDetailPanelExpanded] = useState(false);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'order' | 'drivers' | 'businesses'>('order');
  const [confirmNoDriverAction, setConfirmNoDriverAction] = useState<{ orderId: string; status: string } | null>(null);
  // Status confirmation
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; status: string } | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("20");
  // Cancel modal
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonCategory, setCancelReasonCategory] = useState<CancelReasonCategory | null>(null);
  const [cancelSettleDriver, setCancelSettleDriver] = useState(false);
  const [cancelSettleBusiness, setCancelSettleBusiness] = useState(false);
  // Approval modal
  const [approvalModalOrderId, setApprovalModalOrderId] = useState<string | null>(null);
  const [dismissedApprovalOrderIds, setDismissedApprovalOrderIds] = useState<Set<string>>(new Set());
  const seenFlaggedOrderIdsRef = useRef<Set<string>>(new Set());
  const [prepTimeAlerts, setPrepTimeAlerts] = useState<PrepTimeAlert[]>([]);
  const { dismiss: dismissPrepAlert } = usePrepTimeAlerts(setPrepTimeAlerts);
  const [adminCancelOrder, { loading: cancellingOrder }] = useMutation(ADMIN_CANCEL_ORDER, { refetchQueries: ['GetOrders'] });
  const [approveOrder, { loading: approvingOrder }] = useMutation(APPROVE_ORDER, { fetchPolicy: 'no-cache' });
  const [setOrderAdminNote] = useMutation(SET_ORDER_ADMIN_NOTE);
  const [updateUserNote] = useMutation(UPDATE_USER_NOTE_MUTATION, { refetchQueries: ['GetOrders'] });
  const [trustUpdatingUserId, setTrustUpdatingUserId] = useState<string | null>(null);
  const [suppressionUpdatingUserId, setSuppressionUpdatingUserId] = useState<string | null>(null);
  const cancelModalOrder = useMemo(() => cancelModalOrderId ? activeOrders.find((o: any) => o.id === cancelModalOrderId) ?? null : null, [cancelModalOrderId, activeOrders]);
  const approvalModalOrder = useMemo(() => approvalModalOrderId ? activeOrders.find((o: any) => o.id === approvalModalOrderId) ?? null : null, [approvalModalOrderId, activeOrders]);
  const dismissApprovalModal = useCallback(() => {
    if (approvalModalOrderId) {
      setDismissedApprovalOrderIds((prev) => {
        const next = new Set(prev);
        next.add(approvalModalOrderId);
        return next;
      });
    }
    setApprovalModalOrderId(null);
  }, [approvalModalOrderId]);

  const setApprovalModalSuppressionForUser = useCallback(async (user: any, suppress: boolean) => {
    if (!user?.id) return;
    setSuppressionUpdatingUserId(user.id);
    try {
      const nextNote = suppress
        ? upsertApprovalModalSuppressMarker(user.adminNote)
        : removeApprovalModalSuppressMarker(user.adminNote);

      await updateUserNote({
        variables: {
          userId: user.id,
          note: nextNote,
          flagColor: user.flagColor ?? null,
        },
      });
      toast.success(suppress ? 'Auto-popup muted for this customer' : 'Auto-popup enabled for this customer');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update popup preference');
    } finally {
      setSuppressionUpdatingUserId(null);
    }
  }, [updateUserNote]);

  const handleToggleTrustedCustomer = useCallback(async (user: any, trust: boolean) => {
    if (!user?.id) return;
    setTrustUpdatingUserId(user.id);
    try {
      const nextNote = trust ? upsertTrustMarker(user.adminNote) : removeTrustMarker(user.adminNote);
      const nextFlagColor = trust
        ? 'green'
        : (nextNote ? ((user.flagColor && user.flagColor !== 'green') ? user.flagColor : 'yellow') : null);

      await updateUserNote({
        variables: {
          userId: user.id,
          note: nextNote,
          flagColor: nextFlagColor,
        },
      });
      toast.success(trust ? 'Customer marked as trusted' : 'Trusted flag removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update trusted customer status');
    } finally {
      setTrustUpdatingUserId(null);
    }
  }, [updateUserNote]);

  useEffect(() => {
    const flaggedOrders = activeOrders.filter((order: any) => {
      if (!order.needsApproval) return false;
      return !isApprovalModalSuppressed(order?.user);
    });
    const seen = seenFlaggedOrderIdsRef.current;
    const newFlagged = flaggedOrders.filter((order: any) => !seen.has(order.id));

    flaggedOrders.forEach((order: any) => seen.add(order.id));

    if (!approvalModalOrderId && newFlagged.length > 0) {
      setApprovalModalOrderId(newFlagged[0].id);
    }
  }, [activeOrders, approvalModalOrderId]);
  // Driver chat
  const [chatDriverId, setChatDriverId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const [markDriverMessagesRead] = useMutation(MARK_DRIVER_MESSAGES_READ);
  const [loadDriverMessages, { loading: chatLoading }] = useLazyQuery(GET_DRIVER_MESSAGES, {
    fetchPolicy: 'no-cache',
    onCompleted: (data) => {
      const msgs = [...((data as any)?.driverMessages ?? [])].reverse();
      setChatMessages(msgs);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });
  useSubscription(ADMIN_MESSAGE_RECEIVED, {
    variables: { driverId: chatDriverId ?? '' },
    skip: !chatDriverId,
    onData: ({ data }) => {
      const msg = data.data?.adminMessageReceived;
      if (!msg) return;
      // deduplicate — ignore if already present (e.g. if subscription echoes sent messages)
      setChatMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });
  const [directionsTelemetry, setDirectionsTelemetry] = useState(() => getDirectionsTelemetry());
  const [driverHeadingDeg, setDriverHeadingDeg] = useState<Record<string, number>>({});
  const [incidentNotes, setIncidentNotes] = useState<Record<string, IncidentNote>>({});

  // == PTT (global) ==
  const [pttSelectedDriverIds, setPttSelectedDriverIds] = useState<string[]>([]);
  const { isTalking: pttIsTalking, pttError, driverTalkingId, startTalking, stopTalking } = useAdminPtt();

  // == FILTERED ==
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order: any) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (filters.driver !== "ALL" && order.driver?.id !== filters.driver) return false;
      if (filters.business !== "ALL" && !getOrderBusinesses(order).some((b: any) => b.business?.id === filters.business)) return false;
      if (filters.unassignedOnly && order.driver) return false;
      return true;
    });
  }, [activeOrders, filters, statusFilter]);

  const users = useMemo(() => (usersData as any)?.users ?? [], [usersData]);
  const businessContactByBusinessId = useMemo(() => {
    const byBusinessId: Record<string, any> = {};
    users.forEach((user: any) => {
      const businessId = user?.business?.id;
      if (!businessId) return;
      if (!byBusinessId[businessId] || user.role === 'BUSINESS_OWNER') {
        byBusinessId[businessId] = user;
      }
    });
    return byBusinessId;
  }, [users]);

  const zoneSlaBuckets = useMemo(() => {
    const buckets = new globalThis.Map<string, {
      key: string;
      latitude: number;
      longitude: number;
      orderIds: string[];
      warningCount: number;
      criticalCount: number;
      delayMinutes: number[];
      businessCounts: Record<string, number>;
    }>();

    activeOrders.forEach((order: any) => {
      const risk = getOrderSlaRisk(order, now, statusChangeTime);
      if (risk.level === 'ok') return;
      const drop = order?.dropOffLocation;
      if (!isValidLatLng(drop?.latitude, drop?.longitude)) return;

      const key = `${drop.latitude.toFixed(2)},${drop.longitude.toFixed(2)}`;
      const existing = buckets.get(key) ?? {
        key,
        latitude: 0,
        longitude: 0,
        orderIds: [],
        warningCount: 0,
        criticalCount: 0,
        delayMinutes: [],
        businessCounts: {},
      };

      const nextCount = existing.orderIds.length + 1;
      existing.latitude = (existing.latitude * existing.orderIds.length + drop.latitude) / nextCount;
      existing.longitude = (existing.longitude * existing.orderIds.length + drop.longitude) / nextCount;
      existing.orderIds.push(order.id);
      existing.delayMinutes.push(risk.delayMs / 60000);
      if (risk.level === 'critical') existing.criticalCount += 1;
      else existing.warningCount += 1;
      const businessName = getOrderBusinesses(order)[0]?.business?.name || 'Unknown';
      existing.businessCounts[businessName] = (existing.businessCounts[businessName] || 0) + 1;

      buckets.set(key, existing);
    });

    return Array.from(buckets.values())
      .map((bucket) => {
        const topBusiness = Object.entries(bucket.businessCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        return {
          ...bucket,
          p95DelayMinutes: percentile(bucket.delayMinutes, 95),
          topBusiness,
        };
      })
      .sort((a, b) => (b.criticalCount * 2 + b.warningCount) - (a.criticalCount * 2 + a.warningCount));
  }, [activeOrders, now, statusChangeTime]);

  const businessSlaChips = useMemo(() => {
    const byBusiness = new globalThis.Map<string, { businessName: string; delays: number[]; warning: number; critical: number }>();
    activeOrders.forEach((order: any) => {
      const risk = getOrderSlaRisk(order, now, statusChangeTime);
      if (risk.level === 'ok') return;
      const businessName = getOrderBusinesses(order)[0]?.business?.name || 'Unknown';
      const entry = byBusiness.get(businessName) ?? { businessName, delays: [], warning: 0, critical: 0 };
      entry.delays.push(risk.delayMs / 60000);
      if (risk.level === 'critical') entry.critical += 1;
      else entry.warning += 1;
      byBusiness.set(businessName, entry);
    });

    return Array.from(byBusiness.values())
      .map((entry) => ({
        ...entry,
        p95DelayMinutes: percentile(entry.delays, 95),
      }))
      .sort((a, b) => (b.critical * 2 + b.warning) - (a.critical * 2 + a.warning))
      .slice(0, 3);
  }, [activeOrders, now, statusChangeTime]);

  const selectedOrder = useMemo(
    () => activeOrders.find((o: any) => o.id === selectedOrderId) ?? null,
    [activeOrders, selectedOrderId]
  );

  // == STATS ==
  const stats = useMemo(() => {
    const pendingOrders = activeOrders.filter((o: any) => o.status === "PENDING");
    const preparingOrders = activeOrders.filter((o: any) => o.status === "PREPARING");
    const readyOrders = activeOrders.filter((o: any) => o.status === "READY");
    const outOrders = activeOrders.filter((o: any) => o.status === "OUT_FOR_DELIVERY");
    const todayDelivered = orders.filter((o: any) => {
      const d = o.orderDate ? new Date(o.orderDate) : null;
      return d && d.toDateString() === new Date().toDateString() && o.status === "DELIVERED";
    });
    const todayRevenue = todayDelivered.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);

    const pendingWarnings = pendingOrders.filter((o: any) => {
      const orderDate = parseServerTimeMs(o.orderDate) ?? now;
      return (now - orderDate) > PENDING_WARNING_MS;
    }).length;

    const driverStats = {
      connected: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "CONNECTED").length,
      stale: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "STALE").length,
      lost: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "LOST").length,
      disconnected: drivers.filter((d: any) => d.driverConnection?.connectionStatus === "DISCONNECTED" || !d.driverConnection?.connectionStatus).length,
      assignable: drivers.filter((d: any) => isDriverAssignable(d) && getActiveCountForDriver(d.id, activeOrders) < MAX_DRIVER_ACTIVE_ORDERS).length,
    };

    return { pendingOrders: pendingOrders.length, preparingOrders: preparingOrders.length, readyOrders: readyOrders.length, outOrders: outOrders.length, todayDelivered: todayDelivered.length, todayRevenue, pendingWarnings, driverStats, activeCount: activeOrders.length };
  }, [activeOrders, drivers, orders, now]);

  const driverMap = useMemo(() => {
    const map: Record<string, any> = {};
    drivers.forEach((d: any) => { map[d.id] = d; });
    return map;
  }, [drivers]);

  const activeOrderCountByBusinessId = useMemo(() => {
    const counts: Record<string, number> = {};
    activeOrders.forEach((order: any) => {
      getOrderBusinesses(order).forEach((be: any) => {
        if (be.business?.id) counts[be.business.id] = (counts[be.business.id] || 0) + 1;
      });
    });
    return counts;
  }, [activeOrders]);

  const { orderDistances } = useOrderRouteDistances(activeOrders, driverMap);

  // Keep refs in sync for the rAF loop (deps=[] so it captures stale closures).
  activeOrdersRef.current = activeOrders;
  orderDistancesRef.current = orderDistances;

  const filteredDrivers = useMemo(() => {
    // If any drivers are marked as working, hide non-working ones from the panel and map
    let result = workingDriverIds.size > 0
      ? drivers.filter((d: any) => workingDriverIds.has(d.id))
      : [...drivers];
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
  }, [drivers, driverFilter, activeOrders, workingDriverIds]);

  // ╔══════════════════════════════════════════════════════════╗
  // ║                   PTT HANDLERS                          ║
  // ╚══════════════════════════════════════════════════════════╝

  const pttConnectedSelectedIds = useMemo(
    () => pttSelectedDriverIds.filter((id) => {
      const d = drivers.find((d: any) => d.id === id);
      return d?.driverConnection?.connectionStatus === 'CONNECTED';
    }),
    [pttSelectedDriverIds, drivers],
  );

  const handleStartTalking = useCallback(() => {
    startTalking(pttConnectedSelectedIds);
  }, [startTalking, pttConnectedSelectedIds]);

  const handleStopTalking = useCallback(() => {
    stopTalking();
  }, [stopTalking]);

  const togglePttDriver = useCallback((driverId: string) => {
    setPttSelectedDriverIds((prev) =>
      prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId],
    );
  }, []);

  // ╔══════════════════════════════════════════════════════════╗
  // ║                     EFFECTS                             ║
  // ╚══════════════════════════════════════════════════════════╝

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirectionsTelemetry(getDirectionsTelemetry());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const raw = globalThis.localStorage.getItem(INCIDENT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setIncidentNotes(parsed);
      }
    } catch {
      // Ignore malformed storage payloads.
    }
  }, []);

  // Sync adminNote from server data for orders (server is source of truth)
  useEffect(() => {
    if (!orders.length) return;
    setIncidentNotes((prev) => {
      const patch: Record<string, IncidentNote> = {};
      for (const order of orders as any[]) {
        if (!order.adminNote) continue;
        try {
          const parsed = JSON.parse(order.adminNote);
          if (parsed && typeof parsed === 'object') {
            const existing = prev[order.id];
            // Only update from server if local isn't newer
            if (!existing || existing.updatedAt <= (order.updatedAt ? new Date(order.updatedAt).getTime() : 0)) {
              patch[order.id] = { tag: parsed.tag || '', rootCause: parsed.note || '', updatedAt: order.updatedAt ? new Date(order.updatedAt).getTime() : Date.now() };
            }
          }
        } catch { /* ignore malformed */ }
      }
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, ...patch };
    });
  }, [orders]);

  useEffect(() => {
    try {
      globalThis.localStorage.setItem(INCIDENT_STORAGE_KEY, JSON.stringify(incidentNotes));
    } catch {
      // Ignore storage failures (private mode/quota).
    }
  }, [incidentNotes]);

  // Camera tracking — fires on each GPS update only, not on every animation frame (prevents 15fps flyTo stutter)
  useEffect(() => {
    if (!followingDriverId || !mapRef.current) return;
    const followedTrack = driverTracks[followingDriverId];
    if (!followedTrack) return;
    const pos = followedTrack.to;
    if (!isValidLatLng(pos?.latitude, pos?.longitude)) return;
    mapRef.current.easeTo({ center: [pos.longitude, pos.latitude], zoom: 16, duration: 600 });
  }, [followingDriverId, driverTracks]);

  // Track status changes
  useEffect(() => {
    setStatusChangeTime((prev) => {
      const next = { ...prev };
      activeOrders.forEach((order: any) => {
        const prevStatus = prevOrderStatusRef.current[order.id];
        const derivedStatusStartMs = getOrderStatusStartMs(order, now);
        if (!prevStatus) {
          next[order.id] = derivedStatusStartMs;
          prevOrderStatusRef.current[order.id] = order.status;
        } else if (prevStatus !== order.status) {
          next[order.id] = derivedStatusStartMs;
          prevOrderStatusRef.current[order.id] = order.status;
        } else if (!next[order.id] || Math.abs(next[order.id] - derivedStatusStartMs) > 1000) {
          next[order.id] = derivedStatusStartMs;
        }
      });

      Object.keys(next).forEach((orderId) => {
        if (!activeOrders.some((o: any) => o.id === orderId)) {
          delete next[orderId];
          delete prevOrderStatusRef.current[orderId];
        }
      });

      return next;
    });
  }, [activeOrders.map((o: any) => `${o.id}-${o.status}-${o.updatedAt || ""}-${o.preparingAt || ""}`).join(","), now]);

  // Driver tracking & motion interpolation
  // Keep this effect focused on driver snapshots only.
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

        if (lastSeenUpdateMs > 0 && updatedAtMs > lastSeenUpdateMs) {
          const observedGapMs = clamp(updatedAtMs - lastSeenUpdateMs, DRIVER_GAP_MIN_MS, DRIVER_GAP_MAX_MS);
          observedDriverGapMsRef.current[trackId] = observedGapMs;
          const previousSmoothed = smoothedDriverGapMsRef.current[trackId] ?? DRIVER_GAP_DEFAULT_MS;
          const emaFactor = 0.22;
          smoothedDriverGapMsRef.current[trackId] =
            previousSmoothed * (1 - emaFactor) + observedGapMs * emaFactor;
        }

        lastDriverLocationUpdateMsRef.current[trackId] = updatedAtMs;
        let velocityLatPerSec = 0, velocityLngPerSec = 0;
        if (previousTarget) {
          const jumpMeters = distanceMeters(
            { latitude: previousTarget.latitude, longitude: previousTarget.longitude },
            { latitude: newPos.latitude, longitude: newPos.longitude },
          );
          // Ignore GPS jitter — keep previous target when movement is below dead zone
          if (jumpMeters < DRIVER_JITTER_DEAD_ZONE_METERS) {
            next[driver.id] = { id: driver.id, name: `${driver.firstName} ${driver.lastName}`.trim(), to: { latitude: previousTarget.latitude, longitude: previousTarget.longitude }, updatedAt: driver.driverLocationUpdatedAt };
            return;
          }
          if (jumpMeters >= DRIVER_TELEPORT_GUARD_METERS) {
            velocityLatPerSec = 0;
            velocityLngPerSec = 0;
            animatedDriverPositionsRef.current[trackId] = { latitude: newPos.latitude, longitude: newPos.longitude };
          } else {
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
        }

        driverMotionTargetsRef.current[trackId] = { latitude: newPos.latitude, longitude: newPos.longitude, timestamp: nowTs, velocityLatPerSec, velocityLngPerSec, updatedAtMs };
        if (!animatedDriverPositionsRef.current[trackId]) {
          animatedDriverPositionsRef.current[trackId] = newPos;
        }
        next[driver.id] = { id: driver.id, name: `${driver.firstName} ${driver.lastName}`.trim(), to: newPos, updatedAt: driver.driverLocationUpdatedAt };
      });
      return next;
    });
  }, [drivers]);

  // Update route progress in a single state commit
  useEffect(() => {
    if (!activeOrders.length) return;

    const nextProgress: Record<string, number> = {};
    activeOrders.forEach((order: any) => {
      if (order.status === "OUT_FOR_DELIVERY" && order.driver) {
        const driver = driverMap[order.driver.id];
        const driverLocation = driver?.driverLocation;
        const routeGeometry = orderDistances[order.id]?.toDropoff?.geometry;
        if (driverLocation && routeGeometry && routeGeometry.length > 0) {
          let minDist = Infinity, closestIndex = 0;
          routeGeometry.forEach((coord: [number, number], idx: number) => {
            const dist = Math.hypot(coord[0] - driverLocation.longitude, coord[1] - driverLocation.latitude);
            if (dist < minDist) { minDist = dist; closestIndex = idx; }
          });
          const progress = routeGeometry.length > 1 ? closestIndex / (routeGeometry.length - 1) : 0;
          nextProgress[order.driver.id] = progress;
        }
      }
    });

    if (Object.keys(nextProgress).length > 0) {
      setDriverProgressOnRoute((prev) => ({ ...prev, ...nextProgress }));
    }
  }, [activeOrders, orderDistances, driverMap]);

  // Smooth marker animation
  useEffect(() => {
    let rafId: number;
    const animate = (frameTs: number) => {
      if (!lastAnimationFrameTsRef.current) lastAnimationFrameTsRef.current = frameTs;
      const dtMs = Math.max(frameTs - lastAnimationFrameTsRef.current, 1);
      lastAnimationFrameTsRef.current = frameTs;
      const nowMs = Date.now();
      const nextAnimated = { ...animatedDriverPositionsRef.current };
      const nextHeading = { ...driverHeadingDegRef.current };
      let hasAnyDriver = false;

      Object.entries(driverMotionTargetsRef.current).forEach(([driverId, target]) => {
        hasAnyDriver = true;
        const ageSec = Math.max((nowMs - target.timestamp) / 1000, 0);
        const smoothedGapMs = smoothedDriverGapMsRef.current[driverId] ?? DRIVER_GAP_DEFAULT_MS;
        const normalizedGap = clamp((smoothedGapMs - DRIVER_GAP_MIN_MS) / (DRIVER_GAP_MAX_MS - DRIVER_GAP_MIN_MS), 0, 1);
        const lookAheadSec = DRIVER_LOOKAHEAD_MIN_SEC + normalizedGap * (DRIVER_LOOKAHEAD_MAX_SEC - DRIVER_LOOKAHEAD_MIN_SEC);
        const staleAfterSec = 10;
        const decaySec = Math.max(ageSec - staleAfterSec, 0);
        const staleDecay = Math.exp(-decaySec / 4);
        const predictionWindowSec = Math.min(ageSec + lookAheadSec, 14);
        const predictedLat = target.latitude + target.velocityLatPerSec * staleDecay * predictionWindowSec;
        const predictedLng = target.longitude + target.velocityLngPerSec * staleDecay * predictionWindowSec;
        const current = nextAnimated[driverId] || { latitude: target.latitude, longitude: target.longitude };
        const distanceToPredictionMeters = distanceMeters(
          { latitude: current.latitude, longitude: current.longitude },
          { latitude: predictedLat, longitude: predictedLng },
        );
        const distanceFactor = distanceToPredictionMeters > 180 ? 0.72 : distanceToPredictionMeters < 18 ? 1.28 : 1;
        const tauMs = clamp(smoothedGapMs * 0.06 * distanceFactor, DRIVER_TAU_MIN_MS, DRIVER_TAU_MAX_MS);
        const alpha = 1 - Math.exp(-dtMs / tauMs);
        const nextPoint = {
          latitude: current.latitude + (predictedLat - current.latitude) * alpha,
          longitude: current.longitude + (predictedLng - current.longitude) * alpha,
        };
        // Road-snap: if the driver has an active OFD order with route geometry, snap to it
        let snapped = nextPoint;
        const driverOrders = activeOrdersRef.current.filter(
          (o: any) => o.driver?.id === driverId && o.status === 'OUT_FOR_DELIVERY',
        );
        for (const o of driverOrders) {
          const geo = orderDistancesRef.current[o.id]?.toDropoff?.geometry;
          if (geo && geo.length >= 2) {
            const s = snapToRoute(nextPoint, geo);
            if (s) { snapped = s; break; }
          }
        }

        const headingStepMeters = distanceMeters(current, snapped);
        if (headingStepMeters >= 1.5) {
          nextHeading[driverId] = bearingDeg(current, snapped);
        }
        nextAnimated[driverId] = snapped;
      });

      if (hasAnyDriver) {
        animatedDriverPositionsRef.current = nextAnimated;
        driverHeadingDegRef.current = nextHeading;
        const shouldCommit = (nowMs - lastAnimationCommitTsRef.current) >= ANIMATION_COMMIT_INTERVAL_MS;
        if (shouldCommit) {
          lastAnimationCommitTsRef.current = nowMs;
          setAnimatedDriverPositions(nextAnimated);
          setDriverHeadingDeg(nextHeading);
        }
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      lastAnimationFrameTsRef.current = 0;
      lastAnimationCommitTsRef.current = 0;
    };
  }, []);

  // Auto-show route when a different order is selected (don't fight user's manual toggle)
  const prevSelectedOrderIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSelectedOrderIdRef.current === (selectedOrder?.id ?? null)) return;
    prevSelectedOrderIdRef.current = selectedOrder?.id ?? null;
    setShowPolylines((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => { next[key] = false; });
      if (selectedOrder && orderDistances[selectedOrder.id]) next[selectedOrder.id] = true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id]);

  // Auto-show once when route data first becomes available for the selected order
  const routeAutoShownRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!selectedOrder || !orderDistances[selectedOrder.id]) return;
    if (routeAutoShownRef.current.has(selectedOrder.id)) return;
    routeAutoShownRef.current.add(selectedOrder.id);
    setShowPolylines((prev) => ({ ...prev, [selectedOrder.id]: true }));
  }, [selectedOrder?.id, orderDistances[selectedOrder?.id ?? ""]]);

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

  const handleNotifyDriver = async (orderId: string) => {
    const order = activeOrders.find((o: any) => o.id === orderId);
    if (!order?.driver?.id) {
      toast.warning('No driver assigned to notify.');
      return;
    }
    if (!isOnShift(order.driver.id)) {
      toast.warning('Driver is not on shift — notification not sent.');
      return;
    }
    try {
      await sendDriverMessage({
        variables: {
          driverId: order.driver.id,
          body: `Dispatch update for ${order.displayId || order.id.slice(0, 8)}: check order status and proceed with priority.`,
          alertType: 'WARNING',
        },
      });
      toast.success('Driver notified.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to notify driver');
    }
  };

  const handleNotifyBusiness = async (orderId: string) => {
    const order = activeOrders.find((o: any) => o.id === orderId);
    const businessId = getOrderBusinesses(order)[0]?.business?.id;
    if (!businessId) {
      toast.warning('Business not found for this order.');
      return;
    }
    const businessContact = businessContactByBusinessId[businessId];
    if (!businessContact?.id) {
      toast.warning('No business user contact mapped for this business.');
      return;
    }
    try {
      await sendBusinessMessage({
        variables: {
          businessUserId: businessContact.id,
          body: `Dispatch notice for ${order.displayId || order.id.slice(0, 8)}: please confirm prep and handoff readiness.`,
          alertType: 'WARNING',
        },
      });
      toast.success('Business notified.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to notify business');
    }
  };

  const handleIncidentUpdate = (orderId: string, patch: Partial<IncidentNote>) => {
    setIncidentNotes((prev) => {
      const current = prev[orderId] ?? { tag: '', rootCause: '', updatedAt: Date.now() };
      const updated = { ...current, ...patch, updatedAt: Date.now() };
      // Persist to server: serialize tag + rootCause as JSON note
      const note = updated.tag || updated.rootCause
        ? JSON.stringify({ tag: updated.tag || '', note: updated.rootCause || '' })
        : null;
      setOrderAdminNote({ variables: { id: orderId, note } }).catch(() => {});
      return { ...prev, [orderId]: updated };
    });
  };

  const realtimeDriverAgeMs = realtimeHealth?.driverLastSubAtMs ? now - realtimeHealth.driverLastSubAtMs : Infinity;
  const realtimeOrderAgeMs = realtimeHealth?.orderLastSubAtMs ? now - realtimeHealth.orderLastSubAtMs : Infinity;
  // Only treat as stale if age is finite (data was received before but stopped); Infinity means never received yet — not a failure
  const realtimeSeverity =
    (Number.isFinite(realtimeDriverAgeMs) && realtimeDriverAgeMs > 30000) ||
    (Number.isFinite(realtimeOrderAgeMs) && realtimeOrderAgeMs > 30000) ? 'critical' :
    (Number.isFinite(realtimeDriverAgeMs) && realtimeDriverAgeMs > 15000) ||
    (Number.isFinite(realtimeOrderAgeMs) && realtimeOrderAgeMs > 15000) ? 'warning' : 'healthy';

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

  const handleUpdateStatus = async (orderId: string, status: any) => {
    const order = activeOrders.find((o: any) => o.id === orderId);
    if (!order) { toast.error('Order not found'); return; }
    // Always confirm status changes
    if (status === 'CANCELLED') {
      setCancelModalOrderId(orderId);
      setCancelReason('');
      setCancelReasonCategory(null);
      setCancelSettleDriver(false);
      setCancelSettleBusiness(false);
      return;
    }
    if (status === 'PREPARING') {
      const defaultPrep = Number(
        order?.businesses?.[0]?.business?.prepTimeOverrideMinutes
        ?? order?.businesses?.[0]?.business?.avgPrepTimeMinutes
        ?? 20
      );
      setPrepTimeMinutes(String(Number.isFinite(defaultPrep) && defaultPrep > 0 ? Math.round(defaultPrep) : 20));
    }
    setPendingStatusChange({ orderId, status });
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { orderId, status } = pendingStatusChange;
    const order = activeOrders.find((o: any) => o.id === orderId);
    if (status === 'OUT_FOR_DELIVERY' && !order?.driver?.id) {
      setPendingStatusChange(null);
      setConfirmNoDriverAction({ orderId, status });
      return;
    }
    if (status === 'PREPARING') {
      const minutes = Number.parseInt(prepTimeMinutes, 10);
      if (!Number.isFinite(minutes) || minutes < 1) {
        toast.warning('Enter a valid preparation time in minutes.');
        return;
      }
      setPendingStatusChange(null);
      try {
        await startPreparingOrder({
          variables: { id: orderId, preparationMinutes: minutes },
          refetchQueries: ['GetOrders'],
          awaitRefetchQueries: true,
        });
        toast.success(`Order marked as preparing (${minutes} min)`);
      } catch (error: any) {
        toast.error(error.message || 'Failed to start preparing');
      }
      return;
    }
    setPendingStatusChange(null);
    try {
      await updateOrderStatus({ variables: { id: orderId, status }, refetchQueries: ['GetOrders'], awaitRefetchQueries: true });
      toast.success(`Order marked as ${status.replace(/_/g, ' ').toLowerCase()}`);
      if (status === 'DELIVERED') { setSelectedOrderId(null); setDetailPanelExpanded(false); }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleAdminCancel = async () => {
    if (!cancelModalOrderId) return;
    const trimmed = cancelReason.trim();
    if (!trimmed) { toast.warning('Please provide a cancellation reason.'); return; }
    const taggedReason = cancelReasonCategory ? `[${cancelReasonCategory}] ${trimmed}` : trimmed;
    try {
      await adminCancelOrder({ variables: { id: cancelModalOrderId, reason: taggedReason, settleDriver: cancelSettleDriver, settleBusiness: cancelSettleBusiness } });
      toast.success('Order cancelled.');
      setCancelModalOrderId(null); setCancelReason(''); setCancelReasonCategory(null); setCancelSettleDriver(false); setCancelSettleBusiness(false);
      setSelectedOrderId(null); setDetailPanelExpanded(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    }
  };

  const handleApproveOrder = (orderId: string) => {
    setApprovalModalOrderId(orderId);
  };

  const handleApproveConfirm = async () => {
    if (!approvalModalOrderId) return;
    try {
      await approveOrder({ variables: { id: approvalModalOrderId }, refetchQueries: ['GetOrders'], awaitRefetchQueries: true });
      setDismissedApprovalOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(approvalModalOrderId);
        return next;
      });
      toast.success('Order approved and sent to business');
      setApprovalModalOrderId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve order');
    }
  };

  const handleConfirmNoDriverStatusUpdate = async () => {
    if (!confirmNoDriverAction) return;
    const { orderId, status } = confirmNoDriverAction;
    setConfirmNoDriverAction(null);
    try {
      await updateOrderStatus({
        variables: { id: orderId, status },
        refetchQueries: ['GetOrders'],
        awaitRefetchQueries: true,
      });
      toast.success(`Order marked as ${status.replace(/_/g, ' ').toLowerCase()} (no driver assigned)`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const focusOrder = useCallback((order: any) => {
    const map = mapRef.current?.getMap?.();
    if (!map || !order.dropOffLocation) return;

    const dropoff = order.dropOffLocation;
    const driverLocation = order.driver?.id ? driverMap[order.driver.id]?.driverLocation : null;
    const hasDriverLocation = isValidLatLng(driverLocation?.latitude, driverLocation?.longitude);
    const pickup = order.businesses
      ?.map((entry: any) => entry?.business?.location)
      ?.find((location: any) => isValidLatLng(location?.latitude, location?.longitude));

    const fitBoundsWithPadding = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
      const minLng = Math.min(from.longitude, to.longitude);
      const maxLng = Math.max(from.longitude, to.longitude);
      const minLat = Math.min(from.latitude, to.latitude);
      const maxLat = Math.max(from.latitude, to.latitude);

      map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        {
          padding: { top: 90, bottom: detailPanelExpanded ? 310 : 220, left: 330, right: 120 },
          maxZoom: 15,
          duration: 700,
          essential: true,
        }
      );
    };

    if (order.status === "OUT_FOR_DELIVERY" && hasDriverLocation && isValidLatLng(dropoff.latitude, dropoff.longitude)) {
      fitBoundsWithPadding(driverLocation, dropoff);
      return;
    }

    if (pickup && isValidLatLng(dropoff.latitude, dropoff.longitude)) {
      fitBoundsWithPadding(pickup, dropoff);
      return;
    }

    map.flyTo({ center: [dropoff.longitude, dropoff.latitude], zoom: 15, duration: 600, essential: true });
  }, [driverMap, detailPanelExpanded]);

  const selectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setRightPanelTab('order');
    const order = activeOrders.find((o: any) => o.id === orderId);
    if (order) {
      focusOrder(order);
      if (order.needsApproval && dismissedApprovalOrderIds.has(order.id)) {
        setApprovalModalOrderId(order.id);
      }
    }
    setTimeout(() => orderRefs.current[orderId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, [activeOrders, dismissedApprovalOrderIds, focusOrder]);

  const recenterMap = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.flyTo({ center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude], zoom: 12, essential: true });
  }, []);

  const handleMapLoad = useCallback((e: any) => {
    const map = e.target;
    ['poi-label', 'transit-label'].forEach((layer) => {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', 'none');
    });
  }, []);

  // ╔══════════════════════════════════════════════════════════╗
  // ║                      RENDER                             ║
  // ╚══════════════════════════════════════════════════════════╝

  return (
    <div className={fullscreenMap ? "fixed inset-0 z-[9999] bg-[#09090b] overflow-hidden" : "w-[calc(100%+40px)] h-[calc(100vh-48px)] relative bg-[#09090b] overflow-hidden -m-5"}>
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
        onLoad={handleMapLoad}
        onClick={() => { setSelectedOrderId(null); setDetailPanelExpanded(false); }}
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
                <div className={`relative w-7 h-7 rounded-full border-[1.5px] ${isInactive ? "border-slate-500/40 grayscale opacity-50" : "border-violet-500/60"} bg-[#1a1a2e] shadow-lg hover:scale-110 transition-all flex items-center justify-center overflow-hidden ${isHovered ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-black" : ""}`}>
                  {business.imageUrl ? (
                    <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    business.businessType === "RESTAURANT"
                      ? <Utensils size={13} className="text-violet-300" />
                      : <Store size={13} className="text-violet-300" />
                  )}
                </div>
                {(activeOrderCountByBusinessId[business.id] ?? 0) > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[8px] font-bold text-white z-10 pointer-events-none">
                    {activeOrderCountByBusinessId[business.id]}
                  </div>
                )}
                {isHovered && (
                  <div className="absolute bottom-full mb-5 bg-black/95 text-white rounded-xl shadow-2xl z-[100] border border-white/20 overflow-hidden backdrop-blur-sm min-w-[240px] pointer-events-none">
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

          // PREPARING: show pickup → dropoff (amber, same as PENDING)
          if (order.status === "PREPARING") {
            if (!routes.toDropoff) return null;
            return (
              <Source key={`or-${order.id}`} id={`order-route-${order.id}`} type="geojson"
                data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routes.toDropoff.geometry } }}>
                <Layer id={`or-c-${order.id}`} type="line" paint={{ "line-color": "#78350f", "line-width": 8, "line-opacity": 0.6 }} layout={{ "line-cap": "round", "line-join": "round" }} />
                <Layer id={`or-l-${order.id}`} type="line" paint={{ "line-color": "#f59e0b", "line-width": 5, "line-opacity": 1 }} layout={{ "line-cap": "round", "line-join": "round" }} />
              </Source>
            );
          }

          // PENDING: always show pickup → dropoff (amber)
          if (order.status === "PENDING") {
            if (!routes.toDropoff) return null;
            return (
              <Fragment key={`ors-pending-${order.id}-${showBothRoutes[order.id] ? 'both' : 'single'}-${order.driver ? 'driver' : 'nodriver'}`}>
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
                <Fragment key={`ors-ready-${order.id}-${showBothRoutes[order.id] ? 'both' : 'single'}-${order.driver ? 'driver' : 'nodriver'}`}>
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

        {/* ── SLA Heat Hotspots ── */}
        {showSlaHeat && zoneSlaBuckets.map((bucket) => {
          const severity = bucket.criticalCount > 0 ? 'critical' : 'warning';
          const ring = severity === 'critical' ? 'bg-red-500/70 border-red-300' : 'bg-amber-500/70 border-amber-300';
          return (
            <Marker key={`sla-${bucket.key}`} latitude={bucket.latitude} longitude={bucket.longitude} anchor="center">
              <div className="relative group pointer-events-auto cursor-default">
                <div className={`w-10 h-10 rounded-full border-2 ${ring} backdrop-blur-sm flex items-center justify-center text-[11px] font-bold text-white shadow-lg`}>
                  {bucket.orderIds.length}
                </div>
                <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-red-500" />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/95 border border-white/15 rounded-lg px-3 py-2 text-[11px] text-zinc-200 whitespace-nowrap z-[120]">
                  <div className="font-semibold text-white">Zone Risk</div>
                  <div>Orders: {bucket.orderIds.length}</div>
                  <div>Critical: <span className="text-red-400">{bucket.criticalCount}</span> • Warning: <span className="text-amber-400">{bucket.warningCount}</span></div>
                  <div>p95 delay: <span className="text-violet-300">{bucket.p95DelayMinutes.toFixed(1)}m</span></div>
                  <div className="text-zinc-500">Top business: {bucket.topBusiness}</div>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* ── Order Markers ── */}
        {filteredOrders.map((order: any) => {
          const drop = order.dropOffLocation;
          if (!drop?.latitude || !drop?.longitude) return null;
          const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
          const businessNames = getOrderBusinesses(order).map((b: any) => b.business?.name).filter(Boolean).join(", ") || "Order";
          const isHovered = hoveredOrderId === order.id;
          const isSelected = selectedOrderId === order.id;
          const isPending = order.status === "PENDING";
          const orderDateMs = order.orderDate ? new Date(order.orderDate).getTime() : now;
          const pendingTooLong = isPending && (now - orderDateMs) > PENDING_WARNING_MS;
          const hasPrepAlert = prepTimeAlerts.some((a) => a.orderId === order.id);

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
                {hasPrepAlert && !pendingTooLong && (
                  <div className="absolute -inset-2 w-9 h-9 rounded-full ring-2 ring-amber-400 animate-pulse opacity-80" />
                )}
                {isSelected && (
                  <div className="absolute -inset-1.5 w-8 h-8 rounded-full border-2 border-violet-400 animate-pulse" />
                )}
                <div
                  className="relative w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-lg hover:scale-125 transition-transform"
                  style={{ backgroundColor: pendingTooLong ? "#ef4444" : statusColor.hex }}>
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
          // Hide off-shift drivers from the map entirely
          if (!isOnShift(track.id)) return null;
          const pos = animatedDriverPositions[track.id] || track.to;
          if (!isValidLatLng(pos?.latitude, pos?.longitude)) return null;
          const isBusy = getActiveCountForDriver(track.id, activeOrders) > 0;
          const driver = driverMap[track.id];
          const connectionStatus = (driver?.driverConnection?.connectionStatus ?? "DISCONNECTED") as keyof typeof DRIVER_CONNECTION_COLORS;
          const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus] || DRIVER_CONNECTION_COLORS.DISCONNECTED;
          const StatusIcon = statusStyle.icon;
          const isFollowing = followingDriverId === track.id;

          return (
            <Marker
              key={`d-${track.id}`}
              latitude={pos.latitude}
              longitude={pos.longitude}
              anchor="bottom"
              pitchAlignment="viewport"
              rotationAlignment="viewport"
            >
              <div className={`relative flex flex-col items-center group cursor-pointer ${connectionStatus === "DISCONNECTED" || connectionStatus === "LOST" ? "opacity-40" : ""}`}
                onClick={() => {
                  const newId = isFollowing ? null : track.id;
                  setFollowingDriverId(newId);
                  if (newId && mapRef.current) mapRef.current.jumpTo({ center: [pos.longitude, pos.latitude], zoom: 16 });
                }}>
                {isFollowing && <div className="absolute inset-0 w-10 h-10 -top-2 -left-2 rounded-full border-2 border-blue-400 animate-pulse pointer-events-none" />}
                {/* tiny connection-status dot */}
                <div className={`absolute -top-1 -right-1 z-10 w-2.5 h-2.5 rounded-full ${statusStyle.bg} border border-black ${connectionStatus === "STALE" ? "animate-pulse" : ""}`} />
                {driver ? (
                  <div
                    className={`relative w-6 h-6 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center font-bold text-white text-[10px] shadow-md border-2 ${isBusy ? 'border-amber-400' : 'border-black/40'} transition-all`}
                    style={{ transform: 'translateZ(0)' }}
                  >
                    <div
                      className="absolute -top-1.5 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-white/80"
                      style={{ left: '50%', transform: `translateX(-50%) rotate(${driverHeadingDeg[track.id] ?? 0}deg)` }}
                    />
                    {getInitials(driver.firstName, driver.lastName)}
                  </div>
                ) : (
                  <div className={`w-4 h-4 rounded-full ${statusStyle.bg} shadow-md`} />
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
      <div className="absolute top-4 right-[308px] z-30 flex items-center gap-2">
        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white transition"
          title={sidebarCollapsed ? 'Show orders panel' : 'Collapse orders panel'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl backdrop-blur-md border transition ${showFilters ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-black/80 border-white/10 text-zinc-400 hover:text-white"}`}>
          <Filter size={16} />
        </button>
        <button onClick={recenterMap} className="p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white transition" title="Recenter map">
          <Crosshair size={16} />
        </button>
        <button
          onClick={() => setShowSlaHeat((prev) => !prev)}
          className={`p-2.5 rounded-xl backdrop-blur-md border transition ${showSlaHeat ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-black/80 border-white/10 text-zinc-400 hover:text-white"}`}
          title={showSlaHeat ? 'Hide SLA heat' : 'Show SLA heat'}
        >
          <AlertCircle size={16} />
        </button>
        <button
          onClick={() => setFullscreenMap((prev) => !prev)}
          className="p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white transition"
          title={fullscreenMap ? 'Exit fullscreen' : 'Fullscreen map'}
        >
          {fullscreenMap ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className={`absolute bottom-3 z-30 px-3 py-2 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md text-[10px] text-zinc-300 min-w-[220px] transition-all duration-200 ${sidebarCollapsed ? 'left-4' : 'left-[292px]'}`}>
        <div className="font-semibold text-zinc-100">Realtime freshness</div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${realtimeSeverity === 'healthy' ? 'bg-emerald-400' : realtimeSeverity === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
          <span className={`${realtimeSeverity === 'healthy' ? 'text-emerald-300' : realtimeSeverity === 'warning' ? 'text-amber-300' : 'text-red-300'}`}>
            {realtimeSeverity === 'healthy' ? 'Live stream healthy' : realtimeSeverity === 'warning' ? 'Stream aging' : 'Stream stale'}
          </span>
        </div>
        <div>drivers stream age: <span className="text-blue-400">{Number.isFinite(realtimeDriverAgeMs) ? `${Math.floor(realtimeDriverAgeMs / 1000)}s` : 'n/a'}</span></div>
        <div>orders stream age: <span className="text-violet-400">{Number.isFinite(realtimeOrderAgeMs) ? `${Math.floor(realtimeOrderAgeMs / 1000)}s` : 'n/a'}</span></div>
        <div>driver mode: <span className={realtimeHealth?.driverPollingFallback ? 'text-amber-300' : 'text-emerald-300'}>{realtimeHealth?.driverPollingFallback ? 'poll fallback' : 'subscription primary'}</span></div>
      </div>

      {/* ════════════════ FILTERS DROPDOWN ════════════════ */}
      {showFilters && (
        <div className="absolute top-16 right-[308px] z-40 bg-black/95 backdrop-blur-md border border-white/15 rounded-xl p-4 space-y-3 min-w-[220px]">
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
      <div className={`absolute left-0 top-0 bottom-0 z-20 bg-[#0a0a0b] border-r border-white/5 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-[280px]'}`}>
        {/* Header with stats */}
        <div className="px-3 py-2 border-b border-white/8">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-300">Orders</span>
              <span className="text-[10px] text-zinc-500 font-medium">{filteredOrders.length}</span>
            </div>
            {statusFilter !== "ALL" && (
              <button onClick={() => setStatusFilter("ALL")} className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1 transition">
                <X size={9} /> Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { key: "PENDING", count: stats.pendingOrders, dot: "bg-amber-500", active: "bg-amber-500/20 border-amber-500/50 text-amber-300", idle: "border-transparent text-zinc-600 hover:text-zinc-400" },
              { key: "PREPARING", count: stats.preparingOrders, dot: "bg-violet-500", active: "bg-violet-500/20 border-violet-500/50 text-violet-300", idle: "border-transparent text-zinc-600 hover:text-zinc-400" },
              { key: "READY", count: stats.readyOrders, dot: "bg-blue-500", active: "bg-blue-500/20 border-blue-500/50 text-blue-300", idle: "border-transparent text-zinc-600 hover:text-zinc-400" },
              { key: "OUT_FOR_DELIVERY", count: stats.outOrders, dot: "bg-emerald-500", active: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300", idle: "border-transparent text-zinc-600 hover:text-zinc-400" },
            ] as const).map(({ key, count, dot, active, idle }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? "ALL" : key)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold transition ${
                  statusFilter === key ? active : idle
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {count}
              </button>
            ))}
          </div>
        </div>

        {businessSlaChips.length > 0 && (
          <div className="px-3 py-2 border-b border-white/5 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Business SLA Risk</div>
            {businessSlaChips.map((chip) => (
              <div key={chip.businessName} className="flex items-center justify-between text-[10px] rounded-md bg-white/5 px-2 py-1">
                <span className="text-zinc-300 truncate pr-2">{chip.businessName}</span>
                <span className="text-zinc-500">p95 {chip.p95DelayMinutes.toFixed(1)}m</span>
                <span className="ml-2 text-red-400">{chip.critical}</span>
                <span className="ml-1 text-amber-400">{chip.warning}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Order cards list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 60px)' }}>
          <div className="p-1.5 space-y-px">
            {filteredOrders.map((order: any) => {
              const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
              const businessName = order.businesses?.[0]?.business?.name || "Unknown";
              const isSelected = selectedOrderId === order.id;
              const isPending = order.status === "PENDING";
              const orderDateMs = parseServerTimeMs(order.orderDate) ?? now;
              const elapsed = now - orderDateMs;
              const pendingTooLong = isPending && elapsed > PENDING_WARNING_MS;
              const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : "Unknown";
              const distanceData = orderDistances[order.id];
              const preview = (order as any).settlementPreview;
              const marginSeverity = preview ? getMarginSeverity(preview.netMargin) : null;
              const etaMin = getOrderEtaMinutes(
                order,
                distanceData,
                now,
                driverProgressOnRoute[order.driver?.id] || 0,
                order.driver ? driverMap[order.driver.id] : null,
              );

              return (
                <button
                  key={order.id}
                  ref={(el) => { orderRefs.current[order.id] = el; }}
                  onClick={() => selectOrder(order.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border-l-2 transition-all ${
                    isSelected
                      ? 'bg-white/[0.06]'
                      : pendingTooLong
                        ? 'bg-red-500/[0.06] animate-pulse'
                        : 'hover:bg-white/[0.04]'
                  }`}
                  style={{ borderLeftColor: isSelected ? statusColor.hex : pendingTooLong ? '#ef4444' : `${statusColor.hex}44` }}>
                  
                  {/* Row 1: Business + elapsed */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pendingTooLong ? "#ef4444" : statusColor.hex }} />
                      <span className="text-[13px] font-medium text-white truncate">{businessName}</span>
                    </div>
                    <span className={`text-[10px] font-mono flex-shrink-0 ${pendingTooLong ? "text-red-400" : "text-zinc-600"}`}>
                      {formatElapsed(elapsed)}
                    </span>
                  </div>
                  
                  {/* Row 2: Status · Customer */}
                  <div className="flex items-center gap-1.5 mt-0.5 pl-3">
                    <span className={`text-[9px] font-semibold uppercase flex-shrink-0 ${pendingTooLong ? "text-red-400" : statusColor.text}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    {pendingTooLong && (
                      <span className="text-[8px] px-1 py-px rounded bg-red-500/20 text-red-300 font-bold flex-shrink-0">LATE</span>
                    )}
                    <span className="text-zinc-700 text-[9px]">·</span>
                    <span className="text-[10px] text-zinc-500 truncate">{customerName}</span>
                  </div>

                  {/* Prep time alert (compact inline) */}
                  {(() => {
                    const alert = prepTimeAlerts.find((a) => a.orderId === order.id);
                    if (!alert) return null;
                    return (
                      <div className="flex items-center gap-1 mt-0.5 pl-3">
                        <Clock size={9} className="text-amber-500/60 flex-shrink-0" />
                        <span className="text-amber-500/70 text-[9px] font-medium">+{alert.addedMinutes}m → {alert.newTotalMinutes}m</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissPrepAlert(alert.orderId); }}
                          className="text-amber-500/40 hover:text-amber-400 text-[10px] leading-none ml-auto"
                        >×</button>
                      </div>
                    );
                  })()}
                  
                  {/* Row 3: Driver + margin + eta + price */}
                  <div className="flex items-center justify-between mt-1 pl-3">
                    <div className="flex items-center gap-1 min-w-0">
                      {order.driver ? (
                        <div className="flex items-center gap-1">
                          <div className={`w-3.5 h-3.5 rounded-full ${getAvatarColor(order.driver.id)} flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0`}>
                            {getInitials(order.driver.firstName, order.driver.lastName)}
                          </div>
                          <span className="text-[10px] text-zinc-500">{order.driver.firstName}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-500/60">No driver</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {preview ? (
                        <div className="group/pill relative"
                          onMouseEnter={(e) => {
                            const pill = e.currentTarget;
                            const tip = pill.querySelector('[data-settlement-tip]') as HTMLElement;
                            if (!tip) return;
                            const rect = pill.getBoundingClientRect();
                            tip.style.left = `${rect.left}px`;
                            tip.style.top = `${rect.bottom + 6}px`;
                          }}>
                          <span
                            className={`text-[9px] font-medium cursor-default ${marginSeverity === 'healthy' ? 'text-emerald-400/60' : marginSeverity === 'thin' ? 'text-amber-400/60' : 'text-rose-400/60'}`}>
                            {preview.netMargin >= 0 ? '+' : ''}€{preview.netMargin.toFixed(2)}
                          </span>
                          <div data-settlement-tip className="pointer-events-none fixed z-[9999] w-56 rounded-lg border border-zinc-700 bg-[#0a0a0d] p-2 text-[10px] text-zinc-300 opacity-0 shadow-2xl transition-opacity group-hover/pill:opacity-100">
                            <div className="font-semibold text-zinc-200 mb-1 text-[11px]">Settlement breakdown</div>
                            {preview.lineItems.map((li: any, i: number) => (
                              <div key={i} className="flex justify-between gap-2 py-0.5">
                                <span className="text-zinc-500 truncate">{li.reason}</span>
                                <span className={`whitespace-nowrap font-medium ${li.direction === 'RECEIVABLE' ? 'text-emerald-300' : 'text-rose-300'}`}>
                                  {li.direction === 'RECEIVABLE' ? '+' : '-'}€{li.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between border-t border-zinc-700 mt-1 pt-1 font-semibold">
                              <span className="text-zinc-400">Net margin</span>
                              <span className={preview.netMargin >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                                {preview.netMargin >= 0 ? '+' : ''}€{preview.netMargin.toFixed(2)}
                              </span>
                            </div>
                            {!preview.driverAssigned && (
                              <div className="mt-1 text-[9px] text-amber-400 font-semibold">No driver assigned</div>
                            )}
                          </div>
                        </div>
                      ) : null}
                      {etaMin && (
                        <span className="text-[10px] text-zinc-600">{etaMin}m</span>
                      )}
                      <span className="text-[11px] font-medium text-zinc-300">€{order.totalPrice?.toFixed(2) || "0"}</span>
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



      {/* ════════════════ PERSISTENT RIGHT PANEL ════════════════ */}
      <div className="absolute top-0 right-0 w-[300px] h-full z-40 flex flex-col bg-[#0a0a0b]">
        {/* Tab bar */}
        <div className="flex-shrink-0 flex h-9 border-b border-white/8">
          <button
            onClick={() => setRightPanelTab('order')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors border-b-2 ${
              rightPanelTab === 'order' ? 'text-white border-white/30' : 'text-zinc-600 border-transparent hover:text-zinc-400'
            }`}>
            <Package size={11} />
            ORDER
            {selectedOrder && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
          </button>
          <button
            onClick={() => setRightPanelTab('drivers')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors border-b-2 ${
              rightPanelTab === 'drivers' ? 'text-white border-white/30' : 'text-zinc-600 border-transparent hover:text-zinc-400'
            }`}>
            <User size={11} />
            DRIVERS
            <span className="text-[10px] font-normal text-zinc-600 ml-0.5">{filteredDrivers.length}</span>
          </button>
          <button
            onClick={() => setRightPanelTab('businesses')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors border-b-2 ${
              rightPanelTab === 'businesses' ? 'text-white border-white/30' : 'text-zinc-600 border-transparent hover:text-zinc-400'
            }`}>
            <Store size={11} />
            BIZ
            <span className="text-[10px] font-normal text-zinc-600 ml-0.5">{businesses.length}</span>
          </button>
        </div>

        {/* ORDER tab */}
        {rightPanelTab === 'order' && (
          selectedOrder
            ? <BottomDetailPanel
                order={selectedOrder}
                drivers={drivers}
                activeOrders={activeOrders}
                orderDistances={orderDistances}
                driverMap={driverMap}
                now={now}
                statusChangeTime={statusChangeTime}
                expanded={true}
                onToggleExpand={() => {}}
                onClose={() => { setSelectedOrderId(null); setDetailPanelExpanded(false); }}
                onAssignDriver={handleAssignDriver}
                onAutoAssign={handleAutoAssign}
                onUpdateStatus={handleUpdateStatus}
                onApproveOrder={handleApproveOrder}
                onTogglePolyline={() => setShowPolylines((prev) => ({ ...prev, [selectedOrder.id]: !prev[selectedOrder.id] }))}
                showPolyline={showPolylines[selectedOrder.id] || false}
                onToggleBothRoutes={() => setShowBothRoutes((prev) => ({ ...prev, [selectedOrder.id]: !prev[selectedOrder.id] }))}
                showBothRoutes={showBothRoutes[selectedOrder.id] || false}
                onFocus={() => focusOrder(selectedOrder)}
                driverProgressOnRoute={driverProgressOnRoute}
                onNotifyDriver={handleNotifyDriver}
                onNotifyBusiness={handleNotifyBusiness}
                incident={incidentNotes[selectedOrder.id] || { tag: '', rootCause: '', updatedAt: 0 }}
                onIncidentUpdate={handleIncidentUpdate}
                workingDriverIds={workingDriverIds}
                onToggleTrustedCustomer={handleToggleTrustedCustomer}
                trustUpdatingUserId={trustUpdatingUserId}
              />
            : <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-700">
                <Package size={28} strokeWidth={1.5} />
                <span className="text-xs">Select an order</span>
              </div>
        )}

        {/* DRIVERS tab */}
        {rightPanelTab === 'drivers' && (
          <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Stats + Shift */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-1" title="Online">
                <Signal size={10} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">{filteredDrivers.filter((d: any) => d.driverConnection?.connectionStatus === 'CONNECTED').length}</span>
              </div>
              <div className="flex items-center gap-1" title={workingDriverIds.size > 0 ? `${workingDriverIds.size} on shift` : 'All drivers'}>
                <User size={10} className={workingDriverIds.size > 0 ? 'text-blue-400' : 'text-zinc-500'} />
                <span className={`text-[10px] font-bold ${workingDriverIds.size > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>{workingDriverIds.size > 0 ? workingDriverIds.size : filteredDrivers.length}</span>
              </div>
              {pttSelectedDriverIds.length > 0 && (
                <div className="flex items-center gap-1" title="PTT selected">
                  <Radio size={9} className="text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-400">{pttSelectedDriverIds.length}</span>
                </div>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setShowShiftModal(true)}
                className={`h-6 px-2.5 rounded-lg text-[10px] font-semibold transition border ${
                  workingDriverIds.size > 0
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-blue-500/40 hover:text-blue-300'
                }`}>
                Shift
              </button>
            </div>

            {/* Driver list */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {filteredDrivers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 gap-2 text-zinc-700">
                  <User size={20} strokeWidth={1.5} />
                  <span className="text-xs">No drivers</span>
                </div>
              )}
              {filteredDrivers.map((driver: any) => {
                const connStatus = (driver.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
                const statusStyle = DRIVER_CONNECTION_COLORS[connStatus];
                const StatusIcon = statusStyle.icon;
                const assignedOrders = activeOrders.filter((o: any) => o.driver?.id === driver.id);
                const isBusy = assignedOrders.length > 0;
                const isPttSelected = pttSelectedDriverIds.includes(driver.id);
                const isConnected = connStatus === 'CONNECTED';
                const hasLocation = !!(driver.driverLocation?.latitude && driver.driverLocation?.longitude);
                const onShift = workingDriverIds.size === 0 || workingDriverIds.has(driver.id);
                const isTracking = followingDriverId === driver.id;
                const battery = driver.driverConnection?.batteryLevel;
                const isCharging = driver.driverConnection?.isCharging;
                const batteryOptIn = driver.driverConnection?.batteryOptIn;
                const BatteryIcon = isCharging ? BatteryCharging : (battery != null && battery < 25) ? BatteryLow : Battery;
                const batteryColor = isCharging ? 'text-emerald-400' : battery != null && battery < 25 ? 'text-red-400' : battery != null && battery < 50 ? 'text-amber-400' : 'text-zinc-500';
                return (
                  <div key={driver.id} className="relative group flex items-center gap-2.5 px-3 py-2 hover:bg-white/4 transition border-b border-white/4 last:border-0">
                    {/* Avatar */}
                    <button
                      onClick={() => {
                        if (!hasLocation) return;
                        setFollowingDriverId(isTracking ? null : driver.id);
                        if (mapRef.current && driver.driverLocation && !isTracking) {
                          mapRef.current.flyTo({ center: [driver.driverLocation.longitude, driver.driverLocation.latitude], zoom: 16, duration: 700 });
                        }
                      }}
                      title={hasLocation ? (isTracking ? 'Stop tracking' : 'Fly to / track') : 'No location'}
                      className={`relative w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 transition-transform hover:scale-105 ${
                        getAvatarColor(driver.id)
                      } ${
                        connStatus === 'DISCONNECTED' || connStatus === 'LOST' ? 'opacity-40' : ''
                      } ${
                        isTracking ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#0a0a0b]' :
                        isPttSelected ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-[#0a0a0b]' : ''
                      }`}>
                      {getInitials(driver.firstName, driver.lastName)}
                      {/* Status dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0a0a0b] flex items-center justify-center">
                        <StatusIcon size={8} style={{ color: statusStyle.hex }} />
                      </div>
                      {/* Busy badge */}
                      {isBusy && !isPttSelected && (
                        <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[7px] font-bold text-white">
                          {assignedOrders.length}
                        </div>
                      )}
                      {/* PTT badge */}
                      {isPttSelected && (
                        <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center">
                          <Mic size={7} className="text-white" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-white truncate">{driver.firstName} {driver.lastName}</span>
                        {!onShift && <span className="text-[8px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-semibold shrink-0">OFF</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px]" style={{ color: statusStyle.hex }}>{statusStyle.label}</span>
                        {isBusy && <span className="text-[10px] text-amber-400">• {assignedOrders.length}x</span>}
                        {batteryOptIn && battery != null && (
                          <span className={`flex items-center gap-0.5 text-[10px] ${batteryColor}`}>
                            <BatteryIcon size={9} />{battery}%
                          </span>
                        )}
                      </div>
                      {assignedOrders.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {assignedOrders.map((o: any) => (
                            <div key={o.id} className="text-[9px] text-zinc-600 truncate">→ {o.businesses?.[0]?.business?.name || 'Order'}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons: chat + PTT */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatDriverId(driver.id);
                          setChatInput('');
                          setChatMessages([]);
                          loadDriverMessages({ variables: { driverId: driver.id, limit: 50, offset: 0 } });
                          if (chatDriverId === driver.id) markDriverMessagesRead({ variables: { otherUserId: driver.id } }).catch(() => {});
                        }}
                        title="Chat"
                        className="h-6 w-6 rounded-lg flex items-center justify-center bg-zinc-800 text-zinc-400 hover:bg-sky-500/20 hover:text-sky-300 border border-zinc-700 hover:border-sky-500/40 transition">
                        <MessageSquare size={10} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePttDriver(driver.id); }}
                        disabled={!isConnected}
                        title={isPttSelected ? 'Remove from PTT' : isConnected ? 'Add to PTT' : 'Offline'}
                        className={`h-6 w-6 rounded-lg flex items-center justify-center text-[9px] font-semibold transition border ${
                          isPttSelected
                            ? 'bg-violet-500/25 text-violet-300 border-violet-500/50'
                            : isConnected
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-violet-500/40 hover:text-violet-300'
                              : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                        }`}>
                        <Mic size={9} />
                      </button>
                    </div>
                  </div>
                );
              })}

            </div>

            {/* PTT Controls */}
            {pttSelectedDriverIds.length > 0 && (
              <div className="flex-shrink-0 border-t border-violet-500/30 bg-violet-950/40 px-3 py-2 flex items-center gap-3">
                <div className="text-[10px] text-violet-300">
                  <span className="font-bold">{pttConnectedSelectedIds.length}</span>
                  <span className="text-zinc-500">/{pttSelectedDriverIds.length} ready</span>
                </div>
                <button
                  onMouseDown={handleStartTalking}
                  onMouseUp={handleStopTalking}
                  onMouseLeave={handleStopTalking}
                  onTouchStart={handleStartTalking}
                  onTouchEnd={handleStopTalking}
                  disabled={pttConnectedSelectedIds.length === 0}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg flex-shrink-0 ${
                    pttIsTalking
                      ? 'bg-red-600 scale-110 shadow-red-500/40'
                      : pttConnectedSelectedIds.length > 0
                        ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/40'
                        : 'bg-zinc-800 cursor-not-allowed opacity-40'
                  }`}
                  title={pttIsTalking ? 'Release to stop' : 'Hold to talk'}>
                  <Mic size={16} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-zinc-300 font-medium">{pttIsTalking ? '🔴 Live' : 'Hold to talk'}</div>
                  {pttError && <div className="text-[9px] text-red-400 truncate">{pttError}</div>}
                </div>
                <button
                  onClick={() => { if (!pttIsTalking) setPttSelectedDriverIds([]); }}
                  disabled={pttIsTalking}
                  className="text-[9px] text-zinc-600 hover:text-zinc-400 transition disabled:opacity-30 flex-shrink-0">
                  Clear
                </button>
              </div>
            )}

            {/* Chat overlay — slides over the drivers list */}
            {chatDriverId && (() => {
              const chatDriver = driverMap[chatDriverId];
              const sendChat = async () => {
                const trimmed = chatInput.trim();
                if (!trimmed || !chatDriverId) return;
                setChatInput('');
                try {
                  const result = await sendDriverMessage({ variables: { driverId: chatDriverId, body: trimmed, alertType: 'INFO' } });
                  const sent = result.data?.sendDriverMessage;
                  if (sent) {
                    setChatMessages((prev) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
                  }
                  setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                } catch (e: any) { toast.error(e.message || 'Send failed'); }
              };
              return (
                <div className="absolute inset-0 flex flex-col bg-[#0a0a0b] z-10">
                  {/* Chat header */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/8">
                    <button onClick={() => setChatDriverId(null)} className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition">
                      <ChevronLeft size={14} />
                    </button>
                    {chatDriver && (
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs flex-shrink-0 ${getAvatarColor(chatDriverId)}`}>
                        {getInitials(chatDriver.firstName, chatDriver.lastName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{chatDriver ? `${chatDriver.firstName} ${chatDriver.lastName}` : 'Driver'}</div>
                      <div className="text-[9px] text-zinc-500">Direct message</div>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-1.5">
                    {chatLoading && <div className="text-[10px] text-zinc-600 text-center py-4">Loading…</div>}
                    {!chatLoading && chatMessages.length === 0 && (
                      <div className="text-[10px] text-zinc-700 text-center py-6">No messages yet</div>
                    )}
                    {chatMessages.map((msg: any, i: number) => {
                      const isAdmin = msg.senderRole === 'ADMIN';
                      return (
                        <div key={msg.id ?? i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-2.5 py-1.5 text-xs leading-snug ${
                            isAdmin
                              ? 'bg-sky-500 text-white rounded-2xl rounded-tr-sm'
                              : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm'
                          }`}>
                            {msg.body}
                            <div className={`text-[8px] mt-0.5 text-right ${isAdmin ? 'text-sky-200/60' : 'text-zinc-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>
                  {/* Input */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-2 border-t border-white/8">
                    <input
                      type="text" value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      placeholder="Message driver…"
                      className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50" />
                    <button
                      onClick={sendChat}
                      disabled={!chatInput.trim()}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                      <Send size={11} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ════════════════ BUSINESSES TAB ════════════════ */}
        {rightPanelTab === 'businesses' && (
          <div className="flex flex-col h-full relative overflow-hidden">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {businesses.length === 0 && (
                <div className="text-[10px] text-zinc-600 text-center py-8">No businesses</div>
              )}
              {[...businesses].sort((a: any, b: any) => {
                const ha = bizDeviceRows.find((r: any) => r.businessId === a.id);
                const hb = bizDeviceRows.find((r: any) => r.businessId === b.id);
                const statusScore = (h: any) => {
                  const s = h?.onlineStatus ?? 'OFFLINE';
                  return s === 'OFFLINE' ? 0 : s === 'STALE' ? 1 : 2;
                };
                const battScore = (h: any) => {
                  if (h?.batteryLevel != null && !h.isCharging && h.batteryLevel < 20) return 0;
                  return 1;
                };
                const sa = statusScore(ha), sb = statusScore(hb);
                if (sa !== sb) return sa - sb;
                const ba = battScore(ha), bb = battScore(hb);
                if (ba !== bb) return ba - bb;
                return a.name.localeCompare(b.name);
              }).map((biz: any) => {
                const bizOrders = activeOrders.filter((o: any) =>
                  getOrderBusinesses(o).some((be: any) => be.business?.id === biz.id)
                );
                const isActive = biz.isActive;
                const hasActiveHours = (() => {
                  if (!biz.workingHours?.opensAt || !biz.workingHours?.closesAt) return true;
                  const now2 = new Date();
                  const [oh, om] = biz.workingHours.opensAt.split(':').map(Number);
                  const [ch, cm] = biz.workingHours.closesAt.split(':').map(Number);
                  const openMin = oh * 60 + om, closeMin = ch * 60 + cm;
                  const curMin = now2.getHours() * 60 + now2.getMinutes();
                  return curMin >= openMin && curMin < closeMin;
                })();
                const contact = businessContactByBusinessId[biz.id];
                const health = bizDeviceRows.find((r: any) => r.businessId === biz.id);
                const onlineStatus: string = health?.onlineStatus ?? 'OFFLINE';
                const onlinePill =
                  onlineStatus === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' :
                  onlineStatus === 'STALE' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-rose-500/20 text-rose-400';
                const onlineDot =
                  onlineStatus === 'ONLINE' ? 'bg-emerald-400' :
                  onlineStatus === 'STALE' ? 'bg-amber-400' :
                  'bg-rose-500';
                return (
                  <div key={biz.id} className="flex items-start gap-2 px-3 py-2 border-b border-white/4 last:border-0">
                    <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${onlineDot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-zinc-200 truncate">{biz.name}</div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                        {!isActive && <span className="text-[8px] text-zinc-600">inactive</span>}
                        {isActive && !hasActiveHours && <span className="text-[8px] text-zinc-600">closed</span>}
                        {isActive && hasActiveHours && <span className="text-[8px] text-emerald-600">open</span>}
                        <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${onlinePill}`}>{onlineStatus.toLowerCase()}</span>
                        {onlineStatus === 'ONLINE' && health?.receivingOrders === false && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-rose-500/15 text-rose-400">not receiving</span>
                        )}
                        {health?.batteryLevel != null && (
                          <span className="text-[8px] text-zinc-500">{health.batteryLevel}%{health.isCharging ? '⚡' : ''}</span>
                        )}
                        {health?.networkType && (
                          <span className="text-[8px] text-zinc-600">{health.networkType}</span>
                        )}
                        {biz.avgPrepTimeMinutes && <span className="text-[8px] text-zinc-600">{biz.prepTimeOverrideMinutes ?? biz.avgPrepTimeMinutes}m prep</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {bizOrders.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">{bizOrders.length}</span>
                      )}
                      {contact?.phoneNumber && (
                        <a href={`tel:${contact.phoneNumber}`} className="h-5 w-5 flex items-center justify-center rounded bg-zinc-800 text-zinc-500 hover:text-white transition">
                          <Phone size={8} />
                        </a>
                      )}
                      {health?.userId && (
                        <button
                          onClick={() => {
                            setChatBizUserId(health.userId);
                            loadBizMessages(health.userId);
                          }}
                          className="h-5 w-5 flex items-center justify-center rounded bg-zinc-800 text-zinc-500 hover:text-sky-400 transition">
                          <MessageSquare size={8} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Business chat overlay */}
            {chatBizUserId && (() => {
              const chatBiz = businesses.find((b: any) => {
                const h = bizDeviceRows.find((r: any) => r.userId === chatBizUserId);
                return h ? b.id === h.businessId : false;
              });
              const sendBizChat = async () => {
                const trimmed = chatBizInput.trim();
                if (!trimmed || !chatBizUserId) return;
                setChatBizInput('');
                try {
                  const result = await sendBusinessMessage({ variables: { businessUserId: chatBizUserId, body: trimmed, alertType: 'INFO' } });
                  const sent = result.data?.sendBusinessMessage;
                  if (sent) {
                    setChatBizMessages((prev: any[]) => prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]);
                  }
                  setTimeout(() => chatBizBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                } catch (e: any) { toast.error(e.message || 'Send failed'); }
              };
              return (
                <div className="absolute inset-0 flex flex-col bg-[#0a0a0b] z-10">
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/8">
                    <button onClick={() => setChatBizUserId(null)} className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition">
                      <ChevronLeft size={14} />
                    </button>
                    {chatBiz && (
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0 ${getAvatarColor(chatBizUserId)}`}>
                        {chatBiz.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{chatBiz?.name ?? 'Business'}</div>
                      <div className="text-[9px] text-zinc-500">Direct message</div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-1.5">
                    {chatBizMessages.length === 0 && (
                      <div className="text-[10px] text-zinc-700 text-center py-6">No messages yet</div>
                    )}
                    {chatBizMessages.map((msg: any, i: number) => {
                      const isAdmin = msg.senderRole === 'ADMIN';
                      return (
                        <div key={msg.id ?? i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-2.5 py-1.5 text-xs leading-snug ${
                            isAdmin
                              ? 'bg-sky-500 text-white rounded-2xl rounded-tr-sm'
                              : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm'
                          }`}>
                            {msg.body}
                            <div className={`text-[8px] mt-0.5 text-right ${isAdmin ? 'text-sky-200/60' : 'text-zinc-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatBizBottomRef} />
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-2 border-t border-white/8">
                    <input
                      type="text" value={chatBizInput}
                      onChange={(e) => setChatBizInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBizChat(); } }}
                      placeholder="Message business…"
                      className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50" />
                    <button
                      onClick={sendBizChat}
                      disabled={!chatBizInput.trim()}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                      <Send size={11} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ════════════════ SHIFT MANAGEMENT MODAL ════════════════ */}
      {showShiftModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowShiftModal(false)} />
          <div className="relative z-[201] w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Manage Shift</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {workingDriverIds.size === 0
                    ? 'All drivers visible — select drivers to restrict the shift view'
                    : `${workingDriverIds.size} driver${workingDriverIds.size !== 1 ? 's' : ''} on shift`}
                </p>
              </div>
              <button onClick={() => setShowShiftModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition">
                <X size={15} />
              </button>
            </div>

            {/* Driver list */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-800/60">
              {drivers.map((driver: any) => {
                const connectionStatus = (driver.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
                const statusStyle = DRIVER_CONNECTION_COLORS[connectionStatus];
                const StatusIcon = statusStyle.icon;
                const isSelected = workingDriverIds.has(driver.id);
                const isBusy = getActiveCountForDriver(driver.id, activeOrders) > 0;
                return (
                  <button
                    key={driver.id}
                    onClick={() => toggleWorkingDriver(driver.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition ${
                      isSelected ? 'bg-blue-500/10' : 'hover:bg-white/5'
                    }`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${getAvatarColor(driver.id)} border ${statusStyle.border} ${connectionStatus === 'DISCONNECTED' || connectionStatus === 'LOST' ? 'opacity-50' : ''}`}>
                      {getInitials(driver.firstName, driver.lastName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white truncate">{driver.firstName} {driver.lastName}</div>
                      <div className={`flex items-center gap-1 text-[10px] ${statusStyle.text}`}>
                        <StatusIcon size={9} />
                        {statusStyle.label}
                        {isBusy && <span className="ml-1 text-amber-400">· {getActiveCountForDriver(driver.id, activeOrders)} order{getActiveCountForDriver(driver.id, activeOrders) !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-600 bg-transparent'
                    }`}>
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-900/60">
              <button
                onClick={async () => {
                  const prev = new Set(workingDriverIds);
                  const allIds = new Set<string>(drivers.map((d: any) => d.id));
                  const allArr = [...allIds];
                  setWorkingDriverIds(allIds);
                  try { localStorage.setItem(WORKING_DRIVERS_KEY, JSON.stringify(allArr)); } catch {}
                  try {
                    await setShiftDrivers({ variables: { driverIds: allArr } });
                  } catch {
                    setWorkingDriverIds(prev);
                    try { localStorage.setItem(WORKING_DRIVERS_KEY, JSON.stringify([...prev])); } catch {}
                    toast.error('Failed to update shift — driver list not saved');
                  }
                }}
                className="text-[11px] text-zinc-400 hover:text-white transition">
                Select all
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const prev = new Set(workingDriverIds);
                    setWorkingDriverIds(new Set());
                    try { localStorage.removeItem(WORKING_DRIVERS_KEY); } catch {}
                    try {
                      await setShiftDrivers({ variables: { driverIds: [] } });
                    } catch {
                      setWorkingDriverIds(prev);
                      try { localStorage.setItem(WORKING_DRIVERS_KEY, JSON.stringify([...prev])); } catch {}
                      toast.error('Failed to clear shift — driver list not saved');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition">
                  Clear shift
                </button>
                <button
                  onClick={() => setShowShiftModal(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white transition">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation */}
      {pendingStatusChange && (() => {
        const order = activeOrders.find((o: any) => o.id === pendingStatusChange.orderId);
        const fromStatus = order?.status || '';
        const toStatus = pendingStatusChange.status;
        const toColor = ORDER_STATUS_COLORS[toStatus as keyof typeof ORDER_STATUS_COLORS];
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPendingStatusChange(null)} />
            <div className="relative z-[201] w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
              <h3 className="text-sm font-semibold text-white mb-1">Change Status?</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Move <span className="text-white font-medium">{order?.businesses?.[0]?.business?.name || 'order'}</span> from{' '}
                <span className="font-medium text-zinc-200">{fromStatus.replace(/_/g, ' ')}</span>{' → '}
                <span className={`font-medium ${toColor?.text || 'text-white'}`}>{toStatus.replace(/_/g, ' ')}</span>?
              </p>
              {toStatus === 'PREPARING' && (
                <div className="mb-4 space-y-1.5">
                  <label className="block text-[11px] font-medium text-zinc-300">Preparation time (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/70"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setPendingStatusChange(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition">Cancel</button>
                <button onClick={handleConfirmStatusChange}
                  disabled={toStatus === 'PREPARING' && startPreparingLoading}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold text-white transition ${toColor?.selectBg || 'bg-zinc-700'} hover:opacity-90`}>
                  {toStatus === 'PREPARING' && startPreparingLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel Order Modal */}
      <CancelOrderModal
        order={cancelModalOrder as any}
        reason={cancelReason}
        category={cancelReasonCategory}
        settleDriver={cancelSettleDriver}
        settleBusiness={cancelSettleBusiness}
        loading={cancellingOrder}
        isBusinessUser={false}
        onReasonChange={setCancelReason}
        onCategoryChange={setCancelReasonCategory}
        onSettleDriverChange={setCancelSettleDriver}
        onSettleBusinessChange={setCancelSettleBusiness}
        onConfirm={handleAdminCancel}
        onClose={() => { setCancelModalOrderId(null); setCancelReason(''); setCancelReasonCategory(null); setCancelSettleDriver(false); setCancelSettleBusiness(false); }}
      />

      {/* Approve Order Modal */}
      {approvalModalOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissApprovalModal} />
          <div className="relative z-[201] w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Approve Order</h3>
              <button onClick={dismissApprovalModal} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400"><X size={14} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Order summary */}
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <div className="font-medium text-rose-300 text-sm">{(approvalModalOrder as any).displayId || approvalModalOrder.id.slice(0, 8)}</div>
                {(approvalModalOrder as any).user && (
                  <>
                    <div className="text-xs text-zinc-400 mt-0.5">{(approvalModalOrder as any).user.firstName} {(approvalModalOrder as any).user.lastName}</div>
                    <div className="text-xs text-zinc-500 mt-1">{Number((approvalModalOrder as any).user.totalOrders || 0)} total orders</div>
                    {(approvalModalOrder as any).user.phoneNumber && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                        <Phone size={11} className="text-zinc-600" />
                        <a href={`tel:${(approvalModalOrder as any).user.phoneNumber}`} className="hover:text-white transition-colors">
                          {(approvalModalOrder as any).user.phoneNumber}
                        </a>
                      </div>
                    )}
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={trustUpdatingUserId === (approvalModalOrder as any).user.id}
                        onClick={() => handleToggleTrustedCustomer((approvalModalOrder as any).user, !isTrustedCustomer((approvalModalOrder as any).user))}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                          isTrustedCustomer((approvalModalOrder as any).user)
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {trustUpdatingUserId === (approvalModalOrder as any).user.id
                          ? 'Saving...'
                          : isTrustedCustomer((approvalModalOrder as any).user)
                            ? 'Trusted customer: enabled'
                            : 'Mark as trusted customer'}
                      </button>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        disabled={suppressionUpdatingUserId === (approvalModalOrder as any).user?.id}
                        checked={isApprovalModalSuppressed((approvalModalOrder as any).user)}
                        onChange={(e) => {
                          const user = (approvalModalOrder as any).user;
                          if (!user) return;
                          void setApprovalModalSuppressionForUser(user, e.target.checked);
                        }}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-900"
                      />
                      Don't auto-open approval modal again for this user
                    </label>
                  </>
                )}
                <div className="text-xs text-zinc-500 mt-0.5">€{Number((approvalModalOrder as any).totalPrice || 0).toFixed(2)}</div>
              </div>
              {/* Reason flags */}
              <div className="space-y-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Approval flags</div>
                {getApprovalReasons(approvalModalOrder).includes('FIRST_ORDER') && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium">
                    🆕 First order — customer has no previous orders
                  </div>
                )}
                {getApprovalReasons(approvalModalOrder).includes('HIGH_VALUE') && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                    💰 High value order (over €20)
                  </div>
                )}
                {getApprovalReasons(approvalModalOrder).includes('OUT_OF_ZONE') && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-medium">
                    📍 Outside delivery zone — confirm drop-off address with customer
                  </div>
                )}
                {getApprovalReasons(approvalModalOrder).length === 0 && (approvalModalOrder as any).needsApproval && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                    ⚠ Manual verification required before approval
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Confirm you have called/verified this order. On approval, status moves to <span className="text-white font-medium">Pending</span> and businesses are notified.
              </p>
              <div className="flex gap-2">
                <button onClick={dismissApprovalModal}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition">Go Back</button>
                <button onClick={handleApproveConfirm} disabled={approvingOrder}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50">
                  {approvingOrder ? 'Approving…' : '✓ Approve & Send to Business'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Out for Delivery without driver */}
      {confirmNoDriverAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmNoDriverAction(null)} />
          <div className="relative z-[201] w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">No Driver Assigned</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Are you sure you want to mark this order as <span className="text-white font-medium">Out for Delivery</span> without a driver assigned? The order will not be trackable until a driver is assigned.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmNoDriverAction(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition">
                Cancel
              </button>
              <button onClick={handleConfirmNoDriverStatusUpdate}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition">
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory Coverage Modal ── */}
      {inventoryModalOrder && (
        <InventoryCoverageModal
          orderId={inventoryModalOrder.id}
          displayId={inventoryModalOrder.displayId || inventoryModalOrder.id.slice(0, 8)}
          coverage={(coverageData as any)?.orderCoverage}
          loading={coverageLoading}
          onClose={() => setInventoryModalOrder(null)}
        />
      )}
    </div>
  );
}

// ── Items list with show more/less ───────────────────────────────────────────
const ITEMS_PREVIEW = 3;

function ItemsList({ orderBusinesses }: { orderBusinesses: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const allItems = orderBusinesses.flatMap((b: any) =>
    getOrderBusinessItems(b).map((item: any, idx: number) => ({ ...item, key: `${b.business?.id}-${idx}` }))
  );
  const visible = expanded ? allItems : allItems.slice(0, ITEMS_PREVIEW);
  const hidden = allItems.length - ITEMS_PREVIEW;

  return (
    <div className="px-5 py-3 border-b border-white/5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Items</div>
      <div className="space-y-1">
        {visible.map((item: any) => (
          <div key={item.key} className="flex justify-between text-sm">
            <span className="text-zinc-300 truncate pr-2">{item.quantity}× {item.name || 'Item'}</span>
            <span className="text-zinc-500 flex-shrink-0">€{((item.unitPrice || item.basePrice || 0) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition">
          {expanded ? 'Show less' : `+${hidden} more item${hidden !== 1 ? 's' : ''}`}
        </button>
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
  onApproveOrder,
  onTogglePolyline, showPolyline, onToggleBothRoutes, showBothRoutes,
  onFocus, driverProgressOnRoute, onNotifyDriver, onNotifyBusiness, incident, onIncidentUpdate,
  workingDriverIds, onToggleTrustedCustomer, trustUpdatingUserId,
}: any) {
  const [selectedDriverId, setSelectedDriverId] = useState(order.driver?.id || "");
  const statusColor = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.PENDING;
  const isTerminalStatus = order.status === "DELIVERED" || order.status === "CANCELLED";
  const orderBusinesses = getOrderBusinesses(order);
  const businessName = orderBusinesses[0]?.business?.name || "Unknown";
  const businessPhone = orderBusinesses[0]?.business?.phoneNumber || "";
  const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}`.trim() : "Unknown";
  const customerPhone = order.user?.phoneNumber || "";
  const customerTotalOrders = Number(order.user?.totalOrders ?? 0);
  const customerTrusted = isTrustedCustomer(order.user);
  const distanceData = orderDistances[order.id];
  const etaMin = getOrderEtaMinutes(
    order, distanceData, now,
    driverProgressOnRoute[order.driver?.id] || 0,
    order.driver ? driverMap[order.driver.id] : null,
  );
  const isPending = order.status === "PENDING";
  const orderDateMs = parseServerTimeMs(order.orderDate) ?? now;
  const elapsed = Math.max(0, now - orderDateMs);
  const pendingTooLong = isPending && elapsed > PENDING_WARNING_MS;
  const statusStartMs = statusChangeTime[order.id] || getOrderStatusStartMs(order, now);
  const statusElapsed = Math.max(0, now - statusStartMs);
  const pickupLocation = orderBusinesses
    ?.map((entry: any) => entry?.business?.location)
    ?.find((location: any) => isValidLatLng(location?.latitude, location?.longitude));
  const preview = (order as any).settlementPreview;
  const previewSeverity = preview ? getMarginSeverity(preview.netMargin) : null;

  const allDriversSorted = useMemo(() => {
    return drivers
      .filter((driver: any) => {
        const onShift = !workingDriverIds || workingDriverIds.size === 0 || workingDriverIds.has(driver.id);
        return onShift;
      })
      .map((driver: any) => {
        const hasLocation = isValidLatLng(driver?.driverLocation?.latitude, driver?.driverLocation?.longitude);
        const distanceToPickupMeters = hasLocation && pickupLocation
          ? distanceMeters(
              { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
              { latitude: driver.driverLocation.latitude, longitude: driver.driverLocation.longitude },
            )
          : Infinity;
        const activeCount = getActiveCountForDriver(driver.id, activeOrders);
        const isAssignable = hasLocation && isDriverAssignable(driver);
        const isFree = activeCount < MAX_DRIVER_ACTIVE_ORDERS;
        return { driver, distanceToPickupMeters, isAssignable, isFree, hasLocation, activeCount };
      })
      .sort((a: any, b: any) => {
        const score = (d: any) =>
          d.isAssignable && d.isFree ? 0 :  // online, free
          d.isAssignable ? 1 :               // online, busy
          2;                                 // offline/unavailable
        const s = score(a) - score(b);
        if (s !== 0) return s;
        return a.distanceToPickupMeters - b.distanceToPickupMeters;
      });
  }, [drivers, activeOrders, workingDriverIds, pickupLocation?.latitude, pickupLocation?.longitude]);

  const recommendedDriver = !order.driver ? (allDriversSorted.find((d: any) => d.isAssignable && d.isFree) ?? null) : null;
  const prepTimeMinutes = orderBusinesses[0]?.business?.avgPrepTimeMinutes;
  const prepRemainingMin = order.status === "PREPARING" && order.estimatedReadyAt
    ? Math.max(0, Math.round((new Date(order.estimatedReadyAt).getTime() - now) / 60000))
    : null;
  const prepTotalMs = order.preparationMinutes ? order.preparationMinutes * 60 * 1000 : prepTimeMinutes ? prepTimeMinutes * 60 * 1000 : null;
  const prepProgress = order.status === "PREPARING" && prepTotalMs && order.estimatedReadyAt
    ? Math.min(1 - (new Date(order.estimatedReadyAt).getTime() - now) / prepTotalMs, 1)
    : (isPending || order.status === "READY") && prepTimeMinutes
    ? Math.min(statusElapsed / (prepTimeMinutes * 60 * 1000), 1)
    : order.status === "OUT_FOR_DELIVERY" ? (driverProgressOnRoute[order.driver?.id] || 0) : 0;

  useEffect(() => { setSelectedDriverId(order.driver?.id || ""); }, [order.driver?.id, order.id]);
  useEffect(() => {
    if (order.driver || !recommendedDriver || selectedDriverId) return;
    setSelectedDriverId((recommendedDriver as any).driver.id);
  }, [order.driver, recommendedDriver, selectedDriverId]);

  const slaRisk = getOrderSlaRisk(order, now, statusChangeTime);
  const [confirmPreReady, setConfirmPreReady] = useState(false);
  const [pendingAssignDriverId, setPendingAssignDriverId] = useState<string | null>(null);
  // Reset pre-ready state when order changes
  useEffect(() => { setConfirmPreReady(false); setPendingAssignDriverId(null); }, [order.id]);

  return (
    // Right-side full-height drawer — slides in from right, sits left of the 72px icon bar
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-white/8">
        {/* Top row: status + close */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                slaRisk.level === 'critical' ? 'bg-red-500/20 text-red-300' :
                slaRisk.level === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                `${statusColor.selectBg} ${statusColor.text}`
              }`}>
              {order.status.replace(/_/g, ' ')}
            </span>
            {slaRisk.level !== 'ok' && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                slaRisk.level === 'critical' ? 'bg-red-500/20 text-red-300 animate-pulse' : 'bg-amber-500/20 text-amber-300'
              }`}>
                +{Math.round(slaRisk.delayMs / 60000)}m overdue
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onFocus} title="Fit map to order" className="p-1.5 rounded-lg hover:bg-white/8 text-zinc-500 hover:text-white transition"><Crosshair size={14} /></button>
            {distanceData && (
              <button onClick={onTogglePolyline} title={showPolyline ? 'Hide route' : 'Show route'}
                className={`p-1.5 rounded-lg transition ${showPolyline ? 'bg-violet-500/20 text-violet-300' : 'hover:bg-white/8 text-zinc-500 hover:text-white'}`}>
                <Route size={14} />
              </button>
            )}
            <button onClick={onClose} title="Close" className="p-1.5 rounded-lg hover:bg-white/8 text-zinc-500 hover:text-white transition"><X size={14} /></button>
          </div>
        </div>

        {/* Business → Customer */}
        <div className="flex items-center gap-2 mb-1">
          <PrepTimeRing size={44} stroke={3} progress={prepProgress} color={slaRisk.level === 'critical' ? '#ef4444' : slaRisk.level === 'warning' ? '#f59e0b' : statusColor.hex}>
            <div className={`text-[11px] font-bold leading-none ${
              slaRisk.level === 'critical' ? 'text-red-400' : slaRisk.level === 'warning' ? 'text-amber-400' : statusColor.text
            }`}>
              {order.status === 'PREPARING' && prepRemainingMin !== null ? `${prepRemainingMin}m` : etaMin ? `${etaMin}m` : isPending ? `${Math.floor(elapsed / 60000)}m` : '—'}
            </div>
          </PrepTimeRing>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white truncate">{businessName}</div>
            <div className="flex items-center gap-1.5 text-sm text-zinc-400 truncate">
              <span className="text-zinc-600 text-xs">→</span>
              <span className="truncate">{customerName}</span>
            </div>
          </div>
        </div>

        {/* Timing + price row */}
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
          <span>Age <span className={`font-mono font-semibold ${pendingTooLong ? 'text-red-400' : 'text-zinc-200'}`}>{formatElapsed(elapsed)}</span></span>
          <span>In status <span className="font-mono font-semibold text-zinc-200">{formatElapsed(statusElapsed)}</span></span>
          <span className="ml-auto text-base font-bold text-white">€{order.totalPrice?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* ── Contact info ── */}
        <div className="px-5 py-3 border-b border-white/5 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-1">Parties</div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Store size={13} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{businessName}</div>
              {businessPhone && <div className="text-xs text-zinc-500">{businessPhone}</div>}
            </div>
            <button onClick={() => onNotifyBusiness(order.id)} title="Notify business"
              className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition">
              Notify
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{customerName}</div>
              <div className="text-xs text-zinc-500">{customerTotalOrders} total orders</div>
              {customerPhone && <div className="text-xs text-zinc-500">{customerPhone}</div>}
            </div>
            <button
              onClick={() => onToggleTrustedCustomer(order.user, !customerTrusted)}
              disabled={!order.user?.id || trustUpdatingUserId === order.user?.id}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition disabled:opacity-50 ${
                customerTrusted
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {trustUpdatingUserId === order.user?.id
                ? 'Saving...'
                : customerTrusted
                  ? 'Trusted'
                  : 'Mark trusted'}
            </button>
          </div>
          {order.dropOffLocation?.address && (
            <div className="text-xs text-zinc-600 leading-tight pl-10 truncate">{order.dropOffLocation.address}</div>
          )}
          {getApprovalReasons(order).includes('FIRST_ORDER') && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-[11px] font-semibold">
              🆕 First order
            </div>
          )}
          {getApprovalReasons(order).includes('HIGH_VALUE') && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] font-semibold">
              💰 Over €20
            </div>
          )}
          {(order as any).inventoryPrice != null && Number((order as any).inventoryPrice) > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setInventoryModalOrder(order); fetchOrderCoverage({ variables: { orderId: order.id } }); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setInventoryModalOrder(order); fetchOrderCoverage({ variables: { orderId: order.id } }); } }}
              className="mt-2 w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-colors text-left cursor-pointer"
            >
              📦 Stock items — €{Number((order as any).inventoryPrice).toFixed(2)}
              <span className="ml-auto text-violet-500 text-[10px]">View →</span>
            </div>
          )}
          {(order as any).needsApproval && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              ⚠ Awaiting approval
            </div>
          )}
          {customerTrusted && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              ✅ Trusted customer
            </div>
          )}
          {getApprovalReasons(order).includes('OUT_OF_ZONE') && (
            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
              📍 Outside delivery zone
            </div>
          )}
        </div>

        {/* ── Order items ── */}
        {orderBusinesses.some((b: any) => getOrderBusinessItems(b).length > 0) && (
          <ItemsList orderBusinesses={orderBusinesses} />
        )}

        {/* ── Driver ── */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Driver</div>
          {order.driver ? (
            (() => {
              const driver = driverMap[order.driver.id];
              const cs = (driver?.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
              const ss = DRIVER_CONNECTION_COLORS[cs];
              const SI = ss.icon;
              return (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(order.driver.id)} flex items-center justify-center font-bold text-white text-sm border-2 ${ss.border} flex-shrink-0`}>
                    {getInitials(order.driver.firstName, order.driver.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{order.driver.firstName} {order.driver.lastName}</div>
                    <div className={`flex items-center gap-1 text-xs ${ss.text}`}><SI size={10} />{ss.label}</div>
                  </div>
                  <button onClick={() => onNotifyDriver(order.id)} title="Notify driver"
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 transition">
                    Notify
                  </button>
                  <button onClick={() => onAssignDriver(order.id, null)} title="Unassign"
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-600 hover:text-rose-400 transition">
                    <X size={13} />
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="space-y-2">
              <div className="overflow-y-auto space-y-1" style={{ maxHeight: '180px' }}>
                {allDriversSorted.length === 0 ? (
                  <div className="text-sm text-zinc-600 italic">No drivers found</div>
                ) : allDriversSorted.map(({ driver, distanceToPickupMeters, isAssignable, isFree }: any) => {
                  const cs = (driver.driverConnection?.connectionStatus ?? 'DISCONNECTED') as keyof typeof DRIVER_CONNECTION_COLORS;
                  const ss = DRIVER_CONNECTION_COLORS[cs];
                  const SI = ss.icon;
                  const isSelected = selectedDriverId === driver.id;
                  const isRecommended = recommendedDriver && (recommendedDriver as any).driver?.id === driver.id;
                  const isBusy = isAssignable && !isFree;
                  const isUnavailable = !isAssignable;
                  return (
                    <button key={driver.id} onClick={() => setSelectedDriverId(driver.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                        isSelected ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-white/4 hover:bg-white/7 border border-white/4'
                      } ${isUnavailable ? 'opacity-50' : ''}`}>
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(driver.id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 border ${ss.border}`}>
                        {getInitials(driver.firstName, driver.lastName)}
                      </div>
                      <span className="text-sm text-white truncate flex-1">{driver.firstName} {driver.lastName}</span>
                      <span className="text-xs text-zinc-500 flex-shrink-0">{Number.isFinite(distanceToPickupMeters) ? `${(distanceToPickupMeters / 1000).toFixed(1)}km` : '—'}</span>
                      {isRecommended && <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">Best</span>}
                      {isBusy && <span className="text-[10px] text-amber-400 font-semibold flex-shrink-0">Busy</span>}
                      {isUnavailable && <span className="text-[10px] text-zinc-500 font-semibold flex-shrink-0">Unavailable</span>}
                      <SI size={10} className={`${ss.text} flex-shrink-0`} />
                    </button>
                  );
                })}
              </div>
              {/* Pre-ready assign warning */}
              {confirmPreReady && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-300">Order is not ready yet. Assigning now will notify the driver before the order is prepared. Are you sure?</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { onAssignDriver(order.id, pendingAssignDriverId!); setConfirmPreReady(false); setPendingAssignDriverId(null); }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black transition">Assign anyway</button>
                    <button onClick={() => { setConfirmPreReady(false); setPendingAssignDriverId(null); }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition">Cancel</button>
                  </div>
                </div>
              )}
              {!confirmPreReady && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (!selectedDriverId) return;
                      if (order.status === 'PENDING' || order.status === 'PREPARING') {
                        setPendingAssignDriverId(selectedDriverId);
                        setConfirmPreReady(true);
                      } else {
                        onAssignDriver(order.id, selectedDriverId);
                      }
                    }}
                    disabled={!selectedDriverId}
                    className={`py-2 rounded-lg text-sm font-semibold transition ${
                      selectedDriverId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}>
                    Assign
                  </button>
                  <button onClick={() => onAutoAssign(order.id)}
                    className="py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5">
                    <Zap size={13} /> Auto-assign
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Status ── */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Status</div>
          {(order as any).needsApproval && (
            <button
              onClick={() => onApproveOrder(order.id)}
              className="w-full mb-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              Approve and Send to Business
            </button>
          )}
          <select value={order.status} onChange={(e) => onUpdateStatus(order.id, e.target.value)}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm font-semibold text-white ${statusColor.selectBg} ${statusColor.border}`}
            style={{ colorScheme: 'dark' }}>
            <option value="AWAITING_APPROVAL" style={{ backgroundColor: '#1f2937' }}>Awaiting Approval</option>
            <option value="PENDING" style={{ backgroundColor: '#1f2937' }}>Pending</option>
            <option value="PREPARING" style={{ backgroundColor: '#1f2937' }}>Preparing</option>
            <option value="READY" style={{ backgroundColor: '#1f2937' }}>Ready</option>
            <option value="OUT_FOR_DELIVERY" style={{ backgroundColor: '#1f2937' }}>Out for Delivery</option>
            <option value="DELIVERED" style={{ backgroundColor: '#1f2937' }}>Delivered</option>
            <option value="CANCELLED" style={{ backgroundColor: '#1f2937' }}>Cancelled</option>
          </select>
          {!order.driver?.id && !isTerminalStatus && (
            <div className="mt-1.5 text-xs text-amber-400/80 flex items-center gap-1"><AlertCircle size={11} /> No driver assigned — confirm before proceeding</div>
          )}
          {distanceData && order.driver && (order.status === 'READY' || order.status === 'PENDING') && (
            <button onClick={onToggleBothRoutes}
              className={`mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                showBothRoutes ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-zinc-500 hover:text-white border border-white/8'
              }`}>
              <Route size={13} />{showBothRoutes ? 'Hide' : 'Show'} both routes
            </button>
          )}
        </div>

        {/* ── Economics ── */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Economics</div>
          {preview ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>Receivable <span className="text-emerald-300 font-semibold">€{preview.totalReceivable.toFixed(2)}</span></span>
                  <span>Payable <span className="text-rose-300 font-semibold">€{preview.totalPayable.toFixed(2)}</span></span>
                </div>
                <div className={`rounded-lg px-2 py-1 ${
                  previewSeverity === 'healthy' ? 'bg-emerald-500/10' :
                  previewSeverity === 'thin' ? 'bg-amber-500/10' : 'bg-rose-500/10'
                }`}>
                  <span className={`text-sm font-semibold ${
                    previewSeverity === 'healthy' ? 'text-emerald-300' :
                    previewSeverity === 'thin' ? 'text-amber-300' : 'text-rose-300'
                  }`}>{preview.netMargin >= 0 ? '+' : ''}€{preview.netMargin.toFixed(2)}</span>
                </div>
              </div>
              {!preview.driverAssigned && (
                <div className="mb-2 text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-300 font-semibold inline-block">No driver assigned</div>
              )}
              <div className="space-y-1">
                {preview.lineItems.map((li: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 truncate mr-2">{li.reason}</span>
                    <span className={`font-semibold whitespace-nowrap ${li.direction === 'RECEIVABLE' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {li.direction === 'RECEIVABLE' ? '+' : '-'}€{li.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-600">No settlement data</div>
          )}
        </div>

        {/* ── Incident Flag (terminal orders only) ── */}
        {isTerminalStatus && (
          <div className="px-5 py-3 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Incident Flag</div>
              {incident?.tag && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold uppercase tracking-wide">Flagged</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-zinc-600 mb-1">Tag</div>
                <select
                  value={incident?.tag || ''}
                  onChange={(e) => onIncidentUpdate(order.id, { tag: e.target.value })}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs border ${
                    incident?.tag ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                  style={{ colorScheme: 'dark' }}>
                  <option value="">None</option>
                  <option value="late_prep">Late Prep</option>
                  <option value="driver_delay">Driver Delay</option>
                  <option value="handoff_issue">Handoff Issue</option>
                  <option value="customer_issue">Customer Issue</option>
                  <option value="wrong_order">Wrong Order</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] text-zinc-600 mb-1">Reason</div>
                <input
                  value={incident?.rootCause || ''}
                  onChange={(e) => onIncidentUpdate(order.id, { rootCause: e.target.value })}
                  placeholder="Describe what happened…"
                  className="w-full px-2.5 py-2 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            </div>
            {incident?.tag && incident?.updatedAt > 0 && (
              <div className="mt-1.5 text-[10px] text-zinc-600">Flagged {formatElapsed(now - incident.updatedAt)} ago</div>
            )}
          </div>
        )}

        {/* Bottom padding for scroll */}
        <div className="h-4" />
      </div>
    </div>
  );
}
