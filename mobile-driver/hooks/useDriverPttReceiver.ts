import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { DRIVER_PTT_SIGNAL_SUBSCRIPTION, GET_AGORA_RTC_CREDENTIALS, DRIVER_SEND_PTT_SIGNAL } from '@/graphql/operations/driverTelemetry';
import type { AgoraRtcCredentials, AgoraRtcRole, DriverPttSignal, QueryGetAgoraRtcCredentialsArgs, SubscriptionDriverPttSignalArgs } from '@/gql/graphql';

export function useDriverPttReceiver() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const driverId = useAuthStore((state) => state.user?.id);

  const [isAdminTalking, setIsAdminTalking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [pttError, setPttError] = useState('');

  const [getRtcCredentials] = useLazyQuery<{ getAgoraRtcCredentials: AgoraRtcCredentials }, QueryGetAgoraRtcCredentialsArgs>(GET_AGORA_RTC_CREDENTIALS, {
    fetchPolicy: 'no-cache',
  });
  const [sendPttSignal] = useMutation(DRIVER_SEND_PTT_SIGNAL);

  // --- Receiver state (admin → driver) ---
  const recvEngineRef = useRef<any>(null);
  const recvChannelRef = useRef<string | null>(null);
  const recvJoiningRef = useRef(false);
  const recvEventHandlerRef = useRef<any>(null);
  const remotePublisherJoinedRef = useRef(false);

  // --- Sender state (driver → admin) ---
  const sendEngineRef = useRef<any>(null);
  const sendChannelRef = useRef<string | null>(null);
  const sendEventHandlerRef = useRef<any>(null);

  const loadAgora = async () => {
    const agoraModule: any = await import('react-native-agora');
    return agoraModule;
  };

  // ═══════════════ RECEIVER (admin → driver) ═══════════════

  const ensureRecvEngine = async (appId: string) => {
    if (recvEngineRef.current) {
      await recvEngineRef.current.enableAudio();
      await recvEngineRef.current.muteAllRemoteAudioStreams(false);
      await recvEngineRef.current.adjustPlaybackSignalVolume(100);
      await recvEngineRef.current.setDefaultAudioRouteToSpeakerphone(true);
      await recvEngineRef.current.setEnableSpeakerphone(true);
      return recvEngineRef.current;
    }

    const agora = await loadAgora();
    const engine = agora.createAgoraRtcEngine();

    await engine.initialize({
      appId,
      channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    await engine.enableAudio();
    await engine.setClientRole(agora.ClientRoleType.ClientRoleAudience);
    await engine.muteAllRemoteAudioStreams(false);
    await engine.adjustPlaybackSignalVolume(100);
    await engine.setDefaultAudioRouteToSpeakerphone(true);
    await engine.setEnableSpeakerphone(true);

    recvEventHandlerRef.current = {
      onJoinChannelSuccess: () => {
        console.log('[PTT-Recv] Joined Agora channel successfully');
      },
      onUserJoined: (_connection: any, remoteUid: number) => {
        remotePublisherJoinedRef.current = true;
        setIsAdminTalking(true);
        console.log('[PTT-Recv] Remote broadcaster joined', { remoteUid });
      },
      onUserMuteAudio: (_connection: any, remoteUid: number, muted: boolean) => {
        setIsAdminTalking(!muted);
        console.log('[PTT-Recv] Remote mute state changed', { remoteUid, muted });
      },
      onUserOffline: (_connection: any, remoteUid: number) => {
        remotePublisherJoinedRef.current = false;
        setIsAdminTalking(false);
        console.log('[PTT-Recv] Remote broadcaster left', { remoteUid });
      },
      onError: (err: number, msg: string) => {
        console.warn('[PTT-Recv] Agora engine error', { err, msg });
      },
      onConnectionStateChanged: (_connection: any, state: number, reason: number) => {
        console.log('[PTT-Recv] Connection state changed', { state, reason });
      },
    };
    engine.registerEventHandler(recvEventHandlerRef.current);

    recvEngineRef.current = engine;
    return engine;
  };

  const joinPttChannel = async (channelName: string) => {
    if (recvJoiningRef.current) return;
    recvJoiningRef.current = true;

    try {
      if (recvEngineRef.current && recvChannelRef.current) {
        try {
          await recvEngineRef.current.leaveChannel();
        } catch {
          // no-op
        }
        recvChannelRef.current = null;
        remotePublisherJoinedRef.current = false;
      }

      const result = await getRtcCredentials({
        variables: {
          channelName,
          role: 'SUBSCRIBER' as AgoraRtcRole,
        },
      });

      const creds = result.data?.getAgoraRtcCredentials;
      if (!creds) {
        setIsAdminTalking(false);
        return;
      }

      const engine = await ensureRecvEngine(creds.appId);
      const joinResult = await engine.joinChannel(creds.token, creds.channelName, creds.uid, {
        autoSubscribeAudio: true,
        publishMicrophoneTrack: false,
      });
      if (typeof joinResult === 'number' && joinResult < 0) {
        throw new Error(`Agora joinChannel failed with code ${joinResult}`);
      }

      await engine.muteAllRemoteAudioStreams(false);
      await engine.adjustPlaybackSignalVolume(100);
      await engine.setDefaultAudioRouteToSpeakerphone(true);
      await engine.setEnableSpeakerphone(true);

      recvChannelRef.current = channelName;
    } catch (error) {
      console.warn('[PTT-Recv] Failed to join channel', { channelName, error });
      setIsAdminTalking(false);
      recvChannelRef.current = null;
      remotePublisherJoinedRef.current = false;
    } finally {
      recvJoiningRef.current = false;
    }
  };

  const leavePttChannel = async () => {
    if (!recvEngineRef.current || !recvChannelRef.current) {
      return;
    }

    try {
      await recvEngineRef.current.leaveChannel();
    } catch {
      // no-op
    }

    recvChannelRef.current = null;
    remotePublisherJoinedRef.current = false;
  };

  useSubscription<{ driverPttSignal: DriverPttSignal }, SubscriptionDriverPttSignalArgs>(DRIVER_PTT_SIGNAL_SUBSCRIPTION, {
    skip: !isAuthenticated || !driverId,
    variables: { driverId: String(driverId) },
    onData: async ({ data }) => {
      const signal = data.data?.driverPttSignal;
      if (!signal) return;

      if (signal.action === 'STARTED') {
        setIsAdminTalking(false);
        await joinPttChannel(signal.channelName);
        return;
      }

      if (signal.action === 'STOPPED') {
        setIsAdminTalking(false);
        await leavePttChannel();
        return;
      }
    },
  });

  // ═══════════════ SENDER (driver → admin) ═══════════════

  const ensureSendEngine = async (appId: string) => {
    if (sendEngineRef.current) {
      await sendEngineRef.current.enableAudio();
      return sendEngineRef.current;
    }

    const agora = await loadAgora();
    const engine = agora.createAgoraRtcEngine();

    await engine.initialize({
      appId,
      channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    await engine.enableAudio();
    await engine.setClientRole(agora.ClientRoleType.ClientRoleBroadcaster);

    sendEventHandlerRef.current = {
      onJoinChannelSuccess: () => {
        console.log('[PTT-Send] Joined Agora channel as broadcaster');
      },
      onError: (err: number, msg: string) => {
        console.warn('[PTT-Send] Agora engine error', { err, msg });
      },
    };
    engine.registerEventHandler(sendEventHandlerRef.current);

    sendEngineRef.current = engine;
    return engine;
  };

  const startTalking = useCallback(async () => {
    if (isTalking || !driverId) return;
    setPttError('');

    const channelName = `driver-ptt-${driverId}-${Date.now()}`;

    try {
      const result = await getRtcCredentials({
        variables: {
          channelName,
          role: 'PUBLISHER' as AgoraRtcRole,
        },
      });

      const creds = result.data?.getAgoraRtcCredentials;
      if (!creds) throw new Error('Failed to get Agora credentials');

      const engine = await ensureSendEngine(creds.appId);

      const joinResult = await engine.joinChannel(creds.token, creds.channelName, creds.uid, {
        autoSubscribeAudio: false,
        publishMicrophoneTrack: true,
      });
      if (typeof joinResult === 'number' && joinResult < 0) {
        throw new Error(`Agora joinChannel failed with code ${joinResult}`);
      }

      sendChannelRef.current = channelName;
      setIsTalking(true);

      await sendPttSignal({ variables: { channelName, action: 'STARTED' } });
    } catch (error) {
      console.warn('[PTT-Send] Failed to start talking', error);
      setPttError(error instanceof Error ? error.message : 'Failed to start PTT');
      // Clean up on failure
      if (sendEngineRef.current && sendChannelRef.current) {
        try { await sendEngineRef.current.leaveChannel(); } catch { /* no-op */ }
      }
      sendChannelRef.current = null;
      setIsTalking(false);
    }
  }, [isTalking, driverId, getRtcCredentials, sendPttSignal]);

  const stopTalking = useCallback(async () => {
    if (!sendChannelRef.current) {
      setIsTalking(false);
      return;
    }

    const channelName = sendChannelRef.current;

    try {
      await sendPttSignal({ variables: { channelName, action: 'STOPPED' } });
    } catch {
      // no-op — best effort signal
    }

    try {
      if (sendEngineRef.current) {
        await sendEngineRef.current.leaveChannel();
      }
    } catch {
      // no-op
    }

    sendChannelRef.current = null;
    setIsTalking(false);
  }, [sendPttSignal]);

  // ═══════════════ CLEANUP ═══════════════

  useEffect(() => {
    return () => {
      // Clean up receiver
      leavePttChannel();
      if (recvEngineRef.current) {
        if (recvEventHandlerRef.current) {
          try { recvEngineRef.current.unregisterEventHandler(recvEventHandlerRef.current); } catch { /* no-op */ }
          recvEventHandlerRef.current = null;
        }
        recvEngineRef.current.release();
        recvEngineRef.current = null;
      }
      // Clean up sender
      if (sendEngineRef.current) {
        if (sendEventHandlerRef.current) {
          try { sendEngineRef.current.unregisterEventHandler(sendEventHandlerRef.current); } catch { /* no-op */ }
          sendEventHandlerRef.current = null;
        }
        if (sendChannelRef.current) {
          try { sendEngineRef.current.leaveChannel(); } catch { /* no-op */ }
          sendChannelRef.current = null;
        }
        sendEngineRef.current.release();
        sendEngineRef.current = null;
      }
    };
  }, []);

  return {
    isAdminTalking,
    isTalking,
    pttError,
    startTalking,
    stopTalking,
  };
}
