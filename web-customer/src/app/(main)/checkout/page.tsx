"use client";

import { useRouter } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export default function CheckoutPage() {
    const router = useRouter();
    return (
        <div className="mx-auto max-w-2xl">
            <CheckoutFlow onClose={() => router.push("/")} />
        </div>
    );
}
