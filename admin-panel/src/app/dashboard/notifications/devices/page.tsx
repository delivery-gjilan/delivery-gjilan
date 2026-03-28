"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Activity, Battery, Plug, Router, Wifi } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/Table";
import { GET_BUSINESS_DEVICE_HEALTH } from "@/graphql/operations/notifications";
import { GET_BUSINESSES } from "@/graphql/operations/businesses/queries";

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

interface BusinessItem { id: string; name: string; }

const STATUS_PRIORITY: Record<string, number> = { OFFLINE: 0, STALE: 1, ONLINE: 2 };

function statusPill(status: "ONLINE" | "STALE" | "OFFLINE") {
  if (status === "ONLINE") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (status === "STALE") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
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

  const { data: bizData } = useQuery<{ businesses: BusinessItem[] }>(GET_BUSINESSES, {
    fetchPolicy: "cache-and-network",
  });

  const bizNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of (bizData?.businesses ?? [])) map[b.id] = b.name;
    return map;
  }, [bizData]);

  // Deduplicate to 1 row per business — pick the most recent heartbeat
  const rows = useMemo(() => {
    const all = data?.businessDeviceHealth ?? [];
    const byBiz: Record<string, BusinessDeviceHealthRow> = {};
    for (const row of all) {
      const existing = byBiz[row.businessId];
      if (!existing || new Date(row.lastHeartbeatAt) > new Date(existing.lastHeartbeatAt)) {
        byBiz[row.businessId] = row;
      }
    }
    return Object.values(byBiz).sort(
      (a, b) => (STATUS_PRIORITY[a.onlineStatus] ?? 0) - (STATUS_PRIORITY[b.onlineStatus] ?? 0)
    );
  }, [data]);

  const onlineCount = rows.filter((r) => r.onlineStatus === "ONLINE").length;
  const staleCount = rows.filter((r) => r.onlineStatus === "STALE").length;
  const offlineCount = rows.filter((r) => r.onlineStatus === "OFFLINE").length;

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
            <span className="text-xs uppercase tracking-wider">Businesses</span>
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
            {loading ? "Refreshing..." : `${rows.length} businesses`}
          </span>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Status</Th>
              <Th>Business</Th>
              <Th>Platform</Th>
              <Th>Battery</Th>
              <Th>Network</Th>
              <Th>App State</Th>
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
                <tr key={row.businessId}>
                  <Td>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusPill(row.onlineStatus)}`}>
                      {row.onlineStatus}
                    </span>
                  </Td>
                  <Td>
                    <div className="font-medium text-white">
                      {bizNameById[row.businessId] ?? <span className="font-mono text-xs text-zinc-500">{row.businessId}</span>}
                    </div>
                  </Td>
                  <Td>{row.platform}{row.appVersion ? ` v${row.appVersion}` : ""}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span>{row.batteryLevel != null ? `${row.batteryLevel}%` : "—"}</span>
                      {row.isCharging && <Plug size={12} className="text-emerald-300" />}
                    </div>
                  </Td>
                  <Td>{row.networkType ?? "—"}</Td>
                  <Td>{row.appState ?? "—"}</Td>
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
                  <Td>{row.lastOrderSignalAt ? new Date(row.lastOrderSignalAt).toLocaleString() : "—"}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
