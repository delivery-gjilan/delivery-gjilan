// src/components/dashboard/Topbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";
import { LogOut, Shield, Briefcase, StoreIcon, Clock } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_STORE_STATUS, UPDATE_STORE_STATUS } from "@/graphql/operations/store";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";

export default function Topbar() {
  const router = useRouter();
  const { admin, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const { data: storeStatusData, refetch } = useQuery(GET_STORE_STATUS);
  const [updateStoreStatus, { loading: updating }] = useMutation(UPDATE_STORE_STATUS, {
    onCompleted: () => {
      refetch();
      setShowModal(false);
    },
  });

  const storeStatus = storeStatusData?.getStoreStatus;
  const isStoreClosed = storeStatus?.isStoreClosed ?? false;

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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // TODO: Replace with actual role from auth context
  const role = "SUPER_ADMIN"; // or "BUSINESS_ADMIN"

  return (
    <>
      <header className="h-12 bg-[#09090b] border-b border-[#1e1e22] flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {admin?.email || ""}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
          >
            <LogOut size={15} />
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
    </>
  );
}

