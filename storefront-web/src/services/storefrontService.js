import axios from 'axios';

// `withCredentials` is set so that cookies used by any future auth flow ride
// along. Storefront is anonymous today; order lookup is gated by a signed
// token (C-4) that we persist to sessionStorage per order id.
const api = axios.create({
    baseURL: '/api/storefront',
    withCredentials: true
});

const tokenKey = (orderId) => `shoestore.orderToken.${orderId}`;

function rememberOrderToken(orderId, token) {
    try {
        sessionStorage.setItem(tokenKey(orderId), token);
    } catch {
        // Safari private mode etc. — let the browser tab keep the token only
        // in memory via the caller's state.
    }
}

export function getStoredOrderToken(orderId) {
    try {
        return sessionStorage.getItem(tokenKey(orderId)) || '';
    } catch {
        return '';
    }
}

export const storefrontService = {
    async getProducts() {
        const response = await api.get('/products');
        return response.data;
    },

    async getCategories() {
        const response = await api.get('/categories');
        return response.data;
    },

    async getOrder(orderId, token) {
        const lookupToken = token || getStoredOrderToken(orderId);
        if (!lookupToken) {
            throw new Error('Missing order lookup token');
        }
        const response = await api.get(`/orders/${orderId}`, {
            params: { token: lookupToken }
        });
        return response.data;
    },

    async createPaymentIntent(payload) {
        const response = await api.post('/checkout/create-payment-intent', payload);
        // Persist the lookup token so the order-confirmation page can read it
        // back on the return-from-Stripe round-trip without having to pass it
        // through the URL (H-1-style leak).
        if (response.data?.orderId && response.data?.lookupToken) {
            rememberOrderToken(response.data.orderId, response.data.lookupToken);
        }
        return response.data;
    },

    async confirmPayment({ orderId, paymentIntentId, lookupToken }) {
        const token = lookupToken || getStoredOrderToken(orderId);
        const response = await api.post('/checkout/confirm', {
            orderId,
            paymentIntentId,
            lookupToken: token
        });
        return response.data;
    }
};

export default storefrontService;
