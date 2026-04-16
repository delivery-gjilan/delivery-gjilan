"use client";

import { useQuery, useSubscription } from "@apollo/client/react";
import { useEffect, useRef } from "react";
import { GET_ORDERS } from "@/graphql/operations/orders/queries";
import { ALL_ORDERS_SUBSCRIPTION } from "@/graphql/operations/orders/subscriptions";
import { playNewOrderAlert } from "@/lib/audio/orderAlert";
import { OrderStatus, type AllOrdersUpdatedSubscription } from "@/gql/graphql";

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.AwaitingApproval,
  OrderStatus.Pending,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.OutForDelivery,
] as const;

export default function GlobalOrderAlerts() {
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedKnownIdsRef = useRef(false);

  const { data } = useQuery(GET_ORDERS, {
    variables: {
      limit: 200,
      statuses: [...ACTIVE_ORDER_STATUSES],
    },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    const baselineOrders = data?.orders?.orders ?? [];
    if (!baselineOrders.length) return;

    baselineOrders.forEach((order) => {
      if (order?.id) knownOrderIdsRef.current.add(String(order.id));
    });

    hasInitializedKnownIdsRef.current = true;
  }, [data]);

  useSubscription<AllOrdersUpdatedSubscription>(ALL_ORDERS_SUBSCRIPTION, {
    onData: ({ data: subscriptionData }) => {
      const incomingOrders = subscriptionData.data?.allOrdersUpdated;
      if (!incomingOrders || incomingOrders.length === 0) return;

      const validIncomingOrders = incomingOrders.filter(
        (order) => order && typeof order === "object" && order.id,
      );
      if (validIncomingOrders.length === 0) return;

      const newActiveOrders = validIncomingOrders.filter((order) => {
        const isKnown = knownOrderIdsRef.current.has(String(order.id));
        if (isKnown) return false;
        return order.status !== "DELIVERED" && order.status !== "CANCELLED";
      });

      validIncomingOrders.forEach((order) => {
        knownOrderIdsRef.current.add(String(order.id));
      });

      if (!hasInitializedKnownIdsRef.current) {
        hasInitializedKnownIdsRef.current = true;
        return;
      }

      if (newActiveOrders.length > 0) {
        void playNewOrderAlert();
      }
    },
  });

  return null;
}
