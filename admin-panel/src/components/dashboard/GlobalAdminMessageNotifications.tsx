"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, useQuery, useSubscription } from "@apollo/client/react";
import { DRIVERS_QUERY, USERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_DRIVER_MESSAGE_THREADS } from "@/graphql/operations/driverMessages/queries";
import { GET_BUSINESS_MESSAGE_THREADS } from "@/graphql/operations/businessMessages/queries";
import { ADMIN_ANY_MESSAGE_RECEIVED } from "@/graphql/operations/driverMessages/subscriptions";
import { ADMIN_ANY_BUSINESS_MESSAGE_RECEIVED } from "@/graphql/operations/businessMessages/subscriptions";

function formatTime(iso: string) {
  if (!iso) return "Unknown time";
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type NotificationItem = {
  id: string;
  kind: "driver" | "business";
  senderName: string;
  body: string;
  createdAt: string;
};

export default function GlobalAdminMessageNotifications() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<NotificationItem[]>([]);
  const { data: driversData } = useQuery(DRIVERS_QUERY);
  const { data: usersData } = useQuery(USERS_QUERY);

  const driverMap = useMemo(() => new Map((driversData?.drivers ?? []).map((d) => {
    const driverLabel = `${d.firstName} ${d.lastName}`.trim() || d.email || `Driver ${d.id.slice(0, 8)}`;
    return [d.id, driverLabel];
  })), [driversData]);

  const businessUserMap = useMemo(() => new Map((usersData?.users ?? [])
    .filter((u) => u.role === "BUSINESS_OWNER" || u.role === "BUSINESS_EMPLOYEE")
    .map((u) => {
      const personLabel = `${u.firstName} ${u.lastName}`.trim() || u.email || `Business user ${u.id.slice(0, 8)}`;
      const businessLabel = u.business?.name ? `${personLabel} @ ${u.business.name}` : personLabel;
      return [u.id, businessLabel];
    })), [usersData]);

  const enqueue = (item: NotificationItem) => {
    setQueue((prev) => (prev.some((existing) => existing.id === item.id) ? prev : [...prev, item]));
  };

  const dismissCurrent = () => {
    setQueue((prev) => prev.slice(1));
  };

  const openMessages = () => {
    dismissCurrent();
    router.push("/admin/messages");
  };

  useSubscription(ADMIN_ANY_MESSAGE_RECEIVED, {
    onData: ({ data: sub }) => {
      const msg = sub.data?.adminAnyMessageReceived;
      if (!msg || msg.senderRole !== "DRIVER" || seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);
      const driverName = driverMap.get(msg.driverId) || "Unknown Driver";
      enqueue({
        id: msg.id,
        kind: "driver",
        senderName: driverName,
        body: msg.body,
        createdAt: msg.createdAt,
      });
      void apolloClient.refetchQueries({ include: [GET_DRIVER_MESSAGE_THREADS] });
    },
  });

  useSubscription(ADMIN_ANY_BUSINESS_MESSAGE_RECEIVED, {
    onData: ({ data: sub }) => {
      const msg = sub.data?.adminAnyBusinessMessageReceived;
      if (!msg || msg.senderRole !== "BUSINESS" || seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);
      const userName = businessUserMap.get(msg.businessUserId) || "Unknown Business User";
      enqueue({
        id: msg.id,
        kind: "business",
        senderName: userName,
        body: msg.body,
        createdAt: msg.createdAt,
      });
      void apolloClient.refetchQueries({ include: [GET_BUSINESS_MESSAGE_THREADS] });
    },
  });

  const current = queue[0];
  if (!current) return null;

  const accentClasses =
    current.kind === "driver"
      ? "border-blue-500/40 bg-blue-500/10 text-blue-100"
      : "border-amber-500/40 bg-amber-500/10 text-amber-100";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss notification"
        className="absolute inset-0 bg-black/55"
        onClick={dismissCurrent}
      />

      <div className={`relative w-full max-w-xl rounded-2xl border shadow-2xl ${accentClasses}`}>
        <div className="h-1.5 w-full rounded-t-2xl bg-white/30" />
        <div className="space-y-4 p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                {current.kind === "driver" ? "Driver Message" : "Business Message"}
              </div>
              <div className="mt-1 text-lg font-semibold text-white">{current.senderName}</div>
            </div>
            <div className="text-xs text-zinc-300">{formatTime(current.createdAt)}</div>
          </div>

          <p className="text-base leading-7 text-zinc-100">{current.body}</p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismissCurrent}
              className="rounded-lg border border-zinc-500/40 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700/40"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={openMessages}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Open messages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
