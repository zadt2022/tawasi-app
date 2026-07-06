import { createContext, useContext, useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/auth/me");
                setUser(data);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            if (data.token) localStorage.setItem("access_token", data.token);
            setUser(data.user);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {}
        localStorage.removeItem("access_token");
        setUser(null);
    };

    const isAdmin = user?.role === "admin";
    const isManager = user?.role === "manager";
    const canEdit = isAdmin || isManager;

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, canEdit }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
