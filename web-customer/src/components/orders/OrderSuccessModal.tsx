"use client";

import { useEffect } from "react";
import { CheckCircle, Package, X } from "lucide-react";
import { useTranslations } from "@/localization";
import { useOrderModalsStore } from "@/store/orderModalsStore";

export function OrderSuccessModal() {
    const { t } = useTranslations();
    const { successVisible, successType, hideOrderSuccess } = useOrderModalsStore();

    const isDelivered = successType === "order_delivered";

    // Auto-dismiss after 5s for both modals
    useEffect(() => {
        if (!successVisible) return;
        const timer = setTimeout(hideOrderSuccess, 5000);
        return () => clearTimeout(timer);
    }, [successVisible, hideOrderSuccess]);

    if (!successVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={hideOrderSuccess}
            />

            {/* Card */}
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl overflow-hidden">
                {/* Accent bar */}
                <div
                    className="h-1 w-full"
                    style={{ backgroundColor: isDelivered ? "var(--success)" : "var(--primary)" }}
                />

                <div className="p-7 text-center">
                    {/* Close */}
                    <button
                        onClick={hideOrderSuccess}
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background-secondary)] hover:bg-[var(--card-hover)] transition-colors text-[var(--muted)]"
                    >
                        <X size={14} />
                    </button>

                    {/* Icon */}
                    <div className="mb-5 flex justify-center">
                        <div
                            className="flex h-20 w-20 items-center justify-center rounded-full"
                            style={{
                                backgroundColor: isDelivered ? "color-mix(in srgb, var(--success) 15%, transparent)" : "var(--primary-light)",
                            }}
                        >
                            {isDelivered ? (
                                <CheckCircle size={44} style={{ color: "var(--success)" }} />
                            ) : (
                                <Package size={44} style={{ color: "var(--primary)" }} />
                            )}
                        </div>
                    </div>

                    {/* Text */}
                    <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
                        {isDelivered
                            ? t("orders.details.order_delivered")
                            : t("cart.order_success_title")}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--foreground-secondary)] leading-relaxed">
                        {isDelivered
                            ? t("orders.details.order_delivered_message")
                            : t("cart.order_success_subtitle")}
                    </p>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-2">
                        <button
                            onClick={hideOrderSuccess}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] py-3 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--card-hover)] transition-colors"
                        >
                            {t("common.close")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
