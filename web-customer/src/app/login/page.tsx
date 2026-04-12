"use client";

import { Suspense, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LOGIN_MUTATION } from "@/graphql/operations/auth/login";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 size={24} className="animate-spin text-[var(--muted)]" /></div>}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loginWithToken } = useAuth();
    const { t } = useTranslations();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await loginMutation({
                variables: { input: { email: email.trim(), password } },
            });
            const data = (res.data as any)?.login;
            if (data?.token && data?.user) {
                loginWithToken(data.token, data.refreshToken, data.user);
                const nextPath = searchParams.get("next");
                const safeNext = nextPath && nextPath.startsWith("/") ? nextPath : "/";
                router.push(safeNext);
            } else {
                setError(data?.message ?? t("auth.login_failed"));
            }
        } catch (err: any) {
            setError(err.message ?? t("auth.login_failed"));
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("auth.login")}</h1>
                    <p className="text-sm text-[var(--foreground-secondary)]">{t("auth.login_subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="email"
                        placeholder={t("auth.email")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.password")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}

                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : t("auth.login")}
                    </Button>
                </form>

                <div className="text-center space-y-2 text-sm">
                    <Link href="/forgot-password" className="text-[var(--primary)] hover:underline">
                        {t("auth.forgot_password")}
                    </Link>
                    <p className="text-[var(--foreground-secondary)]">
                        {t("auth.no_account")}{" "}
                        <Link href="/signup" className="text-[var(--primary)] hover:underline">
                            {t("auth.sign_up")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
