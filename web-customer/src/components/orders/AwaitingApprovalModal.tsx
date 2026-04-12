"use client";

import { ShieldCheck, X, Phone } from "lucide-react";
import { useTranslations } from "@/localization";
import { useOrderModalsStore } from "@/store/orderModalsStore";

export function AwaitingApprovalModal() {
    const { t } = useTranslations();
    const { awaitingVisible, awaitingReasons, hideAwaitingApproval } = useOrderModalsStore();

    if (!awaitingVisible) return null;

    const reasonKeys: Record<string, string> = {
        FIRST_ORDER: "orders.awaiting_approval_modal.reason_first_order",
        HIGH_VALUE: "orders.awaiting_approval_modal.reason_high_value",
        OUT_OF_ZONE: "orders.awaiting_approval_modal.reason_out_of_zone",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={hideAwaitingApproval}
            />

            {/* Sheet / Card */}
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl">
                {/* Close */}
                <button
                    onClick={hideAwaitingApproval}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--background-secondary)] hover:bg-[var(--border)] transition-colors"
                >
                    <X size={14} />
                </button>

                {/* Icon */}
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
                        <ShieldCheck size={32} className="text-amber-500" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-center text-lg font-extrabold text-[var(--foreground)]">
                    {t("orders.awaiting_approval_modal.title")}
                </h2>
                <p className="mt-1 text-center text-sm text-[var(--foreground-secondary)]">
                    {t("orders.awaiting_approval_modal.subtitle")}
                </p>

                {/* Reasons */}
                {awaitingReasons.length > 0 && (
                    <ul className="mt-4 space-y-2">
                        {awaitingReasons.map((reason) => (
                            <li
                                key={reason}
                                className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400"
                            >
                                <span className="mt-0.5 shrink-0">•</span>
                                <span>{t(reasonKeys[reason] ?? "orders.awaiting_approval_modal.reason_first_order")}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Agent note */}
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--background-secondary)] px-3 py-2">
                    <Phone size={14} className="mt-0.5 shrink-0 text-[var(--foreground-secondary)]" />
                    <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                        {t("orders.awaiting_approval_modal.agent_call_note")}
                    </p>
                </div>

                {/* Dismiss */}
                <button
                    onClick={hideAwaitingApproval}
                    className="mt-5 w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                >
                    {t("orders.awaiting_approval_modal.dismiss")}
                </button>
            </div>
        </div>
    );
}
