"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { LOGIN_MUTATION } from "@/graphql/operations/auth/login";

interface Admin {
    id: string;
    email: string;
    name: string;
    role?: string | null;
    businessId?: string | null;
}

interface AuthContextType {
    admin: Admin | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [loading, setLoading] = useState(true);
    const [loginMutation] = useMutation(LOGIN_MUTATION);

    // Check if user is already logged in on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem("authToken");
                const adminData = localStorage.getItem("adminData");

                if (token && adminData) {
                    setAdmin(JSON.parse(adminData));
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                localStorage.removeItem("authToken");
                localStorage.removeItem("adminData");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data } = await loginMutation({
                variables: { email, password },
            });

            const loginResult = data?.login;
            if (!loginResult || !loginResult.token) {
                throw new Error(loginResult?.message || "Login failed");
            }

            // Only allow admins to access admin panel
            const userRole = loginResult.user?.role;
            if (userRole !== "BUSINESS_OWNER" && userRole !== "BUSINESS_EMPLOYEE" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
                throw new Error("Access denied. Only administrators can access this panel.");
            }

            const fullName = `${loginResult.user?.firstName ?? ""} ${loginResult.user?.lastName ?? ""}`.trim();

            const adminData: Admin = {
                id: loginResult.user?.id ?? "self",
                email,
                name: fullName || email,
                role: loginResult.user?.role ?? null,
                businessId: loginResult.user?.businessId ?? null,
            };

            localStorage.setItem("authToken", loginResult.token);
            localStorage.setItem("adminData", JSON.stringify(adminData));
            setAdmin(adminData);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminData");
        setAdmin(null);
    };

    return (
        <AuthContext.Provider
            value={{
                admin,
                loading,
                login,
                logout,
                isAuthenticated: !!admin,
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
