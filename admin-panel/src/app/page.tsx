"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
    const router = useRouter();
    const { isAuthenticated, loading, authCheckComplete } = useAuth();

    useEffect(() => {
        if (!authCheckComplete || loading) return;

        if (!isAuthenticated) {
            router.push("/login");
        } else {
            router.push("/dashboard/orders");
        }
    }, [isAuthenticated, loading, authCheckComplete, router]);

    if (loading || !authCheckComplete) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return null;
}
