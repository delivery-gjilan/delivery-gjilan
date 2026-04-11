"use client";

import { useState, Suspense } from "react";
import { useMutation } from "@apollo/client/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RESET_PASSWORD_MUTATION } from "@/graphql/operations/auth/passwordReset";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 size={24} className="animate-spin text-[var(--muted)]" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const { t } = useTranslations();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError(t("auth.passwords_dont_match"));
            return;
        }

        try {
            await resetPassword({ variables: { token, newPassword: password } });
            setSuccess(true);
            setTimeout(() => router.push("/login"), 3000);
        } catch (err: any) {
            setError(err.message ?? t("auth.reset_error"));
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
                <div className="text-center space-y-4">
                    <p className="text-[var(--danger)]">{t("auth.invalid_reset_link")}</p>
                    <Link href="/forgot-password">
                        <Button>{t("auth.request_new_link")}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-6">
                {success ? (
                    <div className="text-center space-y-4">
                        <CheckCircle size={48} className="mx-auto text-[var(--success)]" />
                        <h1 className="text-xl font-bold">{t("auth.password_reset_success")}</h1>
                        <p className="text-sm text-[var(--foreground-secondary)]">{t("auth.redirecting_to_login")}</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold">{t("auth.reset_password")}</h1>
                            <p className="text-sm text-[var(--foreground-secondary)]">{t("auth.new_password_subtitle")}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                type="password"
                                placeholder={t("auth.new_password")}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <Input
                                type="password"
                                placeholder={t("auth.confirm_password")}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}
                            <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : t("auth.reset_password")}
                            </Button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
