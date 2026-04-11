"use client";

import { Header } from "@/components/layout/Header";
import { CartFloatingBar } from "@/components/layout/CartFloatingBar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, authCheckComplete } = useAuth();

    useEffect(() => {
        if (!authCheckComplete) return;
        if (!isAuthenticated) {
            router.replace("/login");
        }
    }, [authCheckComplete, isAuthenticated, router]);

    if (!authCheckComplete || !isAuthenticated) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
            </div>
        );
    }

    return (
        <>
            <Header />
            <main className="flex-1 pb-20 md:pb-0">
                {children}
            </main>
            <CartFloatingBar />
        </>
    );
}
