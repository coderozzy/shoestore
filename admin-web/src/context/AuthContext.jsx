import { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        // Cookie-based auth means we can't tell from JS alone whether the
        // browser still holds a valid session cookie. Ask the server.
        authService.refreshUser()
            .then((refreshed) => {
                if (!cancelled) {
                    setUser(refreshed);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const login = async (username, password) => {
        const response = await authService.login(username, password);
        setUser({ username: response.username, role: response.role });
        return response;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: () => user?.role === 'ADMIN'
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
