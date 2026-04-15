import api from './api.js';

const formatLocalDateTime = (date) => {
    return date.toISOString().slice(0, 19);
};

export const adminService = {
    // Orders
    async getOrders() {
        const response = await api.get('/admin/orders');
        return response.data;
    },

    async updateOrderStatus(orderId, status) {
        const response = await api.put(`/admin/orders/${orderId}/status?status=${status}`);
        return response.data;
    },

    // Discounts
    async getDiscounts() {
        const response = await api.get('/admin/discounts');
        return response.data;
    },

    async createDiscount(payload) {
        const response = await api.post('/admin/discounts', payload);
        return response.data;
    },

    async toggleDiscount(id, active) {
        const response = await api.put(`/admin/discounts/${id}/toggle?active=${active}`);
        return response.data;
    },

    // Staff Sales
    async getStaffSales(startDate, endDate) {
        const response = await api.get('/admin/staff-sales', {
            params: { startDate, endDate }
        });
        return response.data;
    },

    // Products
    async getProducts() {
        const response = await api.get('/products');
        return response.data;
    },

    async getLowStockProducts() {
        const response = await api.get('/products/low-stock');
        return response.data;
    },

    async createProduct(payload) {
        const response = await api.post('/products', payload);
        return response.data;
    },

    async updateProduct(id, payload) {
        const response = await api.put(`/products/${id}`, payload);
        return response.data;
    },

    async deleteProduct(id) {
        await api.delete(`/products/${id}`);
    },

    async adjustSizeStock(productId, size, stockQuantity) {
        const response = await api.put(
            `/products/${productId}/sizes/${size}?stockQuantity=${stockQuantity}`);
        return response.data;
    },

    async addSize(productId, size, stockQuantity) {
        const response = await api.post(
            `/products/${productId}/sizes?size=${size}&stockQuantity=${stockQuantity}`);
        return response.data;
    },

    async getCategories() {
        const response = await api.get('/categories');
        return response.data;
    },

    getQrCodeImageUrl(productId) {
        return `/api/products/${productId}/qr-image`;
    },

    // Analytics
    async getSalesStats(startDate, endDate) {
        const response = await api.get('/analytics/sales', {
            params: {
                startDate: formatLocalDateTime(startDate),
                endDate: formatLocalDateTime(endDate)
            }
        });
        return response.data;
    },

    async getDailyReport(startDate, endDate, groupBy = 'DAY') {
        const response = await api.get('/analytics/daily-report', {
            params: {
                startDate: formatLocalDateTime(startDate),
                endDate: formatLocalDateTime(endDate),
                groupBy
            }
        });
        return response.data;
    },

    // Stock Movements
    async getRecentStockMovements(days = 7) {
        const response = await api.get('/stock-movements/recent', {
            params: { days }
        });
        return response.data;
    },

    // Staff Management
    async getStaffList() {
        const response = await api.get('/admin/staff');
        return response.data;
    },

    async createStaff(payload) {
        const response = await api.post('/admin/staff', payload);
        return response.data;
    },

    async toggleStaff(id, enabled) {
        const response = await api.put(`/admin/staff/${id}/toggle?enabled=${enabled}`);
        return response.data;
    }
};

export default adminService;
