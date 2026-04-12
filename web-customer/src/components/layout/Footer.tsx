"use client";

import Link from "next/link";

export function Footer() {
    return (
        <footer className="mt-10 border-t border-[var(--border)] bg-[var(--background-secondary)]">
            <div className="w-full px-4 py-8 md:px-6 lg:px-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-[var(--foreground)]">Zipp Go</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">Food and grocery delivery, fast and simple.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-3">
                        <div className="space-y-2">
                            <p className="font-semibold text-[var(--foreground)]">Discover</p>
                            <Link href="/restaurants" className="block text-[var(--muted)] hover:text-[var(--foreground)]">Restaurants</Link>
                            <Link href="/market" className="block text-[var(--muted)] hover:text-[var(--foreground)]">Shops</Link>
                        </div>
                        <div className="space-y-2">
                            <p className="font-semibold text-[var(--foreground)]">Account</p>
                            <Link href="/login" className="block text-[var(--muted)] hover:text-[var(--foreground)]">Sign in</Link>
                            <Link href="/signup" className="block text-[var(--muted)] hover:text-[var(--foreground)]">Create account</Link>
                        </div>
                        <div className="space-y-2">
                            <p className="font-semibold text-[var(--foreground)]">Legal</p>
                            <a href="/legal/privacy.html" className="block text-[var(--muted)] hover:text-[var(--foreground)]">Privacy</a>
                            <a href="/legal/terms.html" className="block text-[var(--muted)] hover:text-[var(--foreground)]">Terms</a>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-xs text-[var(--muted)]">© {new Date().getFullYear()} Zipp Go</div>
            </div>
        </footer>
    );
}
