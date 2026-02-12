import api from './api';

export const stockMovementService = {
    async getRecentMovements(days = 7) {
        const response = await api.get(`/stock-movements/recent?days=${days}`);
        return response.data;
    },

    async getMovementsByProduct(productId) {
        const response = await api.get(`/stock-movements?productId=${productId}`);
        return response.data;
    }
};

export default stockMovementService;

