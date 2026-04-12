"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <main className="flex-1 pb-20 md:pb-0 md:pt-0">
                {children}
            </main>
            <Footer />
        </>
    );
}
