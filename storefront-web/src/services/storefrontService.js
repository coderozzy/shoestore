import axios from 'axios';

const api = axios.create({
    baseURL: '/api/storefront'
});

export const storefrontService = {
    async getProducts() {
        const response = await api.get('/products');
        return response.data;
    },

    async getCategories() {
        const response = await api.get('/categories');
        return response.data;
    },

    async getOrder(orderId) {
        const response = await api.get(`/orders/${orderId}`);
        return response.data;
    },

    async createPaymentIntent(payload) {
        const response = await api.post('/checkout/create-payment-intent', payload);
        return response.data;
    },

    async confirmPayment(paymentIntentId) {
        const response = await api.post('/checkout/confirm', { paymentIntentId });
        return response.data;
    }
};

export default storefrontService;
