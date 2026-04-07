"use client";

import { useAdminPtt } from "@/lib/hooks/useAdminPtt";
import { Mic, MicOff, Radio } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";

/**
 * Global floating PTT overlay that appears in the bottom-right of
 * every admin dashboard page. Shows:
 *   - "Driver X is talking" indicator when receiving
 *   - "🔴 Live" and mic controls when admin is sending
 */
export default function GlobalPttOverlay() {
  const { isTalking, pttError, driverTalkingId } = useAdminPtt();

  // Light query to resolve driver names — uses cache from other pages
  const { data: driversData } = useQuery(DRIVERS_QUERY, {
    fetchPolicy: "cache-first",
    skip: !driverTalkingId,
  });

  const drivers: any[] = driversData?.drivers ?? [];

  if (!isTalking && !driverTalkingId && !pttError) return null;

  const talkingDriverName = (() => {
    if (!driverTalkingId) return null;
    const d = drivers.find((d: any) => d.id === driverTalkingId);
    return d ? `${d.firstName} ${d.lastName}`.trim() : "Driver";
  })();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      {/* Admin sending indicator */}
      {isTalking && (
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/95 text-white shadow-lg shadow-red-500/30 animate-pulse">
          <Mic size={16} />
          <span className="text-sm font-semibold">🔴 Broadcasting…</span>
        </div>
      )}

      {/* Driver talking indicator */}
      {driverTalkingId && (
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/95 border border-cyan-500/30 text-cyan-200 shadow-lg shadow-cyan-500/20 animate-pulse">
          <Radio size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">🔊 {talkingDriverName} is talking</span>
        </div>
      )}

      {/* PTT error */}
      {pttError && !isTalking && (
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/90 border border-red-500/30 text-red-300 text-xs max-w-[260px]">
          {pttError}
        </div>
      )}
    </div>
  );
}
