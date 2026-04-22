import axios from 'axios';

// `withCredentials` is set so that cookies used by any future auth flow ride
// along. Storefront is anonymous today; order lookup is gated by a signed
// token (C-4) that we persist to sessionStorage per order id.
const api = axios.create({
    baseURL: '/api/storefront',
    withCredentials: true
});

// Tokens are stored under both the numeric id (used by the order-confirmation
// page after the Stripe round-trip) and the public order number (used by the
// Track Order page). Same value, two keys: cheaper than juggling a single
// composite key.
const idTokenKey = (orderId) => `shoestore.orderToken.${orderId}`;
const numberTokenKey = (orderNumber) => `shoestore.orderTokenByNumber.${orderNumber}`;

function rememberOrderToken(orderId, token, orderNumber) {
    try {
        if (orderId != null) sessionStorage.setItem(idTokenKey(orderId), token);
        if (orderNumber) sessionStorage.setItem(numberTokenKey(orderNumber), token);
    } catch {
        // Safari private mode etc. — let the browser tab keep the token only
        // in memory via the caller's state.
    }
}

export function getStoredOrderToken(orderId) {
    try {
        return sessionStorage.getItem(idTokenKey(orderId)) || '';
    } catch {
        return '';
    }
}

export function getStoredOrderTokenByNumber(orderNumber) {
    try {
        return sessionStorage.getItem(numberTokenKey(orderNumber)) || '';
    } catch {
        return '';
    }
}

const storefrontService = {
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
        // The response carries orderNumber too — opportunistically remember
        // the token under that key so a later Track Order lookup hits cache
        // without round-tripping back to the email.
        if (response.data?.orderNumber) {
            rememberOrderToken(orderId, lookupToken, response.data.orderNumber);
        }
        return response.data;
    },

    /**
     * Looks up an order by its public STP-XXXXXXXX number. The token must
     * still match (signed against the underlying numeric id), so a guessed
     * order number alone never grants access.
     */
    async getOrderByNumber(orderNumber, token) {
        const lookupToken = token || getStoredOrderTokenByNumber(orderNumber);
        if (!lookupToken) {
            throw new Error('Missing order lookup token');
        }
        const response = await api.get(`/orders/by-number/${encodeURIComponent(orderNumber)}`, {
            params: { token: lookupToken }
        });
        // Mirror the same opportunistic caching back the other way: now we
        // know the numeric id, so a later by-id lookup also hits cache.
        if (response.data?.id) {
            rememberOrderToken(response.data.id, lookupToken, orderNumber);
        }
        return response.data;
    },

    async createPaymentIntent(payload) {
        const response = await api.post('/checkout/create-payment-intent', payload);
        // Persist the lookup token so the order-confirmation page can read it
        // back on the return-from-Stripe round-trip without having to pass it
        // through the URL (H-1-style leak).
        if (response.data?.orderId && response.data?.lookupToken) {
            rememberOrderToken(
                response.data.orderId,
                response.data.lookupToken,
                response.data.orderNumber
            );
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
