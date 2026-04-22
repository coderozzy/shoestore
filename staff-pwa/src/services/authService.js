import api from './api';

const USER_KEY = 'staff-user';

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
        // noop
    }
}

function clearCachedUser() {
    try {
        sessionStorage.removeItem(USER_KEY);
    } catch {
        // noop
    }
}

// JWT is delivered and carried by an HttpOnly cookie set at /api/auth/login.
// The staff PWA never sees the raw token — prevents the XSS-to-token-theft
// chain (C-7).
const authService = {
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
            // ignore
        }
        clearCachedUser();
        // M-2: also dump any cached authenticated API responses so the next
        // sign-in on a shared device doesn't leak stale data.
        if (typeof caches !== 'undefined') {
            try {
                await caches.delete('api-cache');
            } catch {
                // noop
            }
        }
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
    }
};

export default authService;
