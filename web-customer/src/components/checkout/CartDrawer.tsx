"use client";

import { useEffect } from "react";
import { useCartDrawerStore } from "@/store/cartDrawerStore";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export function CartDrawer() {
    const { isOpen, close } = useCartDrawerStore();

    // Prevent background scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [close]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={close}
                aria-hidden="true"
            />

            {/* Mobile: bottom sheet | Desktop: centered modal */}
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full sm:max-w-lg flex flex-col rounded-t-2xl sm:rounded-2xl bg-[var(--background)] shadow-2xl"
                    style={{ height: "min(92dvh, 700px)" }}
                >
                    {/* Drag handle (mobile) / close hint (desktop) */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
                    </div>

                    <CheckoutFlow onClose={close} drawerMode />
                </div>
            </div>
        </>
    );
}
