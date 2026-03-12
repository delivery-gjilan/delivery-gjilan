import { RtcRole, RtcTokenBuilder } from 'agora-access-token';

const AGORA_TOKEN_TTL_SECONDS = Number(process.env.AGORA_TOKEN_TTL_SECONDS || 3600);

function ensureAgoraEnv() {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error('Agora credentials are not configured: AGORA_APP_ID and AGORA_APP_CERTIFICATE are required');
  }

  return { appId, appCertificate };
}

function toAgoraUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }

  // Agora RTC expects a positive uint32 uid.
  return hash === 0 ? 1 : hash;
}

export function createAgoraRtcCredentials({
  userId,
  channelName,
  role,
}: {
  userId: string;
  channelName: string;
  role: 'PUBLISHER' | 'SUBSCRIBER';
}) {
  const { appId, appCertificate } = ensureAgoraEnv();
  const uid = toAgoraUid(userId);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + AGORA_TOKEN_TTL_SECONDS;

  const agoraRole = role === 'PUBLISHER' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs,
  );

  return {
    appId,
    channelName,
    uid,
    token,
    expiresAt: new Date(privilegeExpiredTs * 1000),
  };
}
