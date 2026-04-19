import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// `withCredentials: true` attaches the HttpOnly auth cookie to every API
// request. The JWT never touches JavaScript memory — XSS inside the PWA
// can't steal it (C-7).
const api = axios.create({
    baseURL: API_URL,
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
                sessionStorage.removeItem('staff-user');
            } catch {
                // noop
            }
            if (!window.location.pathname.endsWith('/login')) {
                window.location.href = '/app/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
