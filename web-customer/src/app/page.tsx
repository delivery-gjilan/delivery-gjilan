"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
    const router = useRouter();
    const { isAuthenticated, authCheckComplete } = useAuth();

    useEffect(() => {
        if (!authCheckComplete) return;
        if (isAuthenticated) {
            router.replace("/restaurants");
        } else {
            router.replace("/login");
        }
    }, [authCheckComplete, isAuthenticated, router]);

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
        </div>
    );
}
