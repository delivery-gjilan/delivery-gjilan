"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { REQUEST_PASSWORD_RESET_MUTATION } from "@/graphql/operations/auth/passwordReset";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const { t } = useTranslations();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await requestReset({ variables: { email: email.trim() } });
            setSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.reset_error"));
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-6">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                >
                    <ArrowLeft size={16} />
                    {t("auth.back_to_login")}
                </Link>

                {sent ? (
                    <div className="text-center space-y-4">
                        <CheckCircle size={48} className="mx-auto text-[var(--success)]" />
                        <h1 className="text-xl font-bold">{t("auth.reset_sent_title")}</h1>
                        <p className="text-sm text-[var(--foreground-secondary)]">
                            {t("auth.reset_sent_message", { email })}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold">{t("auth.forgot_password")}</h1>
                            <p className="text-sm text-[var(--foreground-secondary)]">{t("auth.forgot_subtitle")}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                type="email"
                                placeholder={t("auth.email")}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}
                            <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : t("auth.send_reset_link")}
                            </Button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
