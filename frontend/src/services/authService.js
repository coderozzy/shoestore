import api from './api';

export const authService = {
    async login(username, password) {
        const response = await api.post('/auth/login', { username, password });
        const { token, username: user, role, expiresIn } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ username: user, role }));

        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    isAdmin() {
        const user = this.getUser();
        return user?.role === 'ADMIN';
    },

    isStaff() {
        const user = this.getUser();
        return user?.role === 'STAFF' || user?.role === 'ADMIN';
    }
};

export default authService;
