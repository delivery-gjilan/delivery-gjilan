import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client/react';
import { useAuthStore } from '@/store/authStore';
import { GET_AGORA_RTC_CREDENTIALS, ADMIN_SEND_PTT_SIGNAL, ADMIN_PTT_SIGNAL_SUBSCRIPTION } from '@/graphql/ptt';
import type { AgoraRtcCredentials, QueryGetAgoraRtcCredentialsArgs } from '@/gql/graphql';
import { AgoraRtcRole } from '@/gql/graphql';

const loadAgora = async () => {
    const agoraModule: any = await import('react-native-agora');
    return agoraModule;
};

export function useAdminPtt(selectedDriverIds: string[], channelName: string, onChannelReset: () => void) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const [isTalking, setIsTalking] = useState(false);
    const [isDriverTalking, setIsDriverTalking] = useState(false);
    const [pttError, setPttError] = useState('');

    const [getRtcCredentials] = useLazyQuery<{ getAgoraRtcCredentials: AgoraRtcCredentials }, QueryGetAgoraRtcCredentialsArgs>(GET_AGORA_RTC_CREDENTIALS, { fetchPolicy: 'no-cache' });
    const [sendPttSignal] = useMutation(ADMIN_SEND_PTT_SIGNAL);
    const activeDriverIdsRef = useRef<string[]>([]);

    // ─── Publisher engine (admin → drivers) ───
    const sendEngineRef = useRef<any>(null);
    const sendChannelRef = useRef<string | null>(null);
    const sendEventHandlerRef = useRef<any>(null);
    const sendTransitionRef = useRef(false);

    // ─── Subscriber engine (driver → admin) ───
    const recvEngineRef = useRef<any>(null);
    const recvChannelRef = useRef<string | null>(null);
    const recvJoiningRef = useRef(false);
    const recvEventHandlerRef = useRef<any>(null);

    // ═══ PUBLISHER (admin → drivers) ═══

    const ensureSendEngine = async (appId: string) => {
        if (sendEngineRef.current) {
            await sendEngineRef.current.enableAudio();
            return sendEngineRef.current;
        }
        const agora = await loadAgora();
        const engine = agora.createAgoraRtcEngine();
        await engine.initialize({ appId, channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting });
        await engine.enableAudio();
        await engine.setClientRole(agora.ClientRoleType.ClientRoleBroadcaster);
        sendEventHandlerRef.current = {
            onJoinChannelSuccess: () => console.log('[PTT-Admin-Send] Joined channel as broadcaster'),
            onError: (err: number, msg: string) => console.warn('[PTT-Admin-Send] Error', { err, msg }),
        };
        engine.registerEventHandler(sendEventHandlerRef.current);
        sendEngineRef.current = engine;
        return engine;
    };

    const startTalking = useCallback(async () => {
        if (sendTransitionRef.current || isTalking || selectedDriverIds.length === 0) return;
        sendTransitionRef.current = true;
        setPttError('');
        const targetDriverIds = [...selectedDriverIds];
        try {
            const result = await getRtcCredentials({ variables: { channelName, role: AgoraRtcRole.Publisher } });
            const creds = result.data?.getAgoraRtcCredentials;
            if (!creds) throw new Error('Failed to get Agora credentials');

            const engine = await ensureSendEngine(creds.appId);

            // Defensive leave: recover from stale joined state before re-joining.
            if (sendChannelRef.current || isTalking) {
                try { await engine.leaveChannel(); } catch { /* no-op */ }
                sendChannelRef.current = null;
                setIsTalking(false);
            }

            const joinResult = await engine.joinChannel(creds.token, creds.channelName, creds.uid, {
                autoSubscribeAudio: false,
                publishMicrophoneTrack: true,
            });
            if (typeof joinResult === 'number' && joinResult < 0) {
                throw new Error(`Agora joinChannel failed: ${joinResult}`);
            }
            sendChannelRef.current = channelName;
            setIsTalking(true);
            activeDriverIdsRef.current = targetDriverIds;

            await sendPttSignal({ variables: { driverIds: targetDriverIds, channelName, action: 'STARTED', muted: false } });
        } catch (err: unknown) {
            console.warn('[PTT-Admin-Send] Failed to start', err);
            setPttError((err as Error)?.message || 'Failed to start PTT');
            if (sendEngineRef.current && sendChannelRef.current) {
                try { await sendEngineRef.current.leaveChannel(); } catch { /* no-op */ }
            }
            sendChannelRef.current = null;
            activeDriverIdsRef.current = [];
            setIsTalking(false);
        } finally {
            sendTransitionRef.current = false;
        }
    }, [isTalking, selectedDriverIds, channelName, getRtcCredentials, sendPttSignal]);

    const stopTalking = useCallback(async () => {
        if (sendTransitionRef.current) return;
        sendTransitionRef.current = true;
        if (!sendChannelRef.current) {
            setIsTalking(false);
            activeDriverIdsRef.current = [];
            sendTransitionRef.current = false;
            return;
        }
        const ch = sendChannelRef.current;
        const targetDriverIds = activeDriverIdsRef.current.length > 0 ? activeDriverIdsRef.current : selectedDriverIds;
        try {
            await sendPttSignal({ variables: { driverIds: targetDriverIds, channelName: ch, action: 'STOPPED' } });
        } catch { /* best effort */ }
        try {
            if (sendEngineRef.current) await sendEngineRef.current.leaveChannel();
        } catch { /* no-op */ }
        sendChannelRef.current = null;
        activeDriverIdsRef.current = [];
        setIsTalking(false);
        onChannelReset();
        sendTransitionRef.current = false;
    }, [selectedDriverIds, sendPttSignal, onChannelReset]);

    const muteDrivers = useCallback(async (muted: boolean) => {
        if (!sendChannelRef.current) return;
        const targetDriverIds = activeDriverIdsRef.current.length > 0 ? activeDriverIdsRef.current : selectedDriverIds;
        try {
            await sendPttSignal({
                variables: { driverIds: targetDriverIds, channelName: sendChannelRef.current, action: muted ? 'MUTE' : 'UNMUTE', muted },
            });
        } catch (err: unknown) {
            setPttError((err as Error)?.message || 'Failed to send mute signal');
        }
    }, [selectedDriverIds, sendPttSignal]);

    // ═══ SUBSCRIBER (driver → admin) ═══

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
        await engine.initialize({ appId, channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting });
        await engine.enableAudio();
        await engine.setClientRole(agora.ClientRoleType.ClientRoleAudience);
        await engine.muteAllRemoteAudioStreams(false);
        await engine.adjustPlaybackSignalVolume(100);
        await engine.setDefaultAudioRouteToSpeakerphone(true);
        await engine.setEnableSpeakerphone(true);
        recvEventHandlerRef.current = {
            onUserJoined: () => setIsDriverTalking(true),
            onUserMuteAudio: (_conn: any, _uid: number, muted: boolean) => setIsDriverTalking(!muted),
            onUserOffline: () => setIsDriverTalking(false),
            onError: (err: number, msg: string) => console.warn('[PTT-Admin-Recv] Error', { err, msg }),
        };
        engine.registerEventHandler(recvEventHandlerRef.current);
        recvEngineRef.current = engine;
        return engine;
    };

    const joinRecvChannel = async (ch: string) => {
        if (recvJoiningRef.current) return;
        recvJoiningRef.current = true;
        try {
            if (recvEngineRef.current && recvChannelRef.current) {
                try { await recvEngineRef.current.leaveChannel(); } catch { /* no-op */ }
                recvChannelRef.current = null;
            }
            const result = await getRtcCredentials({ variables: { channelName: ch, role: AgoraRtcRole.Subscriber } });
            const creds = result.data?.getAgoraRtcCredentials;
            if (!creds) return;
            const engine = await ensureRecvEngine(creds.appId);
            const joinResult = await engine.joinChannel(creds.token, creds.channelName, creds.uid, {
                autoSubscribeAudio: true,
                publishMicrophoneTrack: false,
            });
            if (typeof joinResult === 'number' && joinResult < 0) {
                throw new Error(`Agora joinChannel failed: ${joinResult}`);
            }
            await engine.muteAllRemoteAudioStreams(false);
            await engine.adjustPlaybackSignalVolume(100);
            await engine.setDefaultAudioRouteToSpeakerphone(true);
            await engine.setEnableSpeakerphone(true);
            recvChannelRef.current = ch;
        } catch (err) {
            console.warn('[PTT-Admin-Recv] Failed to join driver channel', err);
            recvChannelRef.current = null;
            setIsDriverTalking(false);
        } finally {
            recvJoiningRef.current = false;
        }
    };

    const leaveRecvChannel = async () => {
        if (!recvEngineRef.current || !recvChannelRef.current) return;
        try { await recvEngineRef.current.leaveChannel(); } catch { /* no-op */ }
        recvChannelRef.current = null;
        setIsDriverTalking(false);
    };

    useSubscription(ADMIN_PTT_SIGNAL_SUBSCRIPTION, {
        skip: !isAuthenticated,
        onData: async ({ data }) => {
            const signal = data.data?.adminPttSignal;
            if (!signal) return;
            if (signal.action === 'STARTED') {
                setIsDriverTalking(false);
                await joinRecvChannel(signal.channelName);
            } else if (signal.action === 'STOPPED') {
                setIsDriverTalking(false);
                await leaveRecvChannel();
            }
        },
    });

    // ═══ CLEANUP ═══
    useEffect(() => {
        return () => {
            leaveRecvChannel();
            if (recvEngineRef.current) {
                if (recvEventHandlerRef.current) {
                    try { recvEngineRef.current.unregisterEventHandler(recvEventHandlerRef.current); } catch { /* no-op */ }
                }
                recvEngineRef.current.release();
                recvEngineRef.current = null;
            }
            if (sendEngineRef.current) {
                if (sendEventHandlerRef.current) {
                    try { sendEngineRef.current.unregisterEventHandler(sendEventHandlerRef.current); } catch { /* no-op */ }
                }
                if (sendChannelRef.current) {
                    try { sendEngineRef.current.leaveChannel(); } catch { /* no-op */ }
                    sendChannelRef.current = null;
                }
                activeDriverIdsRef.current = [];
                sendEngineRef.current.release();
                sendEngineRef.current = null;
            }
        };
    }, []);

    return { isTalking, isDriverTalking, pttError, startTalking, stopTalking, muteDrivers };
}
