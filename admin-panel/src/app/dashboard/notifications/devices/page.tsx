"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Activity, Battery, Plug, Router, Wifi } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_BUSINESS_DEVICE_HEALTH } from "@/graphql/operations/notifications";

const HOUR_OPTIONS = [1, 6, 12, 24, 72, 168];

interface BusinessDeviceHealthRow {
  id: string;
  userId: string;
  businessId: string;
  deviceId: string;
  platform: string;
  appVersion?: string | null;
  appState?: string | null;
  networkType?: string | null;
  batteryLevel?: number | null;
  isCharging?: boolean | null;
  subscriptionAlive: boolean;
  lastHeartbeatAt: string;
  lastOrderSignalAt?: string | null;
  lastPushReceivedAt?: string | null;
  lastOrderId?: string | null;
  onlineStatus: "ONLINE" | "STALE" | "OFFLINE";
  receivingOrders: boolean;
}

interface BusinessDeviceHealthData {
  businessDeviceHealth: BusinessDeviceHealthRow[];
}

function statusPill(status: "ONLINE" | "STALE" | "OFFLINE") {
  if (status === "ONLINE") {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }
  if (status === "STALE") {
    return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  }
  return "bg-rose-500/20 text-rose-300 border-rose-500/30";
}

export default function BusinessDevicesTelemetryPage() {
  const [hours, setHours] = useState(24);

  const variables = useMemo(() => ({ hours }), [hours]);
  const { data, loading } = useQuery<BusinessDeviceHealthData>(GET_BUSINESS_DEVICE_HEALTH, {
    variables,
    pollInterval: 15000,
    fetchPolicy: "cache-and-network",
  });

  const rows = data?.businessDeviceHealth ?? [];
  const onlineCount = rows.filter((row) => row.onlineStatus === "ONLINE").length;
  const staleCount = rows.filter((row) => row.onlineStatus === "STALE").length;
  const offlineCount = rows.filter((row) => row.onlineStatus === "OFFLINE").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Tablet Monitor</h1>
          <p className="text-sm text-zinc-400">
            Live health of business-held devices: connectivity, subscription state, battery, and order feed.
          </p>
        </div>

        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>{`Last ${h}h`}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase tracking-wider">Total Devices</span>
            <Activity size={16} />
          </div>
          <div className="text-2xl font-bold text-white">{rows.length}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase tracking-wider">Online</span>
            <Wifi size={16} />
          </div>
          <div className="text-2xl font-bold text-emerald-300">{onlineCount}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase tracking-wider">Stale</span>
            <Router size={16} />
          </div>
          <div className="text-2xl font-bold text-amber-300">{staleCount}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase tracking-wider">Offline</span>
            <Battery size={16} />
          </div>
          <div className="text-2xl font-bold text-rose-300">{offlineCount}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200">Devices</h2>
          <span className="text-xs text-zinc-500">
            {loading ? "Refreshing..." : `${rows.length} devices`}
          </span>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Status</Th>
              <Th>Business</Th>
              <Th>User</Th>
              <Th>Device</Th>
              <Th>Platform</Th>
              <Th>Battery</Th>
              <Th>Subscription</Th>
              <Th>Orders Feed</Th>
              <Th>Last Heartbeat</Th>
              <Th>Last Order Signal</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={10} className="text-zinc-500">No device health data yet.</Td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusPill(row.onlineStatus)}`}>
                      {row.onlineStatus}
                    </span>
                  </Td>
                  <Td className="font-mono text-xs">{row.businessId}</Td>
                  <Td className="font-mono text-xs">{row.userId}</Td>
                  <Td className="font-mono text-xs">{row.deviceId}</Td>
                  <Td>{row.platform}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span>{row.batteryLevel ?? "-"}{row.batteryLevel != null ? "%" : ""}</span>
                      {row.isCharging ? <Plug size={12} className="text-emerald-300" /> : null}
                    </div>
                  </Td>
                  <Td>
                    <span className={row.subscriptionAlive ? "text-emerald-300" : "text-rose-300"}>
                      {row.subscriptionAlive ? "Alive" : "Down"}
                    </span>
                  </Td>
                  <Td>
                    <span className={row.receivingOrders ? "text-emerald-300" : "text-amber-300"}>
                      {row.receivingOrders ? "Receiving" : "No recent signal"}
                    </span>
                  </Td>
                  <Td>{new Date(row.lastHeartbeatAt).toLocaleString()}</Td>
                  <Td>{row.lastOrderSignalAt ? new Date(row.lastOrderSignalAt).toLocaleString() : "-"}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
