"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, PlugZap, Radio, RefreshCw, Signal, Waypoints } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/Table";

type RealtimeEvent = {
  at: string;
  level: "info" | "warn" | "error";
  type:
    | "ws_connect"
    | "ws_disconnect"
    | "subscribe_accept"
    | "subscribe_reject"
    | "subscribe_complete"
    | "subscribe_error"
    | "pubsub_publish_failure";
  socketId?: string;
  operationName?: string;
  topic?: string;
  detail: string;
};

type RealtimeSummary = {
  status: "healthy" | "attention";
  timestamp: string;
  overview: {
    activeConnections: number;
    activeSubscriptions: number;
    totalRejectedSubscriptions: number;
    totalSubscriptionErrors: number;
    totalPubsubFailures: number;
  };
  subscriptionsByOperation: Array<{
    operationName: string;
    active: number;
    totals: {
      accepted: number;
      rejected: number;
      completed: number;
      errored: number;
    };
  }>;
  pubsubByTopic: Array<{
    topic: string;
    published: number;
    failures: number;
  }>;
  recentEvents: RealtimeEvent[];
  explanation: string[];
};

const POLL_INTERVAL_MS = 15000;
const DEFAULT_GRAPHQL_URL = "http://localhost:4000/graphql";
const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || "http://localhost:3100";

function getApiBaseUrl(): string {
  const graphqlUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_GRAPHQL_URL;
  return graphqlUrl.endsWith("/graphql")
    ? graphqlUrl.slice(0, -"/graphql".length)
    : graphqlUrl.replace(/\/$/, "");
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  if (diffMs < 60_000) {
    return "Just now";
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatLocalTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function getStatusCopy(summary: RealtimeSummary | null): { title: string; body: string } {
  if (!summary) {
    return {
      title: "Waiting for realtime data",
      body: "The dashboard will start explaining websocket and pubsub health as soon as the API responds.",
    };
  }

  const { activeConnections, totalSubscriptionErrors, totalPubsubFailures, totalRejectedSubscriptions } = summary.overview;

  if (summary.status === "healthy") {
    return {
      title: "Realtime layer looks stable",
      body: activeConnections > 0
        ? "Connections are active and the API has not recorded subscription or pubsub failures on this process."
        : "No active websocket traffic right now, but this process has not recorded realtime failures.",
    };
  }

  if (totalPubsubFailures > 0) {
    return {
      title: "Pubsub needs attention",
      body: `This process has recorded ${totalPubsubFailures} pubsub publish failure(s). Check Redis bridge connectivity and the recent event stream below.`,
    };
  }

  if (totalSubscriptionErrors > 0) {
    return {
      title: "Subscription runtime errors detected",
      body: `This process has recorded ${totalSubscriptionErrors} subscription lifecycle error(s). Review the recent events table and Grafana alerts for spikes.`,
    };
  }

  return {
    title: "Subscription pressure needs review",
    body: `There have been ${totalRejectedSubscriptions} rejected subscription request(s). This usually means rate limiting or validation failures, not necessarily an outage.`,
  };
}

function getEventBadgeVariant(level: RealtimeEvent["level"]): "secondary" | "warning" | "destructive" {
  if (level === "error") {
    return "destructive";
  }

  if (level === "warn") {
    return "warning";
  }

  return "secondary";
}

function getStatusBadgeVariant(status: RealtimeSummary["status"] | undefined): "success" | "warning" {
  return status === "healthy" ? "success" : "warning";
}

async function fetchRealtimeSummary(): Promise<RealtimeSummary> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const response = await fetch(`${getApiBaseUrl()}/health/realtime`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Realtime endpoint returned ${response.status}`);
  }

  return response.json() as Promise<RealtimeSummary>;
}

export default function RealtimePage() {
  const [summary, setSummary] = useState<RealtimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async (background = false) => {
    if (!background) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await fetchRealtimeSummary();
      setSummary(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load realtime summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary(false);

    const intervalId = window.setInterval(() => {
      void loadSummary(true);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const statusCopy = getStatusCopy(summary);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
              Realtime Operations
            </h1>
            <Badge variant={getStatusBadgeVariant(summary?.status)}>
              {summary?.status === "healthy" ? "Healthy" : "Attention"}
            </Badge>
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-white">Websocket and pubsub health</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            This is the human-readable screen. Use it for quick operational understanding, then open Grafana for alert history, metrics graphs, and deeper drill-down.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void loadSummary(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh now
          </Button>
          <a
            href={`${getApiBaseUrl()}/metrics`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-400 transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-200"
          >
            Open metrics
          </a>
          <a
            href={GRAFANA_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-violet-500"
          >
            Open Grafana
          </a>
        </div>
      </div>

      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-zinc-900/70 to-zinc-950">
        <CardHeader>
          <div className="flex items-center gap-2 text-violet-300">
            {summary?.status === "healthy" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <CardTitle className="text-xl text-white">{statusCopy.title}</CardTitle>
          </div>
          <CardDescription>{statusCopy.body}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-zinc-300">
          <div className="flex flex-wrap items-center gap-4 text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <Clock3 size={14} />
              Last API update: {summary ? formatLocalTime(summary.timestamp) : "Waiting for data"}
            </span>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} />
              Auto-refresh: every 15s
            </span>
          </div>
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
              {error}
            </div>
          ) : null}
          {loading && !summary ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-zinc-400">
              Loading realtime summary from the API.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-zinc-500">
              <PlugZap size={14} /> Active connections
            </CardDescription>
            <CardTitle className="text-3xl text-white">{summary?.overview.activeConnections ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-zinc-500">
              <Radio size={14} /> Active subscriptions
            </CardDescription>
            <CardTitle className="text-3xl text-white">{summary?.overview.activeSubscriptions ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-zinc-500">
              <Signal size={14} /> Rejected subscriptions
            </CardDescription>
            <CardTitle className="text-3xl text-amber-300">{summary?.overview.totalRejectedSubscriptions ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-zinc-500">
              <AlertTriangle size={14} /> Subscription errors
            </CardDescription>
            <CardTitle className="text-3xl text-red-300">{summary?.overview.totalSubscriptionErrors ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 text-zinc-500">
              <Waypoints size={14} /> Pubsub failures
            </CardDescription>
            <CardTitle className="text-3xl text-red-300">{summary?.overview.totalPubsubFailures ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-white">Operator summary</CardTitle>
            <CardDescription>Plain-language guidance generated by the API process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(summary?.explanation ?? []).map((line) => (
              <div key={line} className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
                {line}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-white">How to use this</CardTitle>
            <CardDescription>When to stay here and when to jump into Grafana.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-300">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3">
              Stay on this screen when you want a quick answer to: are subscriptions healthy, are clients connected, and is pubsub failing right now?
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3">
              Open Grafana when you want trend charts, alert history, and metric-based incident detection over time.
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3">
              Open raw metrics when you need to inspect the exact Prometheus counters feeding alert rules and dashboards.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-white">Subscriptions by operation</CardTitle>
            <CardDescription>Which subscription operations are active, rejected, completing, or failing on this process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Operation</Th>
                  <Th>Active</Th>
                  <Th>Accepted</Th>
                  <Th>Rejected</Th>
                  <Th>Errors</Th>
                </tr>
              </thead>
              <tbody>
                {(summary?.subscriptionsByOperation.length ?? 0) > 0 ? (
                  summary?.subscriptionsByOperation.map((operation) => (
                    <tr key={operation.operationName}>
                      <Td className="font-medium text-white">{operation.operationName}</Td>
                      <Td>{operation.active}</Td>
                      <Td>{operation.totals.accepted}</Td>
                      <Td className={operation.totals.rejected > 0 ? "text-amber-300" : "text-zinc-300"}>{operation.totals.rejected}</Td>
                      <Td className={operation.totals.errored > 0 ? "text-red-300" : "text-zinc-300"}>{operation.totals.errored}</Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <Td colSpan={5} className="text-center text-zinc-500">No subscription activity recorded yet.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-white">Pubsub by topic family</CardTitle>
            <CardDescription>Useful for spotting silent channels or failure hotspots across realtime topics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>Topic family</Th>
                  <Th>Published</Th>
                  <Th>Failures</Th>
                </tr>
              </thead>
              <tbody>
                {(summary?.pubsubByTopic.length ?? 0) > 0 ? (
                  summary?.pubsubByTopic.map((topic) => (
                    <tr key={topic.topic}>
                      <Td className="font-medium text-white">{topic.topic}</Td>
                      <Td>{topic.published}</Td>
                      <Td className={topic.failures > 0 ? "text-red-300" : "text-zinc-300"}>{topic.failures}</Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <Td colSpan={3} className="text-center text-zinc-500">No pubsub traffic recorded yet.</Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <Activity size={18} /> Recent realtime events
          </CardTitle>
          <CardDescription>The last 20 events seen by this API process. Use this as the fastest incident timeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Level</Th>
                <Th>Type</Th>
                <Th>Operation / Topic</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {(summary?.recentEvents.length ?? 0) > 0 ? (
                summary?.recentEvents.map((event, index) => (
                  <tr key={`${event.at}-${event.type}-${index}`}>
                    <Td>
                      <div className="flex flex-col">
                        <span>{formatRelativeTime(event.at)}</span>
                        <span className="text-xs text-zinc-500">{formatLocalTime(event.at)}</span>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={getEventBadgeVariant(event.level)}>{event.level}</Badge>
                    </Td>
                    <Td className="font-medium text-white">{event.type}</Td>
                    <Td className="text-zinc-400">{event.operationName || event.topic || event.socketId || "-"}</Td>
                    <Td>{event.detail}</Td>
                  </tr>
                ))
              ) : (
                <tr>
                  <Td colSpan={5} className="text-center text-zinc-500">No recent realtime events recorded yet.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}