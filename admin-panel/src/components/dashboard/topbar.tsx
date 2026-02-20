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
      <header className="h-14 bg-[#0a0a0a] border-b border-[#262626] flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] border border-[#262626] rounded-lg">
            {role === "SUPER_ADMIN" ? (
              <>
                <Shield size={16} className="text-cyan-500" />
                <span className="text-sm font-medium text-white">Super Admin</span>
              </>
            ) : (
              <>
                <Briefcase size={16} className="text-neutral-400" />
                <span className="text-sm font-medium text-white">Business Admin</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Store Status Toggle */}
          <Button
            variant={isStoreClosed ? "danger" : "outline"}
            size="sm"
            onClick={() => handleToggleStore(!isStoreClosed)}
            disabled={updating}
          >
            {isStoreClosed ? (
              <>
                <Clock size={16} className="mr-2" />
                Store Closed
              </>
            ) : (
              <>
                <StoreIcon size={16} className="mr-2" />
                Store Open
              </>
            )}
          </Button>

          <span className="text-sm text-neutral-400">
            {admin?.email || "Loading..."}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Close Store Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Close Store"
      >
        <div className="space-y-4">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">
              ⚠️ When you close the store, customers won&apos;t be able to place orders. 
              They will see the message below when they open the app.
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

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
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

