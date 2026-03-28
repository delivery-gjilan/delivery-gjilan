import { useEffect, useRef, useState } from 'react';
import { useLazyQuery, useSubscription } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { DRIVER_PTT_SIGNAL_SUBSCRIPTION, GET_AGORA_RTC_CREDENTIALS } from '@/graphql/operations/driverTelemetry';
import type { AgoraRtcCredentials, AgoraRtcRole, DriverPttSignal, QueryGetAgoraRtcCredentialsArgs, SubscriptionDriverPttSignalArgs } from '@/gql/graphql';

export function useDriverPttReceiver() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const driverId = useAuthStore((state) => state.user?.id);

  const [isAdminTalking, setIsAdminTalking] = useState(false);

  const [getRtcCredentials] = useLazyQuery<{ getAgoraRtcCredentials: AgoraRtcCredentials }, QueryGetAgoraRtcCredentialsArgs>(GET_AGORA_RTC_CREDENTIALS, {
    fetchPolicy: 'no-cache',
  });

  const engineRef = useRef<any>(null);
  const channelRef = useRef<string | null>(null);
  const joiningRef = useRef(false);
  const eventHandlerRef = useRef<any>(null);
  const remotePublisherJoinedRef = useRef(false);

  const ensureEngine = async (appId: string) => {
    if (engineRef.current) {
      // Re-enable audio every time in case the OS suspended it (phone call,
      // backgrounding, etc.) since the engine was first created.
      await engineRef.current.enableAudio();
      await engineRef.current.muteAllRemoteAudioStreams(false);
      await engineRef.current.adjustPlaybackSignalVolume(100);
      await engineRef.current.setDefaultAudioRouteToSpeakerphone(true);
      await engineRef.current.setEnableSpeakerphone(true);
      return engineRef.current;
    }

    const agoraModule: any = await import('react-native-agora');
    const engine = agoraModule.createAgoraRtcEngine();

    await engine.initialize({
      appId,
      channelProfile: agoraModule.ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    await engine.enableAudio();
    await engine.setClientRole(agoraModule.ClientRoleType.ClientRoleAudience);
    await engine.muteAllRemoteAudioStreams(false);
    await engine.adjustPlaybackSignalVolume(100);
    await engine.setDefaultAudioRouteToSpeakerphone(true);
    await engine.setEnableSpeakerphone(true);

    // Register diagnostics once so silent failures are visible in device logs.
    eventHandlerRef.current = {
      onJoinChannelSuccess: () => {
        console.log('[PTT] Joined Agora channel successfully');
      },
      onUserJoined: (_connection: any, remoteUid: number) => {
        remotePublisherJoinedRef.current = true;
        setIsAdminTalking(true);
        console.log('[PTT] Remote broadcaster joined', { remoteUid });
      },
      onUserMuteAudio: (_connection: any, remoteUid: number, muted: boolean) => {
        setIsAdminTalking(!muted);
        console.log('[PTT] Remote mute state changed', { remoteUid, muted });
      },
      onUserOffline: (_connection: any, remoteUid: number) => {
        remotePublisherJoinedRef.current = false;
        setIsAdminTalking(false);
        console.log('[PTT] Remote broadcaster left', { remoteUid });
      },
      onError: (err: number, msg: string) => {
        console.warn('[PTT] Agora engine error', { err, msg });
      },
      onConnectionStateChanged: (_connection: any, state: number, reason: number) => {
        console.log('[PTT] Connection state changed', { state, reason });
      },
    };
    engine.registerEventHandler(eventHandlerRef.current);

    engineRef.current = engine;
    return engine;
  };

  const joinPttChannel = async (channelName: string) => {
    // Prevent concurrent join attempts
    if (joiningRef.current) return;
    joiningRef.current = true;

    try {
      // Leave any existing channel first so we're not double-joined
      if (engineRef.current && channelRef.current) {
        try {
          await engineRef.current.leaveChannel();
        } catch {
          // no-op
        }
        channelRef.current = null;
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

      const engine = await ensureEngine(creds.appId);
      const joinResult = await engine.joinChannel(creds.token, creds.channelName, creds.uid, {
        autoSubscribeAudio: true,
        publishMicrophoneTrack: false,
      });
      if (typeof joinResult === 'number' && joinResult < 0) {
        throw new Error(`Agora joinChannel failed with code ${joinResult}`);
      }

      // Re-assert playback route and remote subscription after join.
      await engine.muteAllRemoteAudioStreams(false);
      await engine.adjustPlaybackSignalVolume(100);
      await engine.setDefaultAudioRouteToSpeakerphone(true);
      await engine.setEnableSpeakerphone(true);

      channelRef.current = channelName;
    } catch (error) {
      // Join failed — reset the talking indicator so the driver isn't stuck
      console.warn('[PTT] Failed to join channel', { channelName, error });
      setIsAdminTalking(false);
      channelRef.current = null;
      remotePublisherJoinedRef.current = false;
    } finally {
      joiningRef.current = false;
    }
  };

  const leavePttChannel = async () => {
    if (!engineRef.current || !channelRef.current) {
      return;
    }

    try {
      await engineRef.current.leaveChannel();
    } catch {
      // no-op
    }

    channelRef.current = null;
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

  useEffect(() => {
    return () => {
      leavePttChannel();
      if (engineRef.current) {
        if (eventHandlerRef.current) {
          try {
            engineRef.current.unregisterEventHandler(eventHandlerRef.current);
          } catch {
            // no-op
          }
          eventHandlerRef.current = null;
        }
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, []);

  return {
    isAdminTalking,
  };
}
