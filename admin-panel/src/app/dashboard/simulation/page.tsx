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
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import { ALL_ORDERS_SUBSCRIPTION } from "@/graphql/operations/orders/subscriptions";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Play, Pause, SkipForward, RotateCcw, Truck, Package,
  MapPin, Clock, Zap, ChevronRight, Terminal, Signal,
  Navigation, CheckCircle2, AlertCircle, Gauge,
} from "lucide-react";
import { OrderStatus } from "@/gql/graphql";

// ─── Gjilan Predefined Routes ────────────────────────────────────────────────

type Waypoint = { lat: number; lng: number; label?: string };

const GJILAN_CENTER = { lat: 42.4635, lng: 21.4694 };

const PREDEFINED_ROUTES: { name: string; description: string; waypoints: Waypoint[] }[] = [
  {
    name: "City Center → South Residential",
    description: "Restaurant pickup from center, deliver south",
    waypoints: [
      { lat: 42.4635, lng: 21.4694, label: "Start (City Center)" },
      { lat: 42.4625, lng: 21.4700 },
      { lat: 42.4610, lng: 21.4710 },
      { lat: 42.4595, lng: 21.4705 },
      { lat: 42.4580, lng: 21.4698 },
      { lat: 42.4565, lng: 21.4690 },
      { lat: 42.4550, lng: 21.4685, label: "Business (Pickup)" },
      { lat: 42.4540, lng: 21.4678 },
      { lat: 42.4528, lng: 21.4665 },
      { lat: 42.4515, lng: 21.4650 },
      { lat: 42.4500, lng: 21.4640, label: "Customer (Dropoff)" },
    ],
  },
  {
    name: "East → West Cross-City",
    description: "Cross-city delivery through main streets",
    waypoints: [
      { lat: 42.4640, lng: 21.4780, label: "Start (East)" },
      { lat: 42.4642, lng: 21.4760 },
      { lat: 42.4645, lng: 21.4740 },
      { lat: 42.4643, lng: 21.4720 },
      { lat: 42.4640, lng: 21.4700, label: "Business (Pickup)" },
      { lat: 42.4638, lng: 21.4680 },
      { lat: 42.4635, lng: 21.4660 },
      { lat: 42.4633, lng: 21.4640 },
      { lat: 42.4630, lng: 21.4620 },
      { lat: 42.4628, lng: 21.4600, label: "Customer (Dropoff)" },
    ],
  },
  {
    name: "North Loop (Short)",
    description: "Quick nearby delivery",
    waypoints: [
      { lat: 42.4660, lng: 21.4690, label: "Start" },
      { lat: 42.4670, lng: 21.4700 },
      { lat: 42.4675, lng: 21.4710, label: "Business (Pickup)" },
      { lat: 42.4670, lng: 21.4720 },
      { lat: 42.4665, lng: 21.4715, label: "Customer (Dropoff)" },
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

interface OrderItem {
  id: string;
  displayId?: string;
  status: string;
  driver?: { id: string; firstName: string; lastName: string } | null;
  dropOffLocation?: { latitude: number; longitude: number; address?: string };
  businesses?: { business: { id: string; name: string; location?: { latitude: number; longitude: number } } }[];
}

interface LogEntry {
  id: number;
  time: string;
  type: "action" | "success" | "error" | "info";
  message: string;
}

type SimPhase = "idle" | "to_pickup" | "at_pickup" | "to_dropoff" | "at_dropoff";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function interpolateWaypoints(waypoints: Waypoint[], steps: number): Waypoint[] {
  if (waypoints.length < 2) return waypoints;
  const result: Waypoint[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const segSteps = Math.max(1, Math.round(steps / (waypoints.length - 1)));
    for (let s = 0; s < segSteps; s++) {
      const t = s / segSteps;
      result.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
        label: s === 0 ? a.label : undefined,
      });
    }
  }
  result.push(waypoints[waypoints.length - 1]);
  return result;
}

function distanceMeters(a: Waypoint, b: Waypoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateEtaSeconds(points: Waypoint[], currentIdx: number, speedKmh = 30): number {
  let totalMeters = 0;
  for (let i = currentIdx; i < points.length - 1; i++) {
    totalMeters += distanceMeters(points[i], points[i + 1]);
  }
  return Math.ceil(totalMeters / ((speedKmh * 1000) / 3600));
}

const CONNECTION_STATUS_COLORS: Record<string, { badge: "success" | "warning" | "danger" | "secondary"; label: string }> = {
  CONNECTED: { badge: "success", label: "Connected" },
  STALE: { badge: "warning", label: "Stale" },
  LOST: { badge: "danger", label: "Lost" },
  DISCONNECTED: { badge: "secondary", label: "Disconnected" },
};

const ORDER_STATUS_BADGES: Record<string, "warning" | "default" | "success" | "danger" | "secondary"> = {
  PENDING: "warning",
  PREPARING: "default",
  READY: "default",
  OUT_FOR_DELIVERY: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function SimulationPage() {
  // --- Driver data ---
  const { data: driversData, loading: driversLoading } = useQuery(DRIVERS_QUERY);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  useEffect(() => {
    if (driversData?.drivers) {
      setDrivers(driversData.drivers as DriverItem[]);
    }
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

  // --- Orders data ---
  const { data: ordersData, refetch: refetchOrders } = useQuery(GET_ORDERS);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  useEffect(() => {
    if (ordersData?.orders) {
      setOrders(ordersData.orders as OrderItem[]);
    }
  }, [ordersData?.orders]);

  useSubscription(ALL_ORDERS_SUBSCRIPTION, {
    onData: ({ data: subData }) => {
      const incoming = subData.data?.allOrdersUpdated as OrderItem[] | undefined;
      if (!incoming?.length) return;
      setOrders((prev) => {
        const byId = new Map(prev.map((o) => [o.id, o]));
        incoming.forEach((o) => byId.set(o.id, { ...byId.get(o.id), ...o }));
        return Array.from(byId.values());
      });
    },
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  // --- Mutations ---
  const [simulateHeartbeat] = useMutation(ADMIN_SIMULATE_DRIVER_HEARTBEAT);
  const [createTestOrder, { loading: creatingOrder }] = useMutation(CREATE_TEST_ORDER);
  const [assignDriver] = useMutation(ASSIGN_DRIVER_TO_ORDER);
  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
  const [startPreparing] = useMutation(START_PREPARING);

  // --- Event log ---
  const logIdRef = useRef(0);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    const entry: LogEntry = {
      id: ++logIdRef.current,
      time: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setEventLog((prev) => [entry, ...prev].slice(0, 200));
  }, []);

  // --- Route simulation ---
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [simPhase, setSimPhase] = useState<SimPhase>("idle");
  const [simRunning, setSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [simProgress, setSimProgress] = useState(0); // index into interpolated points
  const [interpolatedPoints, setInterpolatedPoints] = useState<Waypoint[]>([]);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simPhaseRef = useRef<SimPhase>("idle");

  // Determine which half of the route is to_pickup vs to_dropoff
  const route = PREDEFINED_ROUTES[selectedRouteIdx];
  const pickupIdx = Math.floor((route.waypoints.length - 1) / 2);

  useEffect(() => {
    const pts = interpolateWaypoints(route.waypoints, 60);
    setInterpolatedPoints(pts);
    setSimProgress(0);
    setSimPhase("idle");
    simPhaseRef.current = "idle";
  }, [selectedRouteIdx]);

  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setSimRunning(false);
  }, []);

  const sendHeartbeatAtIndex = useCallback(
    async (idx: number, points: Waypoint[], navPhase: SimPhase, orderId?: string) => {
      if (!selectedDriverId) return;
      const pt = points[idx];
      if (!pt) return;

      const etaSec = navPhase === "to_pickup" || navPhase === "to_dropoff"
        ? estimateEtaSeconds(points, idx)
        : undefined;

      try {
        await simulateHeartbeat({
          variables: {
            driverId: selectedDriverId,
            latitude: pt.lat,
            longitude: pt.lng,
            activeOrderId: orderId || selectedOrderId || undefined,
            navigationPhase: navPhase === "idle" ? undefined : navPhase,
            remainingEtaSeconds: etaSec,
          },
        });
      } catch (err: any) {
        addLog("error", `Heartbeat failed: ${err.message}`);
      }
    },
    [selectedDriverId, selectedOrderId, simulateHeartbeat, addLog]
  );

  const startSimulation = useCallback(() => {
    if (!selectedDriverId) {
      addLog("error", "Select a driver first");
      return;
    }
    if (interpolatedPoints.length === 0) return;

    setSimRunning(true);
    setSimProgress(0);
    setSimPhase("to_pickup");
    simPhaseRef.current = "to_pickup";
    addLog("action", `Simulation started on route: ${route.name} (${simSpeed}x speed)`);

    // Determine the interpolated index for the pickup point
    const totalPts = interpolatedPoints.length;
    const pickupProgress = Math.floor(totalPts * (pickupIdx / (route.waypoints.length - 1)));

    let currentIdx = 0;

    const interval = setInterval(async () => {
      if (currentIdx >= totalPts) {
        clearInterval(interval);
        simIntervalRef.current = null;
        setSimRunning(false);
        setSimPhase("at_dropoff");
        simPhaseRef.current = "at_dropoff";
        addLog("success", "Simulation completed — arrived at dropoff");
        return;
      }

      let phase = simPhaseRef.current;
      if (currentIdx < pickupProgress) {
        phase = "to_pickup";
      } else if (currentIdx === pickupProgress) {
        phase = "at_pickup";
        if (simPhaseRef.current !== "at_pickup") {
          addLog("info", "Arrived at business (pickup point)");
        }
      } else {
        phase = "to_dropoff";
      }

      simPhaseRef.current = phase;
      setSimPhase(phase);
      setSimProgress(currentIdx);

      await sendHeartbeatAtIndex(currentIdx, interpolatedPoints, phase, selectedOrderId || undefined);

      currentIdx++;
    }, 1000 / simSpeed);

    simIntervalRef.current = interval;
  }, [
    selectedDriverId,
    interpolatedPoints,
    route,
    pickupIdx,
    simSpeed,
    selectedOrderId,
    sendHeartbeatAtIndex,
    addLog,
  ]);

  const toggleSimulation = useCallback(() => {
    if (simRunning) {
      stopSimulation();
      addLog("info", "Simulation paused");
    } else if (simProgress > 0 && simProgress < interpolatedPoints.length) {
      // Resume from current position
      setSimRunning(true);
      addLog("info", "Simulation resumed");

      const totalPts = interpolatedPoints.length;
      const pickupProgress = Math.floor(totalPts * (pickupIdx / (route.waypoints.length - 1)));
      let currentIdx = simProgress;

      const interval = setInterval(async () => {
        if (currentIdx >= totalPts) {
          clearInterval(interval);
          simIntervalRef.current = null;
          setSimRunning(false);
          setSimPhase("at_dropoff");
          simPhaseRef.current = "at_dropoff";
          addLog("success", "Simulation completed — arrived at dropoff");
          return;
        }

        let phase = simPhaseRef.current;
        if (currentIdx < pickupProgress) phase = "to_pickup";
        else if (currentIdx === pickupProgress) {
          phase = "at_pickup";
          if (simPhaseRef.current !== "at_pickup") addLog("info", "Arrived at business");
        } else phase = "to_dropoff";

        simPhaseRef.current = phase;
        setSimPhase(phase);
        setSimProgress(currentIdx);

        await sendHeartbeatAtIndex(currentIdx, interpolatedPoints, phase, selectedOrderId || undefined);
        currentIdx++;
      }, 1000 / simSpeed);

      simIntervalRef.current = interval;
    } else {
      startSimulation();
    }
  }, [simRunning, simProgress, interpolatedPoints, stopSimulation, startSimulation, pickupIdx, route, simSpeed, selectedOrderId, sendHeartbeatAtIndex, addLog]);

  // Cleanup interval on unmount
  useEffect(() => () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); }, []);

  // --- Action handlers ---

  const handleCreateTestOrder = async () => {
    try {
      addLog("action", "Creating test order...");
      const { data } = await createTestOrder();
      if (data?.createTestOrder) {
        const o = data.createTestOrder;
        addLog("success", `Test order created: #${o.id.slice(0, 8)} — ${o.businesses?.map((b: any) => b.business.name).join(", ")}`);
        refetchOrders();
      }
    } catch (err: any) {
      addLog("error", `Create test order failed: ${err.message}`);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedOrderId || !selectedDriverId) {
      addLog("error", "Select both an order and a driver");
      return;
    }
    try {
      addLog("action", `Assigning driver ${selectedDriver?.firstName} to order ${selectedOrderId.slice(0, 8)}...`);
      await assignDriver({ variables: { id: selectedOrderId, driverId: selectedDriverId } });
      addLog("success", "Driver assigned to order");
      refetchOrders();
    } catch (err: any) {
      addLog("error", `Assign failed: ${err.message}`);
    }
  };

  const handleStartPreparing = async () => {
    if (!selectedOrderId) return;
    try {
      addLog("action", "Starting preparation (5 min)...");
      await startPreparing({ variables: { id: selectedOrderId, preparationMinutes: 5 } });
      addLog("success", "Order is now PREPARING");
      refetchOrders();
    } catch (err: any) {
      addLog("error", `Start preparing failed: ${err.message}`);
    }
  };

  const handleStatusTransition = async (status: OrderStatus) => {
    if (!selectedOrderId) return;
    try {
      addLog("action", `Updating order status to ${status}...`);
      await updateOrderStatus({ variables: { id: selectedOrderId, status } });
      addLog("success", `Order status → ${status}`);
      refetchOrders();
    } catch (err: any) {
      addLog("error", `Status update failed: ${err.message}`);
    }
  };

  const handleSingleHeartbeat = async () => {
    if (!selectedDriverId) {
      addLog("error", "Select a driver first");
      return;
    }
    const loc = selectedDriver?.driverLocation;
    const lat = loc?.latitude ?? GJILAN_CENTER.lat;
    const lng = loc?.longitude ?? GJILAN_CENTER.lng;
    try {
      addLog("action", `Sending single heartbeat at (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      await simulateHeartbeat({
        variables: {
          driverId: selectedDriverId,
          latitude: lat,
          longitude: lng,
          activeOrderId: selectedOrderId || undefined,
          navigationPhase: simPhase === "idle" ? undefined : simPhase,
        },
      });
      addLog("success", "Heartbeat sent");
    } catch (err: any) {
      addLog("error", `Heartbeat failed: ${err.message}`);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <Zap size={24} className="text-violet-400" />
            Driver Simulation
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Test driver movement, order lifecycle, and real-time updates
          </p>
        </div>
        <Badge variant={simRunning ? "success" : "secondary"}>
          {simRunning ? "Simulation Running" : "Idle"}
        </Badge>
      </div>

      {/* Top row: Driver + Order selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Driver Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck size={16} className="text-violet-400" />
              Driver
            </CardTitle>
            <CardDescription>Select a driver to simulate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
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
                  <span className="text-zinc-400">Status</span>
                  <Badge variant={CONNECTION_STATUS_COLORS[selectedDriver.driverConnection?.connectionStatus ?? "DISCONNECTED"]?.badge ?? "secondary"}>
                    {selectedDriver.driverConnection?.connectionStatus ?? "DISCONNECTED"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Location</span>
                  <span className="text-zinc-300 font-mono">
                    {selectedDriver.driverLocation
                      ? `${selectedDriver.driverLocation.latitude.toFixed(4)}, ${selectedDriver.driverLocation.longitude.toFixed(4)}`
                      : "No location"}
                  </span>
                </div>
                {selectedDriver.driverConnection?.activeOrderId && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Active Order</span>
                    <span className="text-zinc-300 font-mono">{selectedDriver.driverConnection.activeOrderId.slice(0, 8)}...</span>
                  </div>
                )}
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
              </div>
            )}

            <Button size="sm" variant="outline" onClick={handleSingleHeartbeat} disabled={!selectedDriverId}>
              <Signal size={14} /> Send Single Heartbeat
            </Button>
          </CardContent>
        </Card>

        {/* Order Manager */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package size={16} className="text-violet-400" />
              Order
            </CardTitle>
            <CardDescription>Create or select an order to test</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateTestOrder} disabled={creatingOrder}>
                {creatingOrder ? "Creating..." : "Create Test Order"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => refetchOrders()}>
                Refresh
              </Button>
            </div>

            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            >
              <option value="">— Select Order —</option>
              {activeOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.displayId ?? o.id.slice(0, 8)} — {o.status}
                  {o.driver ? ` (${o.driver.firstName})` : ""}
                  {o.businesses?.[0] ? ` — ${o.businesses[0].business.name}` : ""}
                </option>
              ))}
            </select>

            {selectedOrder && (
              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <Badge variant={ORDER_STATUS_BADGES[selectedOrder.status] ?? "secondary"}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Driver</span>
                  <span className="text-zinc-300">
                    {selectedOrder.driver ? `${selectedOrder.driver.firstName} ${selectedOrder.driver.lastName}` : "Unassigned"}
                  </span>
                </div>
                {selectedOrder.businesses?.[0] && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Business</span>
                    <span className="text-zinc-300">{selectedOrder.businesses[0].business.name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Order lifecycle buttons */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Order Lifecycle</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAssignDriver}
                  disabled={!selectedOrderId || !selectedDriverId}
                >
                  <Truck size={12} /> Assign Driver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartPreparing}
                  disabled={!selectedOrderId}
                >
                  <Clock size={12} /> Start Preparing
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusTransition(OrderStatus.Ready)}
                  disabled={!selectedOrderId}
                >
                  <CheckCircle2 size={12} /> Mark Ready
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusTransition(OrderStatus.OutForDelivery)}
                  disabled={!selectedOrderId}
                >
                  <Navigation size={12} /> Out for Delivery
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleStatusTransition(OrderStatus.Delivered)}
                  disabled={!selectedOrderId}
                >
                  <CheckCircle2 size={12} /> Delivered
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Simulation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation size={16} className="text-violet-400" />
            Route Simulation
          </CardTitle>
          <CardDescription>
            Simulate driver movement along a predefined route. Heartbeats are sent at each waypoint, updating
            the admin map, customer order map, Live Activity, and all real-time subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedRouteIdx}
              onChange={(e) => {
                stopSimulation();
                setSelectedRouteIdx(Number(e.target.value));
              }}
              disabled={simRunning}
              className="flex-1 px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
            >
              {PREDEFINED_ROUTES.map((r, i) => (
                <option key={i} value={i}>
                  {r.name} — {r.description}
                </option>
              ))}
            </select>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={simRunning ? "danger" : "primary"}
              onClick={toggleSimulation}
              disabled={!selectedDriverId}
            >
              {simRunning ? <Pause size={14} /> : <Play size={14} />}
              {simRunning ? "Pause" : simProgress > 0 ? "Resume" : "Start"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                stopSimulation();
                setSimProgress(0);
                setSimPhase("idle");
                simPhaseRef.current = "idle";
                addLog("info", "Simulation reset");
              }}
              disabled={simProgress === 0}
            >
              <RotateCcw size={14} /> Reset
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!selectedDriverId || !interpolatedPoints.length) return;
                const next = Math.min(simProgress + 1, interpolatedPoints.length - 1);
                setSimProgress(next);
                const totalPts = interpolatedPoints.length;
                const pp = Math.floor(totalPts * (pickupIdx / (route.waypoints.length - 1)));
                let phase: SimPhase = next < pp ? "to_pickup" : next === pp ? "at_pickup" : "to_dropoff";
                setSimPhase(phase);
                simPhaseRef.current = phase;
                await sendHeartbeatAtIndex(next, interpolatedPoints, phase, selectedOrderId || undefined);
                addLog("info", `Step → waypoint ${next}/${totalPts - 1}`);
              }}
              disabled={simRunning || !selectedDriverId}
            >
              <SkipForward size={14} /> Step
            </Button>

            {/* Speed selector */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Gauge size={14} className="text-zinc-500" />
              <span className="text-xs text-zinc-500">Speed:</span>
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    simSpeed === s
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => {
                    setSimSpeed(s);
                    if (simRunning) {
                      stopSimulation();
                      addLog("info", `Speed changed to ${s}x — click play to resume`);
                    }
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Progress: {simProgress}/{interpolatedPoints.length - 1}</span>
              <div className="flex items-center gap-2">
                <Badge variant={
                  simPhase === "to_pickup" ? "warning" :
                  simPhase === "at_pickup" ? "default" :
                  simPhase === "to_dropoff" ? "success" :
                  simPhase === "at_dropoff" ? "success" :
                  "secondary"
                }>
                  {simPhase === "idle" ? "Idle" :
                   simPhase === "to_pickup" ? "→ Pickup" :
                   simPhase === "at_pickup" ? "At Pickup" :
                   simPhase === "to_dropoff" ? "→ Dropoff" :
                   "At Dropoff"}
                </Badge>
              </div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${interpolatedPoints.length > 1 ? (simProgress / (interpolatedPoints.length - 1)) * 100 : 0}%` }}
              />
            </div>
            {/* Waypoint labels */}
            <div className="flex justify-between text-[10px] text-zinc-600">
              {route.waypoints.filter((w) => w.label).map((w, i) => (
                <span key={i}>{w.label}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Presets + Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Scenarios */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap size={16} className="text-violet-400" />
              Quick Scenarios
            </CardTitle>
            <CardDescription>Run predefined test sequences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <ScenarioButton
                title="Full Delivery Cycle"
                description="Create order → Assign → Prepare → Ready → OFD → Simulate route → Delivered"
                disabled={!selectedDriverId}
                onClick={async () => {
                  addLog("action", "Starting full delivery cycle scenario...");

                  // 1. Create order
                  const { data: orderData } = await createTestOrder();
                  const order = orderData?.createTestOrder;
                  if (!order) { addLog("error", "Failed to create order"); return; }
                  setSelectedOrderId(order.id);
                  addLog("success", `Order created: #${order.id.slice(0, 8)}`);

                  // 2. Assign driver
                  await assignDriver({ variables: { id: order.id, driverId: selectedDriverId } });
                  addLog("success", "Driver assigned");

                  // 3. Start preparing
                  await startPreparing({ variables: { id: order.id, preparationMinutes: 1 } });
                  addLog("success", "Order PREPARING (1 min)");

                  // 4. Wait 2s, mark ready
                  await new Promise((r) => setTimeout(r, 2000));
                  await updateOrderStatus({ variables: { id: order.id, status: OrderStatus.Ready } });
                  addLog("success", "Order READY");

                  // 5. Mark OFD
                  await updateOrderStatus({ variables: { id: order.id, status: OrderStatus.OutForDelivery } });
                  addLog("success", "Order OUT_FOR_DELIVERY — start route simulation to see movement");

                  refetchOrders();
                }}
              />

              <ScenarioButton
                title="Race-to-Accept Test"
                description="Create order without assigning — tests how pending orders appear to drivers"
                disabled={false}
                onClick={async () => {
                  addLog("action", "Creating unassigned order (race-to-accept)...");
                  const { data } = await createTestOrder();
                  if (data?.createTestOrder) {
                    setSelectedOrderId(data.createTestOrder.id);
                    addLog("success", `Order #${data.createTestOrder.id.slice(0, 8)} created — PENDING, no driver`);
                    refetchOrders();
                  }
                }}
              />

              <ScenarioButton
                title="Dispatch Multi-Order"
                description="Create 3 orders and assign all to the selected driver"
                disabled={!selectedDriverId}
                onClick={async () => {
                  addLog("action", "Creating 3 test orders for dispatch mode...");
                  for (let i = 0; i < 3; i++) {
                    const { data } = await createTestOrder();
                    const order = data?.createTestOrder;
                    if (order) {
                      await assignDriver({ variables: { id: order.id, driverId: selectedDriverId } });
                      addLog("success", `Order #${i + 1} created & assigned: ${order.id.slice(0, 8)}`);
                    } else {
                      addLog("error", `Failed to create order #${i + 1}`);
                    }
                  }
                  addLog("info", "All 3 orders assigned — driver should see multi-order dispatch modal");
                  refetchOrders();
                }}
              />

              <ScenarioButton
                title="ETA < 3 min Notification Test"
                description="Place driver on route at near-dropoff position to trigger ETA_LT_3_MIN auto-notification"
                disabled={!selectedDriverId || !selectedOrderId}
                onClick={async () => {
                  addLog("action", "Simulating near-dropoff position for ETA < 3 min...");
                  const pts = interpolatedPoints;
                  const nearEnd = Math.max(0, pts.length - 3);
                  const pt = pts[nearEnd];
                  if (!pt) { addLog("error", "No route points"); return; }
                  try {
                    await simulateHeartbeat({
                      variables: {
                        driverId: selectedDriverId,
                        latitude: pt.lat,
                        longitude: pt.lng,
                        activeOrderId: selectedOrderId,
                        navigationPhase: "to_dropoff",
                        remainingEtaSeconds: 120,
                      },
                    });
                    addLog("success", "Heartbeat sent with ETA=120s — should trigger ETA_LT_3_MIN notification");
                  } catch (err: any) {
                    addLog("error", `Failed: ${err.message}`);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Log */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal size={16} className="text-violet-400" />
                Event Log
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setEventLog([])}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={logRef}
              className="h-[340px] overflow-y-auto bg-[#09090b] border border-zinc-800 rounded-lg p-3 space-y-1 font-mono text-xs"
            >
              {eventLog.length === 0 ? (
                <p className="text-zinc-600 text-center py-8">No events yet. Start a simulation or run a scenario.</p>
              ) : (
                eventLog.map((entry) => (
                  <div key={entry.id} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">{entry.time}</span>
                    <span className={
                      entry.type === "success" ? "text-emerald-400" :
                      entry.type === "error" ? "text-red-400" :
                      entry.type === "action" ? "text-violet-400" :
                      "text-zinc-400"
                    }>
                      {entry.type === "success" ? "✓" :
                       entry.type === "error" ? "✗" :
                       entry.type === "action" ? "▶" :
                       "ℹ"}
                    </span>
                    <span className="text-zinc-300">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScenarioButton({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const [running, setRunning] = useState(false);

  return (
    <button
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 ${
        disabled || running
          ? "border-zinc-800/50 bg-zinc-900/30 opacity-50 cursor-not-allowed"
          : "border-zinc-800 bg-zinc-900/50 hover:border-violet-500/50 hover:bg-violet-500/5 cursor-pointer"
      }`}
      disabled={disabled || running}
      onClick={async () => {
        setRunning(true);
        try { await onClick(); } finally { setRunning(false); }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-zinc-200">{title}</span>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        {running ? (
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <ChevronRight size={16} className="text-zinc-600" />
        )}
      </div>
    </button>
  );
}
