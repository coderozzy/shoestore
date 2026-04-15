import api from './api';

export const authService = {
    async login(username, password) {
        const response = await api.post('/auth/login', { username, password });
        const { token, username: user, role } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ username: user, role }));

        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getUser() {
        const raw = localStorage.getItem('user');
        try {
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }
};

export default authService;
