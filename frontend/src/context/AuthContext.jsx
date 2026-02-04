import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = authService.getUser();
        if (storedUser && authService.isAuthenticated()) {
            setUser(storedUser);
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await authService.login(username, password);
        setUser({ username: response.username, role: response.role });
        return response;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const isAdmin = () => {
        return user?.role === 'ADMIN';
    };

    const isStaff = () => {
        return user?.role === 'STAFF' || user?.role === 'ADMIN';
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin,
        isStaff
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
