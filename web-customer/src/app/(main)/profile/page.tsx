"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/localization";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/store/favoritesStore";
import Link from "next/link";
import {
    User,
    MapPin,
    Heart,
    Globe,
    LogOut,
    Trash2,
    Loader2,
    ChevronRight,
    Moon,
    Sun,
} from "lucide-react";
import { UPDATE_MY_PROFILE_MUTATION } from "@/graphql/operations/auth/updateMyProfile";
import { SET_MY_PREFERRED_LANGUAGE_MUTATION } from "@/graphql/operations/auth/setMyPreferredLanguage";
import { SET_MY_EMAIL_OPT_OUT_MUTATION } from "@/graphql/operations/auth/setMyEmailOptOut";
import { DELETE_MY_ACCOUNT_MUTATION } from "@/graphql/operations/auth/deleteMyAccount";

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { t, locale, setLocale } = useTranslations();
    const favCount = useFavoritesStore((s) => s.favorites.length);

    const [editing, setEditing] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName ?? "");
    const [lastName, setLastName] = useState(user?.lastName ?? "");
    const [phone, setPhone] = useState(user?.phoneNumber ?? "");
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const [updateProfile, { loading: updateLoading }] = useMutation(UPDATE_MY_PROFILE_MUTATION);
    const [setLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE_MUTATION);
    const [setEmailOptOut] = useMutation(SET_MY_EMAIL_OPT_OUT_MUTATION);
    const [deleteAccount, { loading: deleteLoading }] = useMutation(DELETE_MY_ACCOUNT_MUTATION);

    if (!user) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
                <User size={48} className="mx-auto text-[var(--muted)]" />
                <h2 className="text-xl font-bold">{t("auth.login_required")}</h2>
                <div className="flex gap-3 justify-center">
                    <Link href="/login">
                        <Button>{t("auth.login")}</Button>
                    </Link>
                    <Link href="/signup">
                        <Button variant="outline">{t("auth.sign_up")}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleSaveProfile = async () => {
        try {
            await updateProfile({
                variables: {
                    input: {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        phoneNumber: phone.trim() || null,
                    },
                },
            });
            setEditing(false);
        } catch {
            // ignore
        }
    };

    const handleToggleLanguage = async () => {
        const newLocale = locale === "en" ? "al" : "en";
        setLocale(newLocale);
        try {
            await setLanguage({ variables: { language: newLocale === "al" ? "sq" : "en" } });
        } catch {
            // ignore
        }
    };

    const handleToggleTheme = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t("profile.delete_confirm"))) return;
        if (!confirm(t("profile.delete_double_confirm"))) return;
        try {
            await deleteAccount();
            logout();
        } catch {
            // ignore
        }
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{t("profile.title")}</h1>

            {/* User Info */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white text-lg font-bold">
                        {user.firstName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">
                            {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-[var(--muted)]">{user.email}</p>
                    </div>
                    <button
                        onClick={() => setEditing(!editing)}
                        className="text-sm text-[var(--primary)] hover:underline"
                    >
                        {editing ? t("common.cancel") : t("common.edit")}
                    </button>
                </div>

                {editing && (
                    <div className="space-y-3 border-t border-[var(--border)] pt-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder={t("auth.first_name")}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                            <Input
                                placeholder={t("auth.last_name")}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                        <Input
                            type="tel"
                            placeholder={t("auth.phone_number")}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        <Button onClick={handleSaveProfile} disabled={updateLoading} className="w-full">
                            {updateLoading ? <Loader2 size={14} className="animate-spin" /> : t("common.save")}
                        </Button>
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                <Link
                    href="/orders"
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <MapPin size={16} className="text-[var(--foreground-secondary)]" />
                    <span className="flex-1 text-sm">{t("orders.title")}</span>
                    <ChevronRight size={14} className="text-[var(--muted)]" />
                </Link>
                <Link
                    href="/addresses"
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <MapPin size={16} className="text-[var(--foreground-secondary)]" />
                    <span className="flex-1 text-sm">{t("address.title")}</span>
                    <ChevronRight size={14} className="text-[var(--muted)]" />
                </Link>
                <div className="flex items-center gap-3 px-4 py-3.5">
                    <Heart size={16} className="text-[var(--foreground-secondary)]" />
                    <span className="flex-1 text-sm">{t("profile.favorites")}</span>
                    <span className="text-xs text-[var(--muted)]">{favCount}</span>
                </div>
            </div>

            {/* Preferences */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                <button
                    onClick={handleToggleLanguage}
                    className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    <Globe size={16} className="text-[var(--foreground-secondary)]" />
                    <span className="flex-1 text-sm text-left">{t("profile.language")}</span>
                    <span className="text-xs font-medium text-[var(--primary)]">
                        {locale === "en" ? "English" : "Shqip"}
                    </span>
                </button>
                <button
                    onClick={handleToggleTheme}
                    className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-[var(--background-secondary)] transition-colors"
                >
                    {theme === "light" ? (
                        <Sun size={16} className="text-[var(--foreground-secondary)]" />
                    ) : (
                        <Moon size={16} className="text-[var(--foreground-secondary)]" />
                    )}
                    <span className="flex-1 text-sm text-left">{t("profile.theme")}</span>
                    <span className="text-xs font-medium text-[var(--primary)]">
                        {theme === "light" ? t("profile.light") : t("profile.dark")}
                    </span>
                </button>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={logout}>
                    <LogOut size={16} />
                    {t("auth.logout")}
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-3 text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                >
                    {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={16} />}
                    {t("profile.delete_account")}
                </Button>
            </div>
        </div>
    );
}
