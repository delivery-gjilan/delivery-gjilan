// src/components/dashboard/Topbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import { LogOut, Shield, Briefcase, StoreIcon, Clock, Megaphone, Truck } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_STORE_STATUS, UPDATE_STORE_STATUS } from "@/graphql/operations/store";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { BannerType } from "@/gql/graphql";

export default function Topbar() {
  const router = useRouter();
  const { admin, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerType, setBannerType] = useState<BannerType>(BannerType.Info);

  const { data: storeStatusData, refetch } = useQuery(GET_STORE_STATUS);
  const [updateStoreStatus, { loading: updating }] = useMutation(UPDATE_STORE_STATUS, {
    onCompleted: () => {
      refetch();
      setShowModal(false);
      setShowBannerModal(false);
    },
  });

  const storeStatus = storeStatusData?.getStoreStatus;
  const isStoreClosed = storeStatus?.isStoreClosed ?? false;
  const bannerEnabled = storeStatus?.bannerEnabled ?? false;
  const dispatchModeEnabled = storeStatus?.dispatchModeEnabled ?? false;
  const assignmentModeLabel = dispatchModeEnabled ? 'Dispatch mode' : 'Self-assign mode';
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  const handleToggleStore = async (close: boolean) => {
    if (close) {
      // Show modal to customize message
      setCustomMessage(storeStatus?.closedMessage || "We are too busy at the moment. Please come back later!");
      setShowModal(true);
    } else {
      // Open store immediately
      await updateStoreStatus({
        variables: {
          input: {
            isStoreClosed: false,
            closedMessage: storeStatus?.closedMessage,
          },
        },
      });
    }
  };

  const handleConfirmClose = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed: true,
          closedMessage: customMessage,
        },
      },
    });
  };

  const handleOpenBannerModal = () => {
    setBannerMessage(storeStatus?.bannerMessage || "");
    setBannerType((storeStatus?.bannerType as BannerType) || BannerType.Info);
    setShowBannerModal(true);
  };

  const handleSaveBanner = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled: true,
          bannerMessage,
          bannerType,
        },
      },
    });
  };

  const handleDisableBanner = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled: false,
          bannerMessage: null,
        },
      },
    });
  };

  const handleToggleDispatch = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled,
          bannerMessage: storeStatus?.bannerMessage ?? null,
          bannerType: storeStatus?.bannerType as any ?? 'INFO',
          dispatchModeEnabled: !dispatchModeEnabled,
        },
      },
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <header className="h-12 bg-[#09090b] border-b border-[#1e1e22] flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                isStoreClosed
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isStoreClosed ? 'bg-red-400' : 'bg-emerald-400'}`} />
                {isStoreClosed ? 'Closed' : 'Live'}
              </div>
              <button
                onClick={() => handleToggleStore(!isStoreClosed)}
                disabled={updating}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isStoreClosed ? 'Open store' : 'Close'}
              </button>

              <div className="w-px h-4 bg-zinc-800" />

              <button
                onClick={bannerEnabled ? handleDisableBanner : handleOpenBannerModal}
                disabled={updating}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  bannerEnabled
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Megaphone size={12} />
                {bannerEnabled ? 'Banner active' : 'Set banner'}
              </button>
              {bannerEnabled && (
                <button
                  onClick={handleOpenBannerModal}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Edit
                </button>
              )}

              <div className="w-px h-4 bg-zinc-800" />

              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span>Order mode</span>
                <span className="text-zinc-400">Currently:</span>
                <span className={`font-medium ${dispatchModeEnabled ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {assignmentModeLabel}
                </span>
              </div>

              <button
                onClick={handleToggleDispatch}
                disabled={updating}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  dispatchModeEnabled
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={dispatchModeEnabled ? 'Dispatch mode ON — you assign orders manually' : 'Self-assign mode — drivers race to accept'}
              >
                <Truck size={12} />
                {dispatchModeEnabled ? 'Dispatching' : 'Self-assign'}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {admin?.email || ""}
          </span>
          <button
            onClick={handleLogout}
            className="relative group p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
          >
            <LogOut size={15} />
            {/* Tooltip */}
            <div className="absolute top-full mt-2 right-0 px-2.5 py-1.5 bg-zinc-800 text-zinc-100 text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 -translate-y-1 transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-zinc-700/50 pointer-events-none">
              Logout
              {/* Arrow */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-zinc-800" />
            </div>
          </button>
        </div>
      </header>

      {/* Close Store Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Close Store"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
            <p className="text-amber-200/80 text-xs">
              Customers won&apos;t be able to place orders while the store is closed.
            </p>
          </div>

          <Input
            label="Message to Customers"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="We are too busy at the moment. Please come back later!"
          />
          <div className="text-xs text-neutral-500">
            This message will be displayed to customers when they try to access the app.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800/50">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmClose}
              disabled={updating || !customMessage.trim()}
            >
              {updating ? "Closing..." : "Close Store"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Banner Modal */}
      <Modal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        title="Information Banner"
      >
        <div className="space-y-4">
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
            <p className="text-blue-200/80 text-xs">
              This banner will be shown to all users across all apps. Use it for announcements, 
              high-demand warnings, or system status updates.
            </p>
          </div>

          <Input
            label="Banner Message"
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            placeholder="e.g. High demand right now — orders may take longer than usual"
          />

          <div>
            <label className="block text-xs text-zinc-400 mb-2">Banner Type</label>
            <div className="flex gap-2">
              {([
                { value: BannerType.Info, label: "Info", color: "blue" },
                { value: BannerType.Warning, label: "Warning", color: "amber" },
                { value: BannerType.Success, label: "Success", color: "emerald" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBannerType(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    bannerType === opt.value
                      ? `bg-${opt.color}-500/15 text-${opt.color}-400 border-${opt.color}-500/30`
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {bannerMessage && (
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Preview</label>
              <div className={`rounded-lg px-4 py-3 text-sm ${
                bannerType === BannerType.Warning
                  ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                  : bannerType === BannerType.Success
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-200 border border-blue-500/20'
              }`}>
                {bannerMessage}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800/50">
            <Button variant="outline" onClick={() => setShowBannerModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBanner}
              disabled={updating || !bannerMessage.trim()}
            >
              {updating ? "Saving..." : "Activate Banner"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

