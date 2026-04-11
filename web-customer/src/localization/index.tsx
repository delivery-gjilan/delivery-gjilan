"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "./en.json";
import al from "./al.json";

export type Locale = "en" | "al";

const translations: Record<Locale, Record<string, unknown>> = { en, al };

function humanizeFallbackKey(path: string): string {
    const last = path.split(".").pop() || path;
    return last
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split(".");
    let current: unknown = obj;
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (current == null || typeof current !== "object") return humanizeFallbackKey(path);
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : humanizeFallbackKey(path);
}

function interpolate(str: string, params?: Record<string, string | number>): string {
    if (!params) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`))
              .replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "preferred-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("en");

    useEffect(() => {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
        if (stored && (stored === "en" || stored === "al")) {
            setLocaleState(stored);
        }
    }, []);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            const value = getNestedValue(translations[locale] as Record<string, unknown>, key);
            return interpolate(value, params);
        },
        [locale]
    );

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslations() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error("useTranslations must be used within I18nProvider");
    }
    return context;
}
