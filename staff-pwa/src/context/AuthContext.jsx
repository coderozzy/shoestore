import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        authService.refreshUser()
            .then((refreshed) => {
                if (!cancelled) setUser(refreshed);
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
        // Belt-and-braces: also tell the service worker to flush any cached
        // authenticated responses (M-2).
        if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'clear-api-cache' });
        }
    };

    const isAdmin = () => user?.role === 'ADMIN';

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
