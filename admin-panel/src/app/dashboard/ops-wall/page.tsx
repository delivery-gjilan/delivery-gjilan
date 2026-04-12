"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Battery,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  Monitor,
  Package,
  PlugZap,
  Radio,
  RefreshCw,
  Signal,
  Smartphone,
  Truck,
  Bell,
  VolumeX,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/Table";

// ── Types ─────────────────────────────────────────────────────────

type StuckOrder = {
  orderId: string;
  displayId: string;
  since: string | null;
  minutesWaiting: number;
  type: "pending_no_assignment" | "ready_no_pickup" | "out_for_delivery_too_long";
};

type RecentDisconnect = {
  driverId: string;
  name: string;
  phoneNumber: string | null;
  disconnectedAt: string | null;
  batteryLevel: number | null;
};

type RealtimeEvent = {
  at: string;
  level: "info" | "warn" | "error";
  type: string;
  socketId?: string;
  operationName?: string;
  topic?: string;
  detail: string;
};

type LiveUser = {
  userId: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  role: string;
  flagColor: string | null;
  adminNote: string | null;
  connectedSince: number | null;
  activeOrder: {
    userId: string;
    displayId: string;
    status: string;
    dropoffAddress: string;
  } | null;
};

type OpsWallData = {
  timestamp: string;
  sloStatus: "ok" | "degraded" | "critical";
  liveUsers: LiveUser[];

  driverFleet: {
    total: number;
    byConnectionStatus: Record<string, number>;
    staleLocationCount: number;
    avgHeartbeatAgeSeconds: number;
    recentDisconnects: RecentDisconnect[];
  };

  businessFleet: {
    totalDevices: number;
    totalBusinesses: number;
    onlineDevices: number;
    byOnlineStatus: Record<string, number>;
    devices: Array<{
      businessId: string;
      businessName: string;
      businessPhoneNumber: string | null;
      deviceId: string;
      onlineStatus: string;
      lastHeartbeatAt: string | null;
      batteryLevel: number | null;
      subscriptionAlive: boolean;
    }>;
    byAppVersion: Record<string, number>;
    byPlatform: Record<string, number>;
  };

  orderPipeline: {
    byStatus: Record<string, number>;
    stuckOrders: StuckOrder[];
    avgAssignmentTimeSeconds: number;
    avgDeliveryTimeSeconds: number;
    thresholds: {
      pendingStuckMinutes: number;
      readyStuckMinutes: number;
      outForDeliveryStuckMinutes: number;
    };
  };

  realtime: {
    status: "healthy" | "attention";
    activeByRole: Record<string, number>;
    activeConnections: number;
    activeSubscriptions: number;
    totalRejectedSubscriptions: number;
    totalSubscriptionErrors: number;
    totalPubsubFailures: number;
    subscriptionsByOperation: Array<{
      operationName: string;
      active: number;
      totals: { accepted: number; rejected: number; completed: number; errored: number };
    }>;
    pubsubByTopic: Array<{ topic: string; published: number; failures: number }>;
    recentEvents: RealtimeEvent[];
  };

  pushHealth: {
    sentLast5m: number;
    byEvent5m: Record<string, number>;
    openRate5mPct: number;
    actionRate5mPct: number;
    byAppType: Array<{
      appType: string;
      received: number;
      opened: number;
      actioned: number;
      openRatePct: number;
    }>;
  };
};

// ── Constants ─────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000;
const DEFAULT_GRAPHQL_URL = "http://localhost:4000/graphql";

const ORDER_STATUS_ORDER = ["PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STUCK_TYPE_LABELS: Record<StuckOrder["type"], string> = {
  pending_no_assignment: "No driver assigned",
  ready_no_pickup: "No pickup",
  out_for_delivery_too_long: "Long delivery",
};

// ── Helpers ───────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  const graphqlUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_GRAPHQL_URL;
  return graphqlUrl.endsWith("/graphql")
    ? graphqlUrl.slice(0, -"/graphql".length)
    : graphqlUrl.replace(/\/$/, "");
}

async function fetchOpsWallData(): Promise<OpsWallData> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const response = await fetch(`${getApiBaseUrl()}/health/ops-wall`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Ops wall endpoint returned ${response.status}`);
  }
  return response.json() as Promise<OpsWallData>;
}

function formatRelativeTime(ts: string | null | undefined): string {
  if (!ts) return "–";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatSeconds(seconds: number): string {
  if (seconds === 0) return "–";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── SLO status computation ─────────────────────────────────────────

type SloStatus = "ok" | "degraded" | "critical";

function computeSlos(data: OpsWallData): Record<string, SloStatus> {
  const { driverFleet, businessFleet, orderPipeline, realtime } = data;

  // API / realtime SLO
  const apiSlo: SloStatus =
    realtime.totalPubsubFailures > 0
      ? "critical"
      : realtime.activeConnections === 0
        ? "degraded"
        : "ok";

  // Realtime subscription SLO
  const realtimeSlo: SloStatus =
    realtime.totalSubscriptionErrors > 0
      ? "critical"
      : realtime.totalRejectedSubscriptions >= 5
        ? "degraded"
        : "ok";

  // Driver fleet SLO
  const lost = driverFleet.byConnectionStatus.LOST ?? 0;
  const stale = driverFleet.byConnectionStatus.STALE ?? 0;
  const driverSlo: SloStatus = lost > 0 ? "critical" : stale > 0 ? "degraded" : "ok";

  // Business fleet SLO
  const offline = businessFleet.byOnlineStatus.OFFLINE ?? 0;
  const offlineRatio = businessFleet.totalDevices > 0 ? offline / businessFleet.totalDevices : 0;
  const businessSlo: SloStatus =
    offlineRatio >= 0.2 ? "critical" : offline > 0 ? "degraded" : "ok";

  // Order pipeline SLO
  const stuckCount = orderPipeline.stuckOrders.length;
  const orderSlo: SloStatus = stuckCount > 3 ? "critical" : stuckCount > 0 ? "degraded" : "ok";

  return { apiSlo, realtimeSlo, driverSlo, businessSlo, orderSlo };
}

// ── Sub-components ────────────────────────────────────────────────

function SloIndicator({ label, status, icon: Icon }: { label: string; status: SloStatus; icon: React.ElementType }) {
  const colorCls =
    status === "critical"
      ? "border-red-500/30 bg-red-500/5 text-red-400"
      : status === "degraded"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
        : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400";

  const dotCls =
    status === "critical"
      ? "bg-red-500 animate-pulse"
      : status === "degraded"
        ? "bg-amber-400 animate-pulse"
        : "bg-emerald-500";

  return (
    <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${colorCls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      <Icon size={12} />
      <span>{label}</span>
    </div>
  );
}

function StatBadge({ value, label, color = "zinc" }: { value: number | string; label: string; color?: "zinc" | "emerald" | "amber" | "red" }) {
  const textCls =
    color === "emerald"
      ? "text-emerald-400"
      : color === "amber"
        ? "text-amber-400"
        : color === "red"
          ? "text-red-400"
          : "text-zinc-100";

  return (
    <div className="text-center">
      <div className={`text-lg font-semibold tabular-nums ${textCls}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500">{label}</div>
    </div>
  );
}

function ConnectionStatusBar({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  if (total === 0) {
    return <div className="text-sm text-zinc-500 italic">No drivers registered</div>;
  }

  const segments: Array<{ key: string; label: string; cls: string; count: number }> = [
    { key: "CONNECTED", label: "Connected", cls: "bg-emerald-500", count: byStatus.CONNECTED ?? 0 },
    { key: "STALE", label: "Stale", cls: "bg-amber-400", count: byStatus.STALE ?? 0 },
    { key: "LOST", label: "Lost", cls: "bg-orange-500", count: byStatus.LOST ?? 0 },
    { key: "DISCONNECTED", label: "Disconnected", cls: "bg-zinc-600", count: byStatus.DISCONNECTED ?? 0 },
  ];

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800/60">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              className={`${s.cls} transition-all`}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.label}: ${s.count}`}
            />
          ) : null,
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`inline-block h-2 w-2 rounded-full ${s.cls}`} />
            <span>
              {s.label}: <span className="font-medium text-white">{s.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverFleetCard({ data, kiosk }: { data: OpsWallData["driverFleet"]; kiosk: boolean }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Truck size={15} className="text-violet-400" />
          <CardTitle className={kiosk ? "text-lg text-white" : "text-sm text-white"}>Driver Fleet</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Totals row */}
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-800/50 pb-3">
          <StatBadge value={data.total} label="Total" />
          <StatBadge
            value={data.byConnectionStatus.CONNECTED ?? 0}
            label="Connected"
            color={(data.byConnectionStatus.CONNECTED ?? 0) > 0 ? "emerald" : "zinc"}
          />
          <StatBadge
            value={(data.byConnectionStatus.STALE ?? 0) + (data.byConnectionStatus.LOST ?? 0)}
            label="Stale / Lost"
            color={(data.byConnectionStatus.STALE ?? 0) + (data.byConnectionStatus.LOST ?? 0) > 0 ? "amber" : "zinc"}
          />
        </div>

        {/* Status bar */}
        <ConnectionStatusBar byStatus={data.byConnectionStatus} total={data.total} />

        {/* Heartbeat info */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Activity size={13} />
            <span>
              Avg heartbeat age:{" "}
              <span className={data.avgHeartbeatAgeSeconds > 30 ? "text-amber-300" : "text-zinc-200"}>
                {formatSeconds(data.avgHeartbeatAgeSeconds)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Signal size={13} />
            <span>
              Stale locations:{" "}
              <span className={data.staleLocationCount > 0 ? "text-amber-300" : "text-emerald-300"}>
                {data.staleLocationCount}
              </span>
            </span>
          </div>
        </div>

        {/* Recent disconnects */}
        {data.recentDisconnects.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Recent Disconnects</p>
            <Table>
              <thead>
                <tr>
                  <Th>Driver</Th>
                  <Th>Phone</Th>
                  <Th>Battery</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentDisconnects.slice(0, kiosk ? 10 : 5).map((d) => (
                  <tr key={d.driverId}>
                    <Td className="font-medium text-white">{d.name}</Td>
                    <Td className="text-zinc-400">{d.phoneNumber ?? <span className="text-zinc-600">–</span>}</Td>
                    <Td>
                      {d.batteryLevel != null ? (
                        <span className={d.batteryLevel < 20 ? "text-red-300" : "text-zinc-300"}>
                          <Battery size={12} className="mr-1 inline" />
                          {d.batteryLevel}%
                        </span>
                      ) : (
                        <span className="text-zinc-600">–</span>
                      )}
                    </Td>
                    <Td className="text-zinc-400">{formatRelativeTime(d.disconnectedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderPipelineCard({ data, kiosk }: { data: OpsWallData["orderPipeline"]; kiosk: boolean }) {
  const totalActive = ORDER_STATUS_ORDER.slice(0, 4).reduce(
    (sum, s) => sum + (data.byStatus[s] ?? 0),
    0,
  );
  const stuckCount = data.stuckOrders.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-violet-400" />
          <CardTitle className={kiosk ? "text-lg text-white" : "text-sm text-white"}>Order Pipeline</CardTitle>
          {stuckCount > 0 && (
            <Badge variant={stuckCount > 3 ? "destructive" : "warning"} className="ml-auto">
              {stuckCount} stuck
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Active total */}
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-800/50 pb-3">
          <StatBadge value={totalActive} label="Active" />
          <StatBadge value={formatSeconds(data.avgAssignmentTimeSeconds)} label="Avg assign" />
          <StatBadge value={formatSeconds(data.avgDeliveryTimeSeconds)} label="Avg delivery" />
        </div>

        {/* Status funnel */}
        <div className="space-y-1.5">
          {ORDER_STATUS_ORDER.slice(0, 4).map((status) => {
            const count = data.byStatus[status] ?? 0;
            const maxCount = Math.max(...ORDER_STATUS_ORDER.slice(0, 4).map((s) => data.byStatus[s] ?? 0), 1);
            const widthPct = maxCount > 0 ? `${Math.max((count / maxCount) * 100, 2)}%` : "2%";
            return (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-zinc-400">{STATUS_LABELS[status]}</span>
                <div className="flex-1 overflow-hidden rounded bg-zinc-800/60">
                  <div
                    className="h-3 rounded bg-violet-600/80 transition-all"
                    style={{ width: widthPct }}
                  />
                </div>
                <span className="w-6 text-right font-medium text-white">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Today's completed */}
        <div className="flex gap-4 text-sm text-zinc-400">
          <span>
            Delivered today:{" "}
            <span className="font-medium text-emerald-300">{data.byStatus.DELIVERED ?? 0}</span>
          </span>
          <span>
            Cancelled:{" "}
            <span className="font-medium text-zinc-300">{data.byStatus.CANCELLED ?? 0}</span>
          </span>
        </div>

        {/* Stuck orders */}
        {stuckCount > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Stuck Orders</p>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Reason</Th>
                  <Th>Wait</Th>
                </tr>
              </thead>
              <tbody>
                {data.stuckOrders.slice(0, kiosk ? 10 : 5).map((o) => (
                  <tr key={o.orderId}>
                    <Td>
                      <span className="font-mono text-xs text-white">#{o.displayId}</span>
                    </Td>
                    <Td className="text-zinc-400">{STUCK_TYPE_LABELS[o.type]}</Td>
                    <Td>
                      <span className={o.minutesWaiting > 10 ? "text-red-300" : "text-amber-300"}>
                        {o.minutesWaiting}m
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PushHealthCard({ data, kiosk }: { data: OpsWallData["pushHealth"]; kiosk: boolean }) {
  const received = data.byEvent5m.RECEIVED ?? 0;
  const opened = data.byEvent5m.OPENED ?? 0;
  const actioned = data.byEvent5m.ACTION_TAPPED ?? 0;
  const openRateColor = data.openRate5mPct >= 20 ? "text-emerald-400" : data.openRate5mPct >= 10 ? "text-amber-400" : "text-red-400";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-violet-400" />
          <CardTitle className={kiosk ? "text-lg text-white" : "text-sm text-white"}>Push Health</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-800/50 pb-3">
          <StatBadge value={data.sentLast5m} label="Sent (5m)" />
          <StatBadge value={received} label="Received" color={received > 0 ? "emerald" : "zinc"} />
          <StatBadge value={opened} label="Opened" color={opened > 0 ? "emerald" : "zinc"} />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="text-zinc-400">
            Open rate: <span className={`font-medium ${openRateColor}`}>{data.openRate5mPct}%</span>
          </div>
          <div className="text-zinc-400">
            Action taps: <span className="font-medium text-zinc-200">{actioned}</span>
          </div>
          <div className="text-zinc-400">
            Action rate: <span className="font-medium text-zinc-200">{data.actionRate5mPct}%</span>
          </div>
        </div>

        {data.byAppType.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">By app type (1h)</p>
            <Table>
              <thead>
                <tr>
                  <Th>App</Th>
                  <Th>Recv</Th>
                  <Th>Open</Th>
                  <Th>Action</Th>
                  <Th>Open %</Th>
                </tr>
              </thead>
              <tbody>
                {data.byAppType.slice(0, kiosk ? 10 : 6).map((row) => (
                  <tr key={row.appType}>
                    <Td className="font-medium text-white">{row.appType}</Td>
                    <Td className="text-zinc-300">{row.received}</Td>
                    <Td className="text-zinc-300">{row.opened}</Td>
                    <Td className="text-zinc-300">{row.actioned}</Td>
                    <Td className={row.openRatePct >= 20 ? "text-emerald-300" : row.openRatePct >= 10 ? "text-amber-300" : "text-zinc-400"}>
                      {row.openRatePct}%
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DEVICE_STATUS_CONFIG = [
  { key: "ONLINE",  cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", activeCls: "border-emerald-400 bg-emerald-500/25 ring-1 ring-emerald-400", icon: Wifi },
  { key: "STALE",   cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",       activeCls: "border-amber-400 bg-amber-500/25 ring-1 ring-amber-400",     icon: Signal },
  { key: "OFFLINE", cls: "border-red-500/30 bg-red-500/10 text-red-300",             activeCls: "border-red-400 bg-red-500/25 ring-1 ring-red-400",           icon: WifiOff },
];

function BusinessFleetCard({ data, kiosk }: { data: OpsWallData["businessFleet"]; kiosk: boolean }) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const offlinePct =
    data.totalDevices > 0
      ? Math.round((data.byOnlineStatus.OFFLINE ?? 0) / data.totalDevices * 100)
      : 0;

  const filteredDevices = statusFilter
    ? (data.devices ?? []).filter(d => d.onlineStatus === statusFilter)
    : (data.devices ?? []);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smartphone size={15} className="text-violet-400" />
          <CardTitle className={kiosk ? "text-lg text-white" : "text-sm text-white"}>Business Devices</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Totals row */}
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-800/50 pb-3">
          <StatBadge value={data.totalDevices} label="Businesses" />
          <StatBadge
            value={data.byOnlineStatus.ONLINE ?? 0}
            label="Online"
            color={(data.byOnlineStatus.ONLINE ?? 0) > 0 ? "emerald" : "zinc"}
          />
          <StatBadge
            value={data.byOnlineStatus.OFFLINE ?? 0}
            label="Offline"
            color={(data.byOnlineStatus.OFFLINE ?? 0) > 0 ? (offlinePct >= 20 ? "red" : "amber") : "zinc"}
          />
        </div>

        {/* Clickable status filter pills */}
        <div className="flex flex-wrap gap-3">
          {DEVICE_STATUS_CONFIG.map(({ key, cls, activeCls, icon: Icon }) => {
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(isActive ? null : key)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${isActive ? activeCls : cls} hover:opacity-90`}
              >
                <Icon size={13} />
                <span>
                  {key} <span className="font-bold">{data.byOnlineStatus[key] ?? 0}</span>
                </span>
              </button>
            );
          })}
          {statusFilter && (
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Platform split */}
        {data.totalDevices > 0 && (
          <div className="flex gap-4 text-sm text-zinc-400">
            <span>
              iOS: <span className="font-medium text-white">{data.byPlatform.ios ?? 0}</span>
            </span>
            <span>
              Android: <span className="font-medium text-white">{data.byPlatform.android ?? 0}</span>
            </span>
          </div>
        )}

        {/* Filtered device table */}
        {filteredDevices.length > 0 && (
          <div>
            {statusFilter && (
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                {statusFilter} Devices ({filteredDevices.length})
              </p>
            )}
            <Table>
              <thead>
                <tr>
                  <Th>Business</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                  <Th>Batt</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.slice(0, kiosk ? 15 : 8).map((d) => {
                  const cfg = DEVICE_STATUS_CONFIG.find(c => c.key === d.onlineStatus);
                  return (
                  <tr key={`${d.businessId}-${d.deviceId}`}>
                    <Td>
                      <span className="font-medium text-white">{d.businessName}</span>
                      {!d.subscriptionAlive && (
                        <WifiOff size={11} className="ml-1.5 inline text-zinc-500" aria-label="Subscription dead" />
                      )}
                    </Td>
                    <Td className="text-zinc-400">{d.businessPhoneNumber ?? <span className="text-zinc-600">–</span>}</Td>
                    <Td>
                      {cfg && (
                        <span className={`text-xs font-medium ${cfg.cls.split(" ").find(c => c.startsWith("text-"))}`}>
                          {d.onlineStatus}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {d.batteryLevel != null ? (
                        <span className={d.batteryLevel < 20 ? "text-red-300" : "text-zinc-300"}>
                          {d.batteryLevel}%
                        </span>
                      ) : (
                        <span className="text-zinc-600">–</span>
                      )}
                    </Td>
                    <Td className="text-zinc-400">{formatRelativeTime(d.lastHeartbeatAt)}</Td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        {/* App version spread */}
        {Object.keys(data.byAppVersion).length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">App Versions</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.byAppVersion)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([version, count]) => (
                  <div key={version} className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                    v{version} <span className="font-medium text-white">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "Customers", color: "text-sky-400" },
  DRIVER: { label: "Drivers", color: "text-emerald-400" },
  BUSINESS_OWNER: { label: "Business Owners", color: "text-amber-400" },
  BUSINESS_EMPLOYEE: { label: "Business Staff", color: "text-amber-300" },
  ADMIN: { label: "Admins", color: "text-violet-400" },
  SUPER_ADMIN: { label: "Super Admins", color: "text-violet-400" },
  anonymous: { label: "Unauthenticated", color: "text-zinc-500" },
};

const FLAG_COLORS: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-300",
  PREPARING: "text-blue-300",
  READY: "text-emerald-300",
  OUT_FOR_DELIVERY: "text-violet-300",
};

function WhoIsOnlineCard({
  liveUsers,
  kiosk,
}: {
  liveUsers: LiveUser[];
  kiosk: boolean;
}) {
  const customerUsers = liveUsers.filter((u) => u.role === "CUSTOMER");
  const total = customerUsers.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Signal size={15} className="text-sky-400" />
          <CardTitle className={kiosk ? "text-lg text-white" : "text-sm text-white"}>
            Who&apos;s Online
          </CardTitle>
          <span className="ml-auto rounded-full bg-sky-900/40 px-2 py-0.5 text-xs font-medium text-sky-300">
            {total}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 ? (
          <p className="text-sm text-zinc-500">No active customers right now.</p>
        ) : null}

        {/* Per-user detail table */}
        {customerUsers.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th></Th>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Phone</Th>
                  <Th>Address</Th>
                  <Th>Active Order</Th>
                  <Th>Connected</Th>
                </tr>
              </thead>
              <tbody>
                {customerUsers.slice(0, kiosk ? 15 : 10).map((u) => {
                  const meta = ROLE_META[u.role] ?? { label: u.role, color: "text-zinc-400" };
                  const flagClass = FLAG_COLORS[u.flagColor ?? "yellow"] ?? "bg-yellow-400";
                  const connectedMinsAgo = u.connectedSince
                    ? Math.floor((Date.now() - u.connectedSince) / 60_000)
                    : null;
                  return (
                    <tr key={u.userId}>
                      <Td>
                        <span className={`inline-block h-2 w-2 rounded-full ${flagClass}`} aria-label={`Flag: ${u.flagColor}`} />
                      </Td>
                      <Td>
                        <span className="font-medium text-white">{u.name || "—"}</span>
                        {u.adminNote && (
                          <p className="mt-0.5 truncate text-xs text-amber-300/70" title={u.adminNote}>
                            {u.adminNote}
                          </p>
                        )}
                      </Td>
                      <Td>
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </Td>
                      <Td>
                        <span className="font-mono text-sm text-zinc-200">{u.phoneNumber ?? "—"}</span>
                      </Td>
                      <Td>
                        <span className="max-w-[160px] truncate text-xs text-zinc-300" title={u.address ?? undefined}>
                          {u.address ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        {u.activeOrder ? (
                          <div>
                            <span className={`text-xs font-bold ${ORDER_STATUS_COLORS[u.activeOrder.status] ?? "text-zinc-300"}`}>
                              #{u.activeOrder.displayId}
                            </span>
                            <span className="ml-1 text-xs text-zinc-500">{u.activeOrder.status}</span>
                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-zinc-400" title={u.activeOrder.dropoffAddress}>
                              {u.activeOrder.dropoffAddress}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </Td>
                      <Td>
                        <span className="text-xs text-zinc-500">
                          {connectedMinsAgo === null ? "—" : connectedMinsAgo < 1 ? "Just now" : `${connectedMinsAgo}m ago`}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RealtimeFeedCard({ data, kiosk }: { data: OpsWallData["realtime"]; kiosk: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Radio size={15} className="text-violet-400" />
          <CardTitle className={kiosk ? "text-lg text-white" : "text-sm text-white"}>
            Realtime
          </CardTitle>
          <Badge variant={data.status === "healthy" ? "success" : "warning"} className="ml-auto">
            {data.status === "healthy" ? "Healthy" : "Attention"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact stat strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <PlugZap size={12} />
            <span>Connections</span>
            <span className="font-semibold text-zinc-100">{data.activeConnections}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Radio size={12} />
            <span>Subs</span>
            <span className="font-semibold text-zinc-100">{data.activeSubscriptions}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Signal size={12} />
            <span>Rejected</span>
            <span className={`font-semibold ${data.totalRejectedSubscriptions > 0 ? "text-amber-400" : "text-zinc-500"}`}>
              {data.totalRejectedSubscriptions}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <AlertTriangle size={12} />
            <span>Errors</span>
            <span className={`font-semibold ${data.totalSubscriptionErrors > 0 ? "text-red-400" : "text-zinc-500"}`}>
              {data.totalSubscriptionErrors}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Activity size={12} />
            <span>Pubsub fail</span>
            <span className={`font-semibold ${data.totalPubsubFailures > 0 ? "text-red-400" : "text-zinc-500"}`}>
              {data.totalPubsubFailures}
            </span>
          </div>
        </div>

        {/* Recent events */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Recent Events</p>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-zinc-800/60">
            {data.recentEvents.length === 0 ? (
              <div className="px-4 py-3 text-sm text-zinc-500">No events yet.</div>
            ) : (
              data.recentEvents.slice(0, kiosk ? 20 : 10).map((evt, idx) => (
                <div
                  key={`${evt.at}-${idx}`}
                  className={`flex items-start gap-3 border-b border-zinc-800/50 px-3 py-2 text-xs last:border-0 ${
                    evt.level === "error"
                      ? "bg-red-500/5"
                      : evt.level === "warn"
                        ? "bg-amber-500/5"
                        : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
                      evt.level === "error"
                        ? "bg-red-500/20 text-red-300"
                        : evt.level === "warn"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {evt.type}
                  </span>
                  <span className="flex-1 text-zinc-300">{evt.detail}</span>
                  <span className="shrink-0 text-zinc-600">{formatRelativeTime(evt.at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function OpsWallPage() {
  const [data, setData] = useState<OpsWallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kioskMode, setKioskMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [clock, setClock] = useState(new Date());
  const prevSloRef = useRef<"ok" | "degraded" | "critical" | null>(null);

  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    else setRefreshing(true);

    try {
      const fresh = await fetchOpsWallData();
      setData(fresh);
      setError(null);

      // Play chime if overall SLO worsened
      if (!muted && prevSloRef.current !== null) {
        const order: Record<string, number> = { ok: 0, degraded: 1, critical: 2 };
        if ((order[fresh.sloStatus] ?? 0) > (order[prevSloRef.current] ?? 0)) {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(fresh.sloStatus === "critical" ? 440 : 600, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
          } catch {
            // AudioContext not available — silent fail
          }
        }
      }

      prevSloRef.current = fresh.sloStatus;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ops wall data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [muted]);

  // Initial + polling
  useEffect(() => {
    void loadData(false);
    const id = window.setInterval(() => void loadData(true), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loadData]);

  // Clock tick
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ESC exits kiosk mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && kioskMode) setKioskMode(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [kioskMode]);

  const slos = data ? computeSlos(data) : null;
  const overallBadgeVariant =
    data?.sloStatus === "critical" ? "destructive" : data?.sloStatus === "degraded" ? "warning" : "success";

  const wrapperCls = kioskMode
    ? "fixed inset-0 z-50 overflow-auto bg-[#09090b] p-6 flex flex-col gap-5"
    : "space-y-5";

  return (
    <div className={wrapperCls}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Monitor size={18} className="text-violet-400" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-semibold text-white ${kioskMode ? "text-xl" : "text-lg"}`}>Ops Wall</h1>
              {data && (
                <Badge variant={overallBadgeVariant}>
                  {data.sloStatus === "ok" ? "All good" : data.sloStatus === "degraded" ? "Degraded" : "Critical"}
                </Badge>
              )}
            </div>
          </div>
          {kioskMode && (
            <div className="ml-4 font-mono text-2xl font-light text-zinc-300">{formatClock(clock)}</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data && (
            <span className="text-xs text-zinc-500">
              Updated {formatRelativeTime(data.timestamp)}
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute alerts" : "Mute alerts"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </Button>
          <Button
            variant="outline"
            onClick={() => setKioskMode((k) => !k)}
            title={kioskMode ? "Exit wall mode (Esc)" : "Enter wall mode"}
          >
            {kioskMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {kioskMode ? "Exit wall" : "Wall mode"}
          </Button>
        </div>
      </div>

      {/* ── SLO strip ───────────────────────────────────────────── */}
      {slos && (
        <div className="flex flex-wrap gap-2">
          <SloIndicator label="API" status={slos.apiSlo} icon={PlugZap} />
          <SloIndicator label="Realtime" status={slos.realtimeSlo} icon={Radio} />
          <SloIndicator label="Drivers" status={slos.driverSlo} icon={Truck} />
          <SloIndicator label="Businesses" status={slos.businessSlo} icon={Smartphone} />
          <SloIndicator label="Orders" status={slos.orderSlo} icon={Package} />
        </div>
      )}

      {/* ── Error / loading state ─────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {loading && !data && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-400">
          Loading ops wall data…
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────────── */}
      {data && (
        <>
          {/* Row 1: Driver Fleet | Who's Online | Business Devices */}
          <div className={`grid gap-5 ${kioskMode ? "grid-cols-3" : "grid-cols-1 xl:grid-cols-3"}`}>
            <DriverFleetCard data={data.driverFleet} kiosk={kioskMode} />
            <WhoIsOnlineCard liveUsers={data.liveUsers ?? []} kiosk={kioskMode} />
            <BusinessFleetCard data={data.businessFleet} kiosk={kioskMode} />
          </div>

          {/* Row 2: Order Pipeline | Push Health */}
          <div className={`grid gap-5 ${kioskMode ? "grid-cols-2" : "grid-cols-1 xl:grid-cols-2"}`}>
            <OrderPipelineCard data={data.orderPipeline} kiosk={kioskMode} />
            <PushHealthCard data={data.pushHealth} kiosk={kioskMode} />
          </div>

          {/* ── Realtime feed ──────────────────────────────────── */}
          <RealtimeFeedCard data={data.realtime} kiosk={kioskMode} />
        </>
      )}

      {/* ── Kiosk footer note ─────────────────────────────────── */}
      {kioskMode && (
        <p className="mt-auto pt-2 text-center text-xs text-zinc-700">
          Press <kbd className="rounded border border-zinc-700 px-1 font-mono">Esc</kbd> to exit wall mode
          · Auto-refresh every {POLL_INTERVAL_MS / 1000}s
        </p>
      )}
    </div>
  );
}
