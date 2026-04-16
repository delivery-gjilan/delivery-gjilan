"use client";

import { useRef } from "react";
import { useApolloClient, useQuery, useSubscription } from "@apollo/client/react";
import { toast } from "sonner";
import { DRIVERS_QUERY, USERS_QUERY } from "@/graphql/operations/users/queries";
import { GET_DRIVER_MESSAGE_THREADS } from "@/graphql/operations/driverMessages/queries";
import { GET_BUSINESS_MESSAGE_THREADS } from "@/graphql/operations/businessMessages/queries";
import { ADMIN_ANY_MESSAGE_RECEIVED } from "@/graphql/operations/driverMessages/subscriptions";
import { ADMIN_ANY_BUSINESS_MESSAGE_RECEIVED } from "@/graphql/operations/businessMessages/subscriptions";

function formatTime(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function GlobalAdminMessageNotifications() {
  const apolloClient = useApolloClient();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const { data: driversData } = useQuery(DRIVERS_QUERY);
  const { data: usersData } = useQuery(USERS_QUERY);

  const driverMap = new Map((driversData?.drivers ?? []).map((d) => {
    const driverLabel = `${d.firstName} ${d.lastName}`.trim() || d.email || `Driver ${d.id.slice(0, 8)}`;
    return [d.id, driverLabel];
  }));

  const businessUserMap = new Map((usersData?.users ?? [])
    .filter((u) => u.role === "BUSINESS_OWNER" || u.role === "BUSINESS_EMPLOYEE")
    .map((u) => {
      const personLabel = `${u.firstName} ${u.lastName}`.trim() || u.email || `Business user ${u.id.slice(0, 8)}`;
      const businessLabel = u.business?.name ? `${personLabel} @ ${u.business.name}` : personLabel;
      return [u.id, businessLabel];
    }));

  useSubscription(ADMIN_ANY_MESSAGE_RECEIVED, {
    onData: ({ data: sub }) => {
      const msg = sub.data?.adminAnyMessageReceived;
      if (!msg || msg.senderRole !== "DRIVER" || seenIdsRef.current.has(msg.id)) return;
      seenIdsRef.current.add(msg.id);
      const driverName = driverMap.get(msg.driverId) || "Unknown Driver";
      toast.info(`Driver message • ${driverName}`, {
        description: `${msg.body} • ${formatTime(msg.createdAt)}`,
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
      toast.info(`Business message • ${userName}`, {
        description: `${msg.body} • ${formatTime(msg.createdAt)}`,
      });
      void apolloClient.refetchQueries({ include: [GET_BUSINESS_MESSAGE_THREADS] });
    },
  });

  return null;
}
