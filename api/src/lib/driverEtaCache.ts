import { cache } from '@/lib/cache';

const DRIVER_ETA_TTL_SECONDS = 20;

export interface LiveDriverEta {
  activeOrderId: string;
  navigationPhase?: string | null;
  remainingEtaSeconds: number;
  etaUpdatedAt: string;
}

function key(userId: string): string {
  return `cache:driver-eta:${userId}`;
}

export async function getLiveDriverEta(userId: string): Promise<LiveDriverEta | null> {
  return cache.get<LiveDriverEta>(key(userId));
}

export async function setLiveDriverEta(userId: string, value: LiveDriverEta): Promise<void> {
  await cache.set(key(userId), value, DRIVER_ETA_TTL_SECONDS);
}

export async function clearLiveDriverEta(userId: string): Promise<void> {
  await cache.del(key(userId));
}
