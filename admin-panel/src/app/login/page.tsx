"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

export default function LoginPage() {
    const router = useRouter();
    const { login, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <div className="text-zinc-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
            <div className="w-full max-w-sm">
                <div className="bg-[#111113] border border-[#1e1e22] rounded-2xl p-7 shadow-xl">
                    {/* Header */}
                    <div className="mb-6 text-center">
                        <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center mx-auto mb-4">
                            <span className="text-white text-sm font-bold">DG</span>
                        </div>
                        <h1 className="text-lg font-semibold text-zinc-100">
                            Admin Panel
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">
                            Sign in to continue
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isSubmitting || !email || !password}
                            className="w-full py-2.5"
                        >
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-zinc-800/50 text-center">
                        <p className="text-zinc-600 text-xs">
                            Delivery Gjilan &copy; 2025
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
