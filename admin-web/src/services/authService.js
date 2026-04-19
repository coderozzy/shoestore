import api from './api.js';

const USER_KEY = 'admin-user';

// Non-sensitive profile cache. The actual JWT now lives in an HttpOnly cookie
// set by the backend at /api/auth/login (C-7). JavaScript cannot read it, so
// XSS can't exfiltrate it.
function readCachedUser() {
    try {
        const raw = sessionStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeCachedUser(user) {
    try {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
        // ignore storage failures (private mode etc.)
    }
}

function clearCachedUser() {
    try {
        sessionStorage.removeItem(USER_KEY);
    } catch {
        // noop
    }
}

export const authService = {
    async login(username, password) {
        const response = await api.post('/auth/login', { username, password });
        const { username: user, role } = response.data;
        writeCachedUser({ username: user, role });
        return { username: user, role };
    },

    async logout() {
        try {
            await api.post('/auth/logout');
        } catch {
            // Even if the server call fails (expired cookie, 401) we still
            // want the local state cleared.
        }
        clearCachedUser();
    },

    async refreshUser() {
        try {
            const response = await api.get('/auth/me');
            const { username, role } = response.data;
            writeCachedUser({ username, role });
            return { username, role };
        } catch {
            clearCachedUser();
            return null;
        }
    },

    getUser() {
        return readCachedUser();
    },

    isAuthenticated() {
        return !!readCachedUser();
    }
};

export default authService;
