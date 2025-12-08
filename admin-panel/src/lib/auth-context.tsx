"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Admin {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    admin: Admin | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin credentials for testing
const MOCK_ADMIN = {
    email: "admin@delivery-gjilan.com",
    password: "admin123",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const adminData = localStorage.getItem("adminData");
                if (adminData) {
                    setAdmin(JSON.parse(adminData));
                }
            } catch (error) {
                console.error("Auth check failed:", error);
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
            // Mock login - replace with actual API call when backend is ready
            if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
                const adminData: Admin = {
                    id: "1",
                    email: email,
                    name: "Admin",
                };
                localStorage.setItem("adminData", JSON.stringify(adminData));
                setAdmin(adminData);
            } else {
                throw new Error("Invalid email or password");
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
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
