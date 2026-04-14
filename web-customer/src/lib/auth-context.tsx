"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { LOGIN_MUTATION } from "@/graphql/operations/auth/login";
import { ME_QUERY } from "@/graphql/operations/auth/me";
import type { LoginResult, MeResult } from "@/types/graphql";

export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    signupStep: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    phoneNumber: string | null;
    role: string | null;
    preferredLanguage: string | null;
    emailOptOut: boolean | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authCheckComplete: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithToken: (token: string, refreshToken: string | null, userData: Partial<User>) => void;
    logout: () => void;
    isAuthenticated: boolean;
    needsSignupCompletion: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COMPLETED_SIGNUP_STEP = "COMPLETED";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authCheckComplete, setAuthCheckComplete] = useState(false);
    const [hasStoredToken, setHasStoredToken] = useState(false);
    const [loginMutation] = useMutation(LOGIN_MUTATION);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem("authToken");
                const userData = localStorage.getItem("userData");
                if (token && userData) {
                    setUser(JSON.parse(userData));
                    setHasStoredToken(true);
                }
            } catch {
                localStorage.removeItem("authToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("userData");
            } finally {
                setLoading(false);
                setAuthCheckComplete(true);
            }
        };
        checkAuth();
    }, []);

    // Validate the stored token server-side on mount
    const { data: meData, error: meError } = useQuery(ME_QUERY, {
        skip: !hasStoredToken,
        fetchPolicy: "network-only",
    });

    useEffect(() => {
        const me = (meData as { me?: MeResult } | undefined)?.me;
        if (!me) return;
        const validated: User = {
            id: me.id ?? "",
            email: me.email ?? "",
            firstName: me.firstName ?? null,
            lastName: me.lastName ?? null,
            signupStep: me.signupStep ?? null,
            emailVerified: me.emailVerified ?? false,
            phoneVerified: me.phoneVerified ?? false,
            phoneNumber: me.phoneNumber ?? null,
            role: me.role ?? null,
            preferredLanguage: me.preferredLanguage ?? null,
            emailOptOut: me.emailOptOut ?? null,
        };
        localStorage.setItem("userData", JSON.stringify(validated));
        setUser(validated);
    }, [meData]);

    useEffect(() => {
        if (!meError) return;
        // Token is invalid or expired — clear auth state
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userData");
        setUser(null);
        setHasStoredToken(false);
    }, [meError]);

    const login = useCallback(
        async (email: string, password: string) => {
            setLoading(true);
            try {
                const { data } = await loginMutation({
                    variables: { input: { email, password } },
                });

                const loginResult = (data as { login?: LoginResult } | undefined)?.login;
                if (!loginResult?.token) {
                    throw new Error(loginResult?.message || "Login failed");
                }

                const u: User = {
                    id: loginResult.user?.id ?? "",
                    email: loginResult.user?.email ?? email,
                    firstName: loginResult.user?.firstName ?? null,
                    lastName: loginResult.user?.lastName ?? null,
                    signupStep: loginResult.user?.signupStep ?? null,
                    emailVerified: loginResult.user?.emailVerified ?? false,
                    phoneVerified: loginResult.user?.phoneVerified ?? false,
                    phoneNumber: loginResult.user?.phoneNumber ?? null,
                    role: loginResult.user?.role ?? null,
                    preferredLanguage: loginResult.user?.preferredLanguage ?? null,
                    emailOptOut: null,
                };

                localStorage.setItem("authToken", loginResult.token);
                if (loginResult.refreshToken) {
                    localStorage.setItem("refreshToken", loginResult.refreshToken);
                }
                localStorage.setItem("userData", JSON.stringify(u));
                setUser(u);
            } finally {
                setLoading(false);
            }
        },
        [loginMutation]
    );

    const logout = useCallback(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userData");
        setUser(null);
    }, []);

    const loginWithToken = useCallback(
        (token: string, refreshToken: string | null, userData: Partial<User>) => {
            localStorage.setItem("authToken", token);
            if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
            const u: User = {
                id: userData.id ?? "",
                email: userData.email ?? "",
                firstName: userData.firstName ?? null,
                lastName: userData.lastName ?? null,
                signupStep: userData.signupStep ?? null,
                emailVerified: userData.emailVerified ?? false,
                phoneVerified: userData.phoneVerified ?? false,
                phoneNumber: userData.phoneNumber ?? null,
                role: userData.role ?? null,
                preferredLanguage: userData.preferredLanguage ?? null,
                emailOptOut: null,
            };
            localStorage.setItem("userData", JSON.stringify(u));
            setUser(u);
        },
        []
    );

    const needsSignupCompletion = !!user && user.signupStep !== COMPLETED_SIGNUP_STEP;

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                authCheckComplete,
                login,
                loginWithToken,
                logout,
                isAuthenticated: !!user,
                needsSignupCompletion,
                setUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
