import axios from 'axios';

// Auth is now carried by an HttpOnly cookie set by the backend on login.
// `withCredentials: true` makes axios include that cookie on every request
// from this SPA. We no longer read a JWT from localStorage (C-7).
const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            try {
                sessionStorage.removeItem('admin-user');
            } catch {
                // noop
            }
            if (!window.location.pathname.endsWith('/login')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
