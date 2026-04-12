"use client";

import HomePage from "./(main)/page";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function RootHomePage() {
    return (
        <>
            <Header />
            <main className="flex-1 pb-20 md:pb-0">
                <HomePage />
            </main>
            <Footer />
        </>
    );
}
