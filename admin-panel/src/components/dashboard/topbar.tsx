// src/components/dashboard/Topbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import { LogOut, Shield, Briefcase, StoreIcon, Clock, Megaphone, Truck, Map, Package, Timer, PhoneCall } from "lucide-react";
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
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [earlyDispatchMin, setEarlyDispatchMin] = useState(5);
  const [gracePeriodMin, setGracePeriodMin] = useState(0);
  const [farOrderThreshold, setFarOrderThreshold] = useState(5);
  const [gasPriorityWindow, setGasPriorityWindow] = useState(30);

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
  const googleMapsNavEnabled = storeStatus?.googleMapsNavEnabled ?? false;
  const inventoryModeEnabled = storeStatus?.inventoryModeEnabled ?? false;
  const directDispatchGlobalEnabled = storeStatus?.directDispatchEnabled ?? false;
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
          bannerType: (storeStatus?.bannerType as BannerType | undefined) ?? BannerType.Info,
          dispatchModeEnabled: !dispatchModeEnabled,
        },
      },
    });
  };

  const handleToggleGoogleMapsNav = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled,
          bannerMessage: storeStatus?.bannerMessage ?? null,
          bannerType: (storeStatus?.bannerType as BannerType | undefined) ?? BannerType.Info,
          googleMapsNavEnabled: !googleMapsNavEnabled,
        },
      },
    });
  };

  const handleToggleInventoryMode = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled,
          bannerMessage: storeStatus?.bannerMessage ?? null,
          bannerType: (storeStatus?.bannerType as BannerType | undefined) ?? BannerType.Info,
          inventoryModeEnabled: !inventoryModeEnabled,
        },
      },
    });
  };

  const handleOpenTimingModal = () => {
    setEarlyDispatchMin(storeStatus?.earlyDispatchLeadMinutes ?? 5);
    setGracePeriodMin(storeStatus?.businessGracePeriodMinutes ?? 0);
    setFarOrderThreshold(storeStatus?.farOrderThresholdKm ?? 5);
    setGasPriorityWindow(storeStatus?.gasPriorityWindowSeconds ?? 30);
    setShowTimingModal(true);
  };

  const handleToggleDirectDispatch = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled,
          bannerMessage: storeStatus?.bannerMessage ?? null,
          bannerType: (storeStatus?.bannerType as BannerType | undefined) ?? BannerType.Info,
          directDispatchEnabled: !directDispatchGlobalEnabled,
        },
      },
    });
  };

  const handleSaveTiming = async () => {
    await updateStoreStatus({
      variables: {
        input: {
          isStoreClosed,
          bannerEnabled,
          bannerMessage: storeStatus?.bannerMessage ?? null,
          bannerType: (storeStatus?.bannerType as BannerType | undefined) ?? BannerType.Info,
          earlyDispatchLeadMinutes: earlyDispatchMin,
          businessGracePeriodMinutes: gracePeriodMin,
          farOrderThresholdKm: farOrderThreshold,
          gasPriorityWindowSeconds: gasPriorityWindow,
        },
      },
    });
    setShowTimingModal(false);
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

              <button
                onClick={handleToggleDispatch}
                disabled={updating}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  dispatchModeEnabled
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
                title={dispatchModeEnabled ? 'Dispatch mode ON — you assign orders manually' : 'Self-assign mode — drivers race to accept'}
              >
                <Truck size={12} />
                {dispatchModeEnabled ? 'Dispatching' : 'Self-assign'}
              </button>

              <div className="w-px h-4 bg-zinc-800" />

              <button
                onClick={handleToggleGoogleMapsNav}
                disabled={updating}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  googleMapsNavEnabled
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={googleMapsNavEnabled ? 'Google Maps nav ON — drivers see nav picker' : 'Google Maps nav OFF — drivers go straight to in-app nav'}
              >
                <Map size={12} />
                {googleMapsNavEnabled ? 'GMap picker ON' : 'GMap picker OFF'}
              </button>

              <div className="w-px h-4 bg-zinc-800" />

              <button
                onClick={handleToggleInventoryMode}
                disabled={updating}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  inventoryModeEnabled
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={inventoryModeEnabled ? 'Inventory mode ON — orders show stock coverage' : 'Inventory mode OFF — all orders go to market'}
              >
                <Package size={12} />
                {inventoryModeEnabled ? 'Stock ON' : 'Stock OFF'}
              </button>

              <div className="w-px h-4 bg-zinc-800" />

              <button
                onClick={handleToggleDirectDispatch}
                disabled={updating}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  directDispatchGlobalEnabled
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={directDispatchGlobalEnabled ? 'Direct dispatch ON — businesses can request drivers for call-in orders' : 'Direct dispatch OFF — businesses cannot request drivers'}
              >
                <PhoneCall size={12} />
                {directDispatchGlobalEnabled ? 'Direct ON' : 'Direct OFF'}
              </button>

              <div className="w-px h-4 bg-zinc-800" />

              <button
                onClick={handleOpenTimingModal}
                disabled={updating}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Configure dispatch timing and business notification grace period"
              >
                <Timer size={12} />
                Timing
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

      {/* Dispatch Timing Modal */}
      <Modal
        isOpen={showTimingModal}
        onClose={() => setShowTimingModal(false)}
        title="Dispatch Timing"
      >
        <div className="space-y-5">
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
            <p className="text-blue-200/80 text-xs">
              Configure how early drivers are notified before an order is ready, and how long
              to delay the business notification after an order is placed.
            </p>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Early Driver Dispatch (minutes before ready)</label>
            <p className="text-[11px] text-zinc-600 mb-2">
              Drivers get notified this many minutes before the food is estimated to be ready, giving them time to travel.
              Set to 0 to only notify drivers when the order is marked READY.
            </p>
            <input
              type="number"
              min={0}
              max={30}
              value={earlyDispatchMin}
              onChange={(e) => setEarlyDispatchMin(Math.max(0, Math.min(30, Number(e.target.value))))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Business Grace Period (minutes)</label>
            <p className="text-[11px] text-zinc-600 mb-2">
              Delay the business notification by this many minutes after an order is placed.
              This gives customers a window to call and cancel before the business starts working.
              Set to 0 for immediate notification.
            </p>
            <input
              type="number"
              min={0}
              max={10}
              value={gracePeriodMin}
              onChange={(e) => setGracePeriodMin(Math.max(0, Math.min(10, Number(e.target.value))))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="border-t border-zinc-800/50 pt-4">
            <p className="text-xs font-medium text-zinc-300 mb-3">Gas-Priority Dispatch</p>
            <p className="text-[11px] text-zinc-500 mb-4">
              When the nearest driver is farther than the threshold, gas-vehicle drivers are notified first.
              Electric drivers are notified after the priority window. Set threshold to 0 to disable.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Far Order Threshold (km)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={farOrderThreshold}
                  onChange={(e) => setFarOrderThreshold(Math.max(0, Math.min(50, Number(e.target.value))))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Gas Priority Window (seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  step={5}
                  value={gasPriorityWindow}
                  onChange={(e) => setGasPriorityWindow(Math.max(10, Math.min(120, Number(e.target.value))))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800/50">
            <Button variant="outline" onClick={() => setShowTimingModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTiming}
              disabled={updating}
            >
              {updating ? "Saving..." : "Save Timing"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

