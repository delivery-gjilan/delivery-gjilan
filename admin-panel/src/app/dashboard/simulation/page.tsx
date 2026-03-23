"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";
import { DRIVERS_UPDATED_SUBSCRIPTION } from "@/graphql/operations/users/subscriptions";
import {
  ADMIN_SIMULATE_DRIVER_HEARTBEAT,
} from "@/graphql/operations/users/mutations";
import {
  CREATE_TEST_ORDER,
  ASSIGN_DRIVER_TO_ORDER,
  UPDATE_ORDER_STATUS,
  START_PREPARING,
} from "@/graphql/operations/orders";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Play, Truck, Zap, Terminal, Signal,
  Navigation, CheckCircle2, Gauge, Square,
} from "lucide-react";
import { OrderStatus } from "@/gql/graphql";

// ─── Routes ──────────────────────────────────────────────────────────────────

type Pt = { lat: number; lng: number };

const ROUTES: { name: string; toPickup: Pt[]; toDropoff: Pt[] }[] = [
  {
    name: "City Center → South",
    toPickup: [
      { lat: 42.4635, lng: 21.4694 },
      { lat: 42.4628, lng: 21.4698 },
      { lat: 42.4618, lng: 21.4703 },
      { lat: 42.4607, lng: 21.4708 },
      { lat: 42.4595, lng: 21.4705 },
      { lat: 42.4583, lng: 21.4700 },
      { lat: 42.4570, lng: 21.4693 },
      { lat: 42.4558, lng: 21.4688 },
      { lat: 42.4550, lng: 21.4685 },
    ],
    toDropoff: [
      { lat: 42.4550, lng: 21.4685 },
      { lat: 42.4543, lng: 21.4680 },
      { lat: 42.4535, lng: 21.4673 },
      { lat: 42.4527, lng: 21.4665 },
      { lat: 42.4518, lng: 21.4656 },
      { lat: 42.4510, lng: 21.4648 },
      { lat: 42.4504, lng: 21.4643 },
      { lat: 42.4500, lng: 21.4640 },
    ],
  },
  {
    name: "East → West Cross-City",
    toPickup: [
      { lat: 42.4640, lng: 21.4780 },
      { lat: 42.4641, lng: 21.4765 },
      { lat: 42.4643, lng: 21.4748 },
      { lat: 42.4644, lng: 21.4732 },
      { lat: 42.4642, lng: 21.4715 },
      { lat: 42.4640, lng: 21.4700 },
    ],
    toDropoff: [
      { lat: 42.4640, lng: 21.4700 },
      { lat: 42.4639, lng: 21.4683 },
      { lat: 42.4637, lng: 21.4665 },
      { lat: 42.4635, lng: 21.4648 },
      { lat: 42.4633, lng: 21.4630 },
      { lat: 42.4630, lng: 21.4615 },
      { lat: 42.4628, lng: 21.4600 },
    ],
  },
  {
    name: "North Loop (Short)",
    toPickup: [
      { lat: 42.4660, lng: 21.4690 },
      { lat: 42.4665, lng: 21.4695 },
      { lat: 42.4670, lng: 21.4700 },
      { lat: 42.4675, lng: 21.4710 },
    ],
    toDropoff: [
      { lat: 42.4675, lng: 21.4710 },
      { lat: 42.4672, lng: 21.4715 },
      { lat: 42.4668, lng: 21.4718 },
      { lat: 42.4665, lng: 21.4715 },
    ],
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface DriverItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  driverLocation?: { latitude: number; longitude: number; address?: string };
  driverConnection?: {
    onlinePreference: boolean;
    connectionStatus: string;
    lastHeartbeatAt?: string;
    activeOrderId?: string;
    navigationPhase?: string;
    remainingEtaSeconds?: number;
    etaUpdatedAt?: string;
  };
}

interface LogEntry {
  id: number;
  time: string;
  type: "phase" | "action" | "success" | "error" | "info";
  message: string;
}

type AutoPhase =
  | "idle"
  | "warm_up"
  | "creating_order"
  | "assigning_driver"
  | "preparing"
  | "to_pickup"
  | "at_pickup"
  | "to_dropoff"
  | "arriving"
  | "completed";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Densify a polyline by linear interpolation to produce `count` evenly spaced points */
function densify(pts: Pt[], count: number): Pt[] {
  if (pts.length < 2 || count < 2) return pts;
  // compute cumulative distances
  const dists = [0];
  for (let i = 1; i < pts.length; i++) {
    dists.push(dists[i - 1] + haversine(pts[i - 1], pts[i]));
  }
  const totalDist = dists[dists.length - 1];
  const result: Pt[] = [];
  let segIdx = 0;
  for (let i = 0; i < count; i++) {
    const target = (i / (count - 1)) * totalDist;
    while (segIdx < pts.length - 2 && dists[segIdx + 1] < target) segIdx++;
    const segLen = dists[segIdx + 1] - dists[segIdx];
    const t = segLen > 0 ? (target - dists[segIdx]) / segLen : 0;
    result.push({
      lat: pts[segIdx].lat + (pts[segIdx + 1].lat - pts[segIdx].lat) * t,
      lng: pts[segIdx].lng + (pts[segIdx + 1].lng - pts[segIdx].lng) * t,
    });
  }
  return result;
}

function haversine(a: Pt, b: Pt): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sLat = Math.sin(dLat / 2);
  const sLng = Math.sin(dLng / 2);
  const h = sLat * sLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sLng * sLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function etaFromIndex(pts: Pt[], idx: number, speedKmh = 30): number {
  let m = 0;
  for (let i = idx; i < pts.length - 1; i++) m += haversine(pts[i], pts[i + 1]);
  return Math.ceil(m / ((speedKmh * 1000) / 3600));
}

const PHASE_LABELS: Record<AutoPhase, string> = {
  idle: "Idle",
  warm_up: "Warming Up",
  creating_order: "Creating Order",
  assigning_driver: "Assigning Driver",
  preparing: "Preparing",
  to_pickup: "Driving → Pickup",
  at_pickup: "At Pickup",
  to_dropoff: "Driving → Dropoff",
  arriving: "Arriving",
  completed: "Completed",
};

const CONNECTION_BADGES: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  CONNECTED: "success",
  STALE: "warning",
  LOST: "danger",
  DISCONNECTED: "secondary",
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function SimulationPage() {
  // --- Driver data ---
  const { data: driversData } = useQuery(DRIVERS_QUERY);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  useEffect(() => {
    if (driversData?.drivers) setDrivers(driversData.drivers as DriverItem[]);
  }, [driversData?.drivers]);

  useSubscription(DRIVERS_UPDATED_SUBSCRIPTION, {
    onData: ({ data: subData }) => {
      const incoming = subData.data?.driversUpdated as DriverItem[] | undefined;
      if (!incoming?.length) return;
      setDrivers((prev) => {
        const byId = new Map(prev.map((d) => [d.id, d]));
        incoming.forEach((d) => byId.set(d.id, { ...byId.get(d.id), ...d }));
        return Array.from(byId.values());
      });
    },
  });

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  // --- Mutations ---
  const [simulateHeartbeat] = useMutation(ADMIN_SIMULATE_DRIVER_HEARTBEAT);
  const [createTestOrder] = useMutation(CREATE_TEST_ORDER);
  const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
  const [startPreparing] = useMutation(START_PREPARING);

  // --- Config ---
  const [routeIdx, setRouteIdx] = useState(0);
  const [heartbeatMs, setHeartbeatMs] = useState(500);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // --- Simulation state ---
  const [phase, setPhase] = useState<AutoPhase>("idle");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const abortRef = useRef<AbortController | null>(null);

  // --- Event log ---
  const logIdRef = useRef(0);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setEventLog((prev) => [
      { id: ++logIdRef.current, time: new Date().toLocaleTimeString("en-GB"), type, message },
      ...prev,
    ].slice(0, 300));
  }, []);

  const addPhaseLog = useCallback((label: string) => {
    addLog("phase", label);
  }, [addLog]);

  // --- Sleep helper that respects abort ---
  const sleep = useCallback((ms: number, signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
    });
  }, []);

  // --- Core: send one heartbeat ---
  const beat = useCallback(async (
    driverId: string,
    pt: Pt,
    opts?: { orderId?: string; navPhase?: string; eta?: number; setOnline?: boolean },
  ) => {
    await simulateHeartbeat({
      variables: {
        driverId,
        latitude: pt.lat,
        longitude: pt.lng,
        activeOrderId: opts?.orderId,
        navigationPhase: opts?.navPhase,
        remainingEtaSeconds: opts?.eta,
        setOnline: opts?.setOnline,
      },
    });
  }, [simulateHeartbeat]);

  // ─── Full Automated Simulation ──────────────────────────────────────────────

  const runFullSimulation = useCallback(async () => {
    if (!selectedDriverId) { addLog("error", "Select a driver first"); return; }
    const driverId = selectedDriverId;
    const route = ROUTES[routeIdx];
    const ac = new AbortController();
    abortRef.current = ac;
    const sig = ac.signal;

    // Densify routes for smooth movement
    const toPickupPts = densify(route.toPickup, 80 * speedMultiplier);
    const toDropoffPts = densify(route.toDropoff, 120 * speedMultiplier);
    const interval = heartbeatMs / speedMultiplier;

    setRunning(true);
    setEventLog([]);
    logIdRef.current = 0;

    try {
      // ── Phase 1: Warm Up ────────────────────────────────────────────────
      setPhase("warm_up");
      addPhaseLog("━━━ WARM UP ━━━");
      addLog("info", "Setting driver online & sending warm-up heartbeats...");
      const startPt = route.toPickup[0];

      for (let i = 0; i < 5; i++) {
        if (sig.aborted) throw new DOMException("Aborted", "AbortError");
        await beat(driverId, startPt, { setOnline: i === 0 });
        addLog("action", `Warm-up heartbeat ${i + 1}/5`);
        setProgress({ current: i + 1, total: 5, label: "warm up" });
        if (i < 4) await sleep(interval, sig);
      }
      addLog("success", "Driver is online & connected");

      // ── Phase 2: Create Order ───────────────────────────────────────────
      setPhase("creating_order");
      addPhaseLog("━━━ CREATE ORDER ━━━");
      addLog("info", "Creating a test order...");
      await sleep(500, sig);

      const { data: orderData } = await createTestOrder();
      const order = orderData?.createTestOrder;
      if (!order) throw new Error("Failed to create test order");
      const orderId = order.id;
      const bizName = order.businesses?.[0]?.business?.name ?? "Unknown";
      addLog("success", `Order #${orderId.slice(0, 8)} created — ${bizName}`);

      // ── Phase 3: Assign Driver ──────────────────────────────────────────
      setPhase("assigning_driver");
      addPhaseLog("━━━ ASSIGN DRIVER ━━━");
      addLog("info", `Assigning driver to order...`);
      await sleep(800, sig);

      await assignDriver({ variables: { id: orderId, driverId } });
      addLog("success", "Driver assigned");

      // ── Phase 4: Start Preparing ────────────────────────────────────────
      setPhase("preparing");
      addPhaseLog("━━━ PREPARING ━━━");
      addLog("info", "Business starts preparing order (2 min)...");
      await startPreparing({ variables: { id: orderId, preparationMinutes: 2 } });
      addLog("success", "Order is now PREPARING");
      await sleep(1000, sig);

      // ── Phase 5: Drive to Pickup ────────────────────────────────────────
      setPhase("to_pickup");
      addPhaseLog("━━━ DRIVING TO PICKUP ━━━");
      addLog("info", `Sending ${toPickupPts.length} heartbeats along route to business...`);

      // Mark READY halfway through the drive (business marks it ready)
      const readyAtIdx = Math.floor(toPickupPts.length / 2);

      for (let i = 0; i < toPickupPts.length; i++) {
        if (sig.aborted) throw new DOMException("Aborted", "AbortError");
        const eta = etaFromIndex(toPickupPts, i);
        await beat(driverId, toPickupPts[i], {
          orderId,
          navPhase: "to_pickup",
          eta,
        });
        setProgress({ current: i + 1, total: toPickupPts.length, label: "to pickup" });

        if (i === readyAtIdx) {
          addLog("info", "Business marks order READY");
          await updateOrderStatus({ variables: { id: orderId, status: OrderStatus.Ready } });
          addLog("success", "Order → READY");
        }

        if (i % 20 === 0 || i === toPickupPts.length - 1) {
          addLog("action", `To pickup: ${i + 1}/${toPickupPts.length} — ETA ${eta}s`);
        }
        if (i < toPickupPts.length - 1) await sleep(interval, sig);
      }
      addLog("success", "Arrived at business");

      // ── Phase 6: At Pickup — mark OUT_FOR_DELIVERY ──────────────────────
      setPhase("at_pickup");
      addPhaseLog("━━━ AT PICKUP ━━━");
      addLog("info", "Driver picking up order...");

      // Dwell at pickup for a few heartbeats
      const pickupPt = toPickupPts[toPickupPts.length - 1];
      for (let i = 0; i < 4; i++) {
        if (sig.aborted) throw new DOMException("Aborted", "AbortError");
        await beat(driverId, pickupPt, { orderId, navPhase: "to_pickup", eta: 0 });
        if (i < 3) await sleep(interval, sig);
      }

      addLog("info", "Marking order OUT FOR DELIVERY...");
      await updateOrderStatus({ variables: { id: orderId, status: OrderStatus.OutForDelivery } });
      addLog("success", "Order → OUT_FOR_DELIVERY");
      await sleep(500, sig);

      // ── Phase 7: Drive to Dropoff ───────────────────────────────────────
      setPhase("to_dropoff");
      addPhaseLog("━━━ DRIVING TO DROPOFF ━━━");
      addLog("info", `Sending ${toDropoffPts.length} heartbeats along route to customer...`);

      for (let i = 0; i < toDropoffPts.length; i++) {
        if (sig.aborted) throw new DOMException("Aborted", "AbortError");
        const eta = etaFromIndex(toDropoffPts, i);
        await beat(driverId, toDropoffPts[i], {
          orderId,
          navPhase: "to_dropoff",
          eta,
        });
        setProgress({ current: i + 1, total: toDropoffPts.length, label: "to dropoff" });

        if (i % 20 === 0 || i === toDropoffPts.length - 1) {
          addLog("action", `To dropoff: ${i + 1}/${toDropoffPts.length} — ETA ${eta}s`);
        }
        if (i < toDropoffPts.length - 1) await sleep(interval, sig);
      }
      addLog("success", "Arrived at customer");

      // ── Phase 8: Deliver ────────────────────────────────────────────────
      setPhase("arriving");
      addPhaseLog("━━━ DELIVERING ━━━");
      addLog("info", "Driver at dropoff, completing delivery...");

      const dropoffPt = toDropoffPts[toDropoffPts.length - 1];
      for (let i = 0; i < 3; i++) {
        if (sig.aborted) throw new DOMException("Aborted", "AbortError");
        await beat(driverId, dropoffPt, { orderId, navPhase: "to_dropoff", eta: 0 });
        if (i < 2) await sleep(interval, sig);
      }

      await updateOrderStatus({ variables: { id: orderId, status: OrderStatus.Delivered } });
      addLog("success", "Order → DELIVERED");

      // Final heartbeat without order
      await beat(driverId, dropoffPt, {});
      setPhase("completed");
      addPhaseLog("━━━ SIMULATION COMPLETE ━━━");
      addLog("success", `Full delivery cycle finished for order #${orderId.slice(0, 8)}`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        addLog("info", "Simulation cancelled");
        setPhase("idle");
      } else {
        addLog("error", `Simulation failed: ${err instanceof Error ? err.message : String(err)}`);
        setPhase("idle");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [
    selectedDriverId, routeIdx, heartbeatMs, speedMultiplier,
    beat, sleep, addLog, addPhaseLog,
    createTestOrder, assignDriver, startPreparing, updateOrderStatus,
  ]);

  const stopSimulation = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <Zap size={24} className="text-violet-400" />
            Full Delivery Simulation
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            One button — driver goes online, order created, assigned, prepared, picked up, delivered.
          </p>
        </div>
        <Badge variant={running ? "success" : phase === "completed" ? "default" : "secondary"}>
          {PHASE_LABELS[phase]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left Panel: Controls ── */}
        <div className="space-y-4">
          {/* Driver Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck size={16} className="text-violet-400" />
                Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                disabled={running}
                className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
              >
                <option value="">— Select Driver —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} ({d.driverConnection?.connectionStatus ?? "UNKNOWN"})
                  </option>
                ))}
              </select>

              {selectedDriver && (
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Connection</span>
                    <Badge variant={CONNECTION_BADGES[selectedDriver.driverConnection?.connectionStatus ?? "DISCONNECTED"] ?? "secondary"}>
                      {selectedDriver.driverConnection?.connectionStatus ?? "DISCONNECTED"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Online</span>
                    <span className={selectedDriver.driverConnection?.onlinePreference ? "text-emerald-400" : "text-zinc-500"}>
                      {selectedDriver.driverConnection?.onlinePreference ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Position</span>
                    <span className="text-zinc-300 font-mono text-[11px]">
                      {selectedDriver.driverLocation
                        ? `${selectedDriver.driverLocation.latitude.toFixed(4)}, ${selectedDriver.driverLocation.longitude.toFixed(4)}`
                        : "—"}
                    </span>
                  </div>
                  {selectedDriver.driverConnection?.navigationPhase && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Nav Phase</span>
                      <Badge variant="default">{selectedDriver.driverConnection.navigationPhase}</Badge>
                    </div>
                  )}
                  {selectedDriver.driverConnection?.remainingEtaSeconds != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">ETA</span>
                      <span className="text-zinc-300">{Math.ceil(selectedDriver.driverConnection.remainingEtaSeconds / 60)} min</span>
                    </div>
                  )}
                  {selectedDriver.driverConnection?.activeOrderId && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Active Order</span>
                      <span className="text-zinc-300 font-mono text-[11px]">{selectedDriver.driverConnection.activeOrderId.slice(0, 8)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge size={16} className="text-violet-400" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Route</label>
                <select
                  value={routeIdx}
                  onChange={(e) => setRouteIdx(Number(e.target.value))}
                  disabled={running}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
                >
                  {ROUTES.map((r, i) => (
                    <option key={i} value={i}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Heartbeat Interval */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Heartbeat Interval</label>
                <div className="flex gap-1.5">
                  {[200, 500, 1000, 2000].map((ms) => (
                    <button
                      key={ms}
                      disabled={running}
                      className={`flex-1 px-2 py-1.5 text-xs rounded font-medium transition-colors disabled:opacity-50 ${
                        heartbeatMs === ms
                          ? "bg-violet-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                      onClick={() => setHeartbeatMs(ms)}
                    >
                      {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Multiplier */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Speed</label>
                <div className="flex gap-1.5">
                  {[1, 2, 5, 10].map((s) => (
                    <button
                      key={s}
                      disabled={running}
                      className={`flex-1 px-2 py-1.5 text-xs rounded font-medium transition-colors disabled:opacity-50 ${
                        speedMultiplier === s
                          ? "bg-violet-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                      onClick={() => setSpeedMultiplier(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600">
                  Points: {80 * speedMultiplier} to pickup, {120 * speedMultiplier} to dropoff —
                  interval: {Math.round(heartbeatMs / speedMultiplier)}ms
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {!running ? (
                <Button
                  className="w-full h-14 text-base font-semibold"
                  onClick={runFullSimulation}
                  disabled={!selectedDriverId}
                >
                  <Play size={20} />
                  Start Full Simulation
                </Button>
              ) : (
                <Button
                  className="w-full h-14 text-base font-semibold"
                  variant="danger"
                  onClick={stopSimulation}
                >
                  <Square size={20} />
                  Stop Simulation
                </Button>
              )}

              {/* Progress */}
              {(running || phase === "completed") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{PHASE_LABELS[phase]}</span>
                    {progress.total > 0 && (
                      <span>{progress.current}/{progress.total} ({progress.label})</span>
                    )}
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        phase === "completed" ? "bg-emerald-500" : "bg-violet-600"
                      }`}
                      style={{
                        width: progress.total > 0
                          ? `${(progress.current / progress.total) * 100}%`
                          : phase === "completed" ? "100%" : "0%",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Phase steps */}
              <div className="space-y-1">
                {(["warm_up", "creating_order", "assigning_driver", "preparing", "to_pickup", "at_pickup", "to_dropoff", "arriving", "completed"] as AutoPhase[]).map((p) => {
                  const phases: AutoPhase[] = ["warm_up", "creating_order", "assigning_driver", "preparing", "to_pickup", "at_pickup", "to_dropoff", "arriving", "completed"];
                  const currentIdx = phases.indexOf(phase);
                  const thisIdx = phases.indexOf(p);
                  const isDone = phase !== "idle" && thisIdx < currentIdx;
                  const isCurrent = p === phase;
                  return (
                    <div key={p} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                      isCurrent ? "bg-violet-500/10 text-violet-300" :
                      isDone ? "text-emerald-400/70" : "text-zinc-600"
                    }`}>
                      {isDone ? <CheckCircle2 size={12} /> :
                       isCurrent ? <Signal size={12} className="animate-pulse" /> :
                       <div className="w-3 h-3 rounded-full border border-zinc-700" />}
                      <span>{PHASE_LABELS[p]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Panel: Event Log ── */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal size={16} className="text-violet-400" />
                  Live Event Log
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">{eventLog.length} events</span>
                  <Button size="sm" variant="ghost" onClick={() => setEventLog([])}>
                    Clear
                  </Button>
                </div>
              </div>
              <CardDescription>
                Real-time log of every heartbeat, status change, and phase transition.
                Open the Map page side-by-side to see the driver marker move smoothly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={logContainerRef}
                className="h-[680px] overflow-y-auto bg-[#09090b] border border-zinc-800 rounded-lg p-3 space-y-0.5 font-mono text-xs"
              >
                {eventLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-2">
                    <Navigation size={32} className="opacity-30" />
                    <p>Select a driver and click Start Full Simulation</p>
                    <p className="text-[10px] text-zinc-700">
                      The simulation will: set driver online → create order → assign →
                      prepare → drive to pickup → pick up → drive to dropoff → deliver
                    </p>
                  </div>
                ) : (
                  eventLog.map((entry) => (
                    <div key={entry.id} className={`flex gap-2 ${entry.type === "phase" ? "mt-2 mb-1" : ""}`}>
                      <span className="text-zinc-600 shrink-0 w-[60px]">{entry.time}</span>
                      {entry.type === "phase" ? (
                        <span className="text-violet-400 font-bold">{entry.message}</span>
                      ) : (
                        <>
                          <span className={`shrink-0 ${
                            entry.type === "success" ? "text-emerald-400" :
                            entry.type === "error" ? "text-red-400" :
                            entry.type === "action" ? "text-violet-400" :
                            "text-zinc-500"
                          }`}>
                            {entry.type === "success" ? "✓" :
                             entry.type === "error" ? "✗" :
                             entry.type === "action" ? "▶" : "·"}
                          </span>
                          <span className="text-zinc-300">{entry.message}</span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
