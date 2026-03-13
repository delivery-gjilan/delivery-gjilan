"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  GET_PUSH_TELEMETRY_EVENTS,
  GET_PUSH_TELEMETRY_SUMMARY,
} from "@/graphql/operations/notifications";
import { Activity, BellRing, Smartphone, TabletSmartphone } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/Table";

const HOUR_OPTIONS = [1, 6, 12, 24, 72, 168];
const EVENT_OPTIONS = [
  "RECEIVED",
  "OPENED",
  "ACTION_TAPPED",
  "TOKEN_REGISTERED",
  "TOKEN_REFRESHED",
  "TOKEN_UNREGISTERED",
] as const;
const APP_TYPE_OPTIONS = ["CUSTOMER", "DRIVER", "BUSINESS", "ADMIN"] as const;
const PLATFORM_OPTIONS = ["IOS", "ANDROID"] as const;

interface CountBucket {
  key: string;
  count: number;
}

interface PushTelemetrySummaryData {
  pushTelemetrySummary: {
    totalEvents: number;
    byEvent: CountBucket[];
    byAppType: CountBucket[];
    byPlatform: CountBucket[];
  };
}

interface PushTelemetryEventsData {
  pushTelemetryEvents: Array<{
    id: string;
    userId: string;
    appType: string;
    platform: string;
    eventType: string;
    deviceId?: string | null;
    notificationTitle?: string | null;
    notificationBody?: string | null;
    campaignId?: string | null;
    orderId?: string | null;
    actionId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-center justify-between text-zinc-400">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function BucketBar({ title, buckets }: { title: string; buckets: CountBucket[] }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0) || 1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-200">{title}</h3>
      <div className="space-y-2">
        {buckets.length === 0 && <p className="text-xs text-zinc-500">No data for this window.</p>}
        {buckets.map((bucket) => {
          const percent = Math.round((bucket.count / total) * 100);
          return (
            <div key={bucket.key}>
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
                <span>{bucket.key}</span>
                <span>
                  {bucket.count} ({percent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-zinc-800">
                <div
                  className="h-2 rounded bg-cyan-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PushTelemetryPage() {
  const [hours, setHours] = useState(24);
  const [eventType, setEventType] = useState<string>("");
  const [appType, setAppType] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");

  const summaryVariables = useMemo(() => ({ hours }), [hours]);
  const eventsVariables = useMemo(
    () => ({
      hours,
      limit: 200,
      eventType: eventType || null,
      appType: appType || null,
      platform: platform || null,
    }),
    [hours, eventType, appType, platform],
  );

  const { data: summaryData, loading: summaryLoading } = useQuery<PushTelemetrySummaryData>(
    GET_PUSH_TELEMETRY_SUMMARY,
    {
      variables: summaryVariables,
      pollInterval: 15000,
      fetchPolicy: "cache-and-network",
    },
  );

  const { data: eventsData, loading: eventsLoading } = useQuery<PushTelemetryEventsData>(
    GET_PUSH_TELEMETRY_EVENTS,
    {
      variables: eventsVariables,
      pollInterval: 15000,
      fetchPolicy: "cache-and-network",
    },
  );

  const summary = summaryData?.pushTelemetrySummary;
  const events = eventsData?.pushTelemetryEvents ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Push Telemetry Monitor</h1>
          <p className="text-sm text-zinc-400">Live push lifecycle events across customer, driver, business, and admin apps.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>{`Last ${h}h`}</option>
            ))}
          </select>

          <select
            value={appType}
            onChange={(e) => setAppType(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">All apps</option>
            {APP_TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">All platforms</option>
            {PLATFORM_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">All events</option>
            {EVENT_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Total Events"
          value={summary?.totalEvents ?? 0}
          icon={<Activity size={16} />}
        />
        <StatCard
          label="Received"
          value={summary?.byEvent.find((b) => b.key === "RECEIVED")?.count ?? 0}
          icon={<BellRing size={16} />}
        />
        <StatCard
          label="Opened"
          value={summary?.byEvent.find((b) => b.key === "OPENED")?.count ?? 0}
          icon={<Smartphone size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <BucketBar title="By Event Type" buckets={summary?.byEvent ?? []} />
        <BucketBar title="By App Type" buckets={summary?.byAppType ?? []} />
        <BucketBar title="By Platform" buckets={summary?.byPlatform ?? []} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200">Recent Events</h2>
          <span className="text-xs text-zinc-500">
            {summaryLoading || eventsLoading ? "Refreshing..." : `${events.length} events`}
          </span>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Timestamp</Th>
              <Th>Event</Th>
              <Th>App</Th>
              <Th>Platform</Th>
              <Th>User</Th>
              <Th>Title</Th>
              <Th>Context</Th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <Td colSpan={7} className="text-zinc-500">No telemetry events in this filter window.</Td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <Td>{new Date(event.createdAt).toLocaleString()}</Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
                      {event.eventType}
                    </span>
                  </Td>
                  <Td>{event.appType}</Td>
                  <Td>{event.platform === "IOS" ? <TabletSmartphone size={14} /> : <Smartphone size={14} />}</Td>
                  <Td className="font-mono text-xs">{event.userId}</Td>
                  <Td>{event.notificationTitle || "-"}</Td>
                  <Td className="text-xs text-zinc-400">
                    {event.orderId ? `order:${event.orderId}` : ""}
                    {event.campaignId ? `${event.orderId ? " · " : ""}campaign:${event.campaignId}` : ""}
                    {event.actionId ? `${event.orderId || event.campaignId ? " · " : ""}action:${event.actionId}` : ""}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
