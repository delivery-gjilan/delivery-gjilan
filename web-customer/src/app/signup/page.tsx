"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { INITIATE_SIGNUP_MUTATION } from "@/graphql/operations/auth/initiateSignup";
import { VERIFY_EMAIL_MUTATION } from "@/graphql/operations/auth/verifyEmail";
import { SUBMIT_PHONE_NUMBER_MUTATION } from "@/graphql/operations/auth/submitPhoneNumber";
import { VERIFY_PHONE_MUTATION } from "@/graphql/operations/auth/verifyPhone";
import { RESEND_EMAIL_VERIFICATION_MUTATION } from "@/graphql/operations/auth/resendEmailVerification";
import Link from "next/link";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import type { InitiateSignupResult, SignupStepResult } from "@/types/graphql";

type SignupStep = "account" | "verify-email" | "add-phone" | "verify-phone" | "complete";

export default function SignupPage() {
    const router = useRouter();
    const { loginWithToken } = useAuth();
    const { t } = useTranslations();

    const [step, setStep] = useState<SignupStep>("account");
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Account fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Verification fields
    const [emailCode, setEmailCode] = useState("");
    const [phone, setPhone] = useState("");
    const [phoneCode, setPhoneCode] = useState("");

    const [initiateSignup, { loading: signupLoading }] = useMutation(INITIATE_SIGNUP_MUTATION);
    const [verifyEmail, { loading: verifyEmailLoading }] = useMutation(VERIFY_EMAIL_MUTATION);
    const [submitPhone, { loading: phoneLoading }] = useMutation(SUBMIT_PHONE_NUMBER_MUTATION);
    const [verifyPhone, { loading: verifyPhoneLoading }] = useMutation(VERIFY_PHONE_MUTATION);
    const [resendEmail, { loading: resendLoading }] = useMutation(RESEND_EMAIL_VERIFICATION_MUTATION);

    const handleInitiateSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await initiateSignup({
                variables: {
                    input: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password },
                },
            });
            const data = (res.data as { initiateSignup?: InitiateSignupResult } | undefined)?.initiateSignup;
            if (data?.token && data?.user) {
                loginWithToken(data.token, null, data.user);
                setUserId(data.user.id);
                setStep("verify-email");
            } else {
                setError(data?.message ?? t("auth.signup_failed"));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.signup_failed"));
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await verifyEmail({ variables: { input: { userId, code: emailCode } } });
            const data = (res.data as { verifyEmail?: SignupStepResult } | undefined)?.verifyEmail;
            if (data?.currentStep) {
                setStep("add-phone");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.verify_error"));
        }
    };

    const handleSubmitPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await submitPhone({ variables: { input: { userId, phoneNumber: phone.trim() } } });
            const data = (res.data as { submitPhoneNumber?: SignupStepResult } | undefined)?.submitPhoneNumber;
            if (data?.currentStep) {
                setStep("verify-phone");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.verify_error"));
        }
    };

    const handleVerifyPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await verifyPhone({ variables: { input: { userId, code: phoneCode } } });
            const data = (res.data as { verifyPhone?: SignupStepResult } | undefined)?.verifyPhone;
            if (data?.currentStep) {
                setStep("complete");
                setTimeout(() => router.push("/"), 2000);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("auth.verify_error"));
        }
    };

    const handleResendEmail = async () => {
        try {
            await resendEmail({ variables: { userId } });
        } catch {
            // ignore
        }
    };

    const stepLabels: Record<SignupStep, string> = {
        account: t("auth.create_account"),
        "verify-email": t("auth.verify_email"),
        "add-phone": t("auth.add_phone"),
        "verify-phone": t("auth.verify_phone"),
        complete: t("auth.signup_complete"),
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">{stepLabels[step]}</h1>
                </div>

                {/* Step 1: Account Details */}
                {step === "account" && (
                    <form onSubmit={handleInitiateSignup} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder={t("auth.first_name")}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                            <Input
                                placeholder={t("auth.last_name")}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                        <Input
                            type="email"
                            placeholder={t("auth.email")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                        <Input
                            type="password"
                            placeholder={t("auth.password")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                        {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}
                        <Button type="submit" size="lg" className="w-full" disabled={signupLoading}>
                            {signupLoading ? <Loader2 size={16} className="animate-spin" /> : t("auth.continue")}
                        </Button>
                        <p className="text-center text-sm text-[var(--foreground-secondary)]">
                            {t("auth.have_account")}{" "}
                            <Link href="/login" className="text-[var(--primary)] hover:underline">
                                {t("auth.login")}
                            </Link>
                        </p>
                    </form>
                )}

                {/* Step 2: Verify Email */}
                {step === "verify-email" && (
                    <form onSubmit={handleVerifyEmail} className="space-y-4">
                        <p className="text-sm text-[var(--foreground-secondary)] text-center">
                            {t("auth.email_code_sent", { email })}
                        </p>
                        <Input
                            placeholder={t("auth.verification_code")}
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            required
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                        />
                        {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}
                        <Button type="submit" size="lg" className="w-full" disabled={verifyEmailLoading}>
                            {verifyEmailLoading ? <Loader2 size={16} className="animate-spin" /> : t("auth.verify")}
                        </Button>
                        <button
                            type="button"
                            onClick={handleResendEmail}
                            disabled={resendLoading}
                            className="w-full text-center text-sm text-[var(--primary)] hover:underline"
                        >
                            {t("auth.resend_code")}
                        </button>
                    </form>
                )}

                {/* Step 3: Add Phone */}
                {step === "add-phone" && (
                    <form onSubmit={handleSubmitPhone} className="space-y-4">
                        <p className="text-sm text-[var(--foreground-secondary)] text-center">
                            {t("auth.add_phone_subtitle")}
                        </p>
                        <Input
                            type="tel"
                            placeholder={t("auth.phone_number")}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                        {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}
                        <Button type="submit" size="lg" className="w-full" disabled={phoneLoading}>
                            {phoneLoading ? <Loader2 size={16} className="animate-spin" /> : t("auth.continue")}
                        </Button>
                    </form>
                )}

                {/* Step 4: Verify Phone */}
                {step === "verify-phone" && (
                    <form onSubmit={handleVerifyPhone} className="space-y-4">
                        <p className="text-sm text-[var(--foreground-secondary)] text-center">
                            {t("auth.phone_code_sent", { phone })}
                        </p>
                        <Input
                            placeholder={t("auth.verification_code")}
                            value={phoneCode}
                            onChange={(e) => setPhoneCode(e.target.value)}
                            required
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                        />
                        {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}
                        <Button type="submit" size="lg" className="w-full" disabled={verifyPhoneLoading}>
                            {verifyPhoneLoading ? <Loader2 size={16} className="animate-spin" /> : t("auth.verify")}
                        </Button>
                    </form>
                )}

                {/* Complete */}
                {step === "complete" && (
                    <div className="text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
                            <Check size={32} className="text-[var(--success)]" />
                        </div>
                        <p className="text-sm text-[var(--foreground-secondary)]">{t("auth.redirecting")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
