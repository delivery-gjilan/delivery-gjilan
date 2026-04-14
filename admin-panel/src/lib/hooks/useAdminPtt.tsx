"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLazyQuery, useMutation, useSubscription } from "@apollo/client/react";
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { ADMIN_SEND_PTT_SIGNAL, GET_AGORA_RTC_CREDENTIALS, ADMIN_PTT_SIGNAL_SUBSCRIPTION } from "@/graphql/operations/users/ptt";
import { useAuth } from "@/lib/auth-context";

// Lazy-load the Agora SDK so it never executes during SSR (it references `window` at module scope).
const getAgoraRTC = () => import("agora-rtc-sdk-ng").then((m) => m.default);

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface AdminPttState {
  /** Admin-to-driver sending */
  isTalking: boolean;
  isMuted: boolean;
  pttError: string;
  pttChannelName: string | null;
  activePttDriverIds: string[];

  /** Driver-to-admin receiving */
  driverTalkingId: string | null;
}

export interface AdminPttActions {
  startTalking: (connectedDriverIds: string[]) => Promise<void>;
  stopTalking: () => Promise<void>;
  toggleMute: (connectedDriverIds: string[]) => Promise<void>;
}

type AdminPttContextType = AdminPttState & AdminPttActions;

const AdminPttContext = createContext<AdminPttContextType | null>(null);

// ────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────

export function AdminPttProvider({ children }: { children: React.ReactNode }) {
  const { admin } = useAuth();

  // ─── Admin → Driver send state ───
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pttError, setPttError] = useState("");
  const [pttChannelName, setPttChannelName] = useState<string | null>(null);
  const [activePttDriverIds, setActivePttDriverIds] = useState<string[]>([]);

  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  // ─── Driver → Admin receive state ───
  const [driverTalkingId, setDriverTalkingId] = useState<string | null>(null);
  const driverRtcClientRef = useRef<IAgoraRTCClient | null>(null);

  // ─── GraphQL hooks ───
  const [getAgoraCredentials] = useLazyQuery(GET_AGORA_RTC_CREDENTIALS, { fetchPolicy: "no-cache" });
  const [sendPttSignal] = useMutation(ADMIN_SEND_PTT_SIGNAL);

  // ────────────────────────────────────────────────────────────
  // Admin → Driver: Send PTT
  // ────────────────────────────────────────────────────────────

  const ensureRtcClient = useCallback(async () => {
    if (rtcClientRef.current) return rtcClientRef.current;
    const agora = await getAgoraRTC();
    const client = agora.createClient({ mode: "live", codec: "vp8" });
    await client.setClientRole("host");
    rtcClientRef.current = client;
    return client;
  }, []);

  const stopTalking = useCallback(async () => {
    const targets = activePttDriverIds;
    if (pttChannelName && targets.length > 0) {
      try {
        await sendPttSignal({
          variables: { driverIds: targets, channelName: pttChannelName, action: "STOPPED", muted: false },
        });
      } catch {
        /* ignore */
      }
    }
    try {
      if (rtcClientRef.current && micTrackRef.current) {
        await rtcClientRef.current.unpublish([micTrackRef.current]);
      }
      micTrackRef.current?.stop();
      micTrackRef.current?.close();
      micTrackRef.current = null;
      if (rtcClientRef.current) await rtcClientRef.current.leave();
      rtcClientRef.current = null;
    } catch {
      /* no-op */
    }
    setIsTalking(false);
    setPttChannelName(null);
    setActivePttDriverIds([]);
  }, [pttChannelName, activePttDriverIds, sendPttSignal]);

  const startTalking = useCallback(
    async (connectedDriverIds: string[]) => {
      if (isTalking) return;
      setPttError("");

      if (connectedDriverIds.length === 0) {
        setPttError("Select connected drivers first.");
        return;
      }

      const channelName = `ptt-${Date.now()}-${admin?.id || "admin"}`;
      const targets = [...connectedDriverIds];

      try {
        const res = await getAgoraCredentials({ variables: { channelName, role: "PUBLISHER" } });
        const creds = res.data?.getAgoraRtcCredentials;
        if (!creds) throw new Error("Failed to get Agora credentials");

        const client = await ensureRtcClient();
        let micTrack: IMicrophoneAudioTrack;
        try {
          const agora = await getAgoraRTC();
          micTrack = await agora.createMicrophoneAudioTrack();
        } catch (micErr: unknown) {
          const micError = micErr as Record<string, unknown>;
          throw new Error(
            micError?.code === "DEVICE_NOT_FOUND"
              ? "No microphone found. Please connect a microphone and try again."
              : `Microphone error: ${(micErr as Error)?.message || "unknown"}`,
          );
        }
        await client.join(creds.appId, creds.channelName, creds.token, creds.uid);
        await client.publish([micTrack]);
        micTrackRef.current = micTrack;

        await sendPttSignal({
          variables: { driverIds: targets, channelName, action: "STARTED", muted: false },
        });

        setPttChannelName(channelName);
        setActivePttDriverIds(targets);
        setIsTalking(true);
      } catch (err) {
        setPttError(err instanceof Error ? err.message : "Failed to start PTT");
        await stopTalking();
      }
    },
    [isTalking, admin?.id, getAgoraCredentials, ensureRtcClient, sendPttSignal, stopTalking],
  );

  const toggleMute = useCallback(
    async (connectedDriverIds: string[]) => {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);

      if (micTrackRef.current) {
        await micTrackRef.current.setEnabled(!nextMuted);
      }

      const targetDriverIds = activePttDriverIds.length > 0 ? activePttDriverIds : connectedDriverIds;

      if (pttChannelName && targetDriverIds.length > 0) {
        await sendPttSignal({
          variables: {
            driverIds: targetDriverIds,
            channelName: pttChannelName,
            action: nextMuted ? "MUTE" : "UNMUTE",
            muted: nextMuted,
          },
        });
      }
    },
    [isMuted, activePttDriverIds, pttChannelName, sendPttSignal],
  );

  // ────────────────────────────────────────────────────────────
  // Driver → Admin: Receive PTT
  // ────────────────────────────────────────────────────────────

  const joinDriverPttChannel = useCallback(
    async (channelName: string) => {
      try {
        if (driverRtcClientRef.current) {
          try {
            await driverRtcClientRef.current.leave();
          } catch {
            /* no-op */
          }
          driverRtcClientRef.current = null;
        }

        const res = await getAgoraCredentials({ variables: { channelName, role: "SUBSCRIBER" } });
        const creds = res.data?.getAgoraRtcCredentials;
        if (!creds) return;

        const agora = await getAgoraRTC();
        const client = agora.createClient({ mode: "live", codec: "vp8" });
        await client.setClientRole("audience");
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });
        await client.join(creds.appId, creds.channelName, creds.token, creds.uid);
        driverRtcClientRef.current = client;
      } catch (err) {
        console.warn("[PTT-Recv] Failed to join driver channel", err);
        driverRtcClientRef.current = null;
      }
    },
    [getAgoraCredentials],
  );

  const leaveDriverPttChannel = useCallback(async () => {
    if (!driverRtcClientRef.current) return;
    try {
      await driverRtcClientRef.current.leave();
    } catch {
      /* no-op */
    }
    driverRtcClientRef.current = null;
  }, []);

  useSubscription(ADMIN_PTT_SIGNAL_SUBSCRIPTION, {
    onData: async ({ data: subData }) => {
      const signal = subData.data?.adminPttSignal;
      if (!signal) return;

      if (signal.action === "STARTED") {
        setDriverTalkingId(signal.driverId);
        await joinDriverPttChannel(signal.channelName);
      } else if (signal.action === "STOPPED") {
        setDriverTalkingId(null);
        await leaveDriverPttChannel();
      }
    },
  });

  // ────────────────────────────────────────────────────────────
  // Cleanup
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Send-side cleanup
      micTrackRef.current?.stop();
      micTrackRef.current?.close();
      micTrackRef.current = null;
      if (rtcClientRef.current) {
        rtcClientRef.current.leave().catch(() => {});
        rtcClientRef.current = null;
      }
      // Receive-side cleanup
      if (driverRtcClientRef.current) {
        driverRtcClientRef.current.leave().catch(() => {});
        driverRtcClientRef.current = null;
      }
    };
  }, []);

  const value: AdminPttContextType = {
    isTalking,
    isMuted,
    pttError,
    pttChannelName,
    activePttDriverIds,
    driverTalkingId,
    startTalking,
    stopTalking,
    toggleMute,
  };

  return <AdminPttContext.Provider value={value}>{children}</AdminPttContext.Provider>;
}

// ────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────

export function useAdminPtt() {
  const ctx = useContext(AdminPttContext);
  if (!ctx) {
    throw new Error("useAdminPtt must be used within AdminPttProvider");
  }
  return ctx;
}
