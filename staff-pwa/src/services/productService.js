import api from './api';

const productService = {
    async getAllProducts() {
        const response = await api.get('/products');
        return response.data;
    },

    async getProductByQrCode(qrCode) {
        const response = await api.get(`/products/qr/${qrCode}`);
        return response.data;
    },

    async createProduct(productData) {
        const response = await api.post('/products', productData);
        return response.data;
    },

    async sellProduct(id, size, quantity = 1) {
        const response = await api.post(`/products/${id}/sell?size=${size}&quantity=${quantity}`);
        return response.data;
    },

    async sellProductByQrCode(qrCode, size, quantity = 1) {
        const response = await api.post(`/products/qr/${qrCode}/sell?size=${size}&quantity=${quantity}`);
        return response.data;
    },

    async addSize(id, sizeData) {
        const response = await api.post(
            `/products/${id}/sizes?size=${sizeData.size}&stockQuantity=${sizeData.stockQuantity}`
        );
        return response.data;
    },

    async updateSizeStock(id, size, quantity) {
        const response = await api.put(`/products/${id}/sizes/${size}?stockQuantity=${quantity}`);
        return response.data;
    },

    async receiveStock(id, size, quantity, note = '') {
        const response = await api.post(
            `/products/${id}/sizes/${size}/receive?quantity=${quantity}&note=${encodeURIComponent(note || '')}`
        );
        return response.data;
    },

    async returnStock(id, size, quantity, note = '') {
        const response = await api.post(
            `/products/${id}/sizes/${size}/return?quantity=${quantity}&note=${encodeURIComponent(note || '')}`
        );
        return response.data;
    },

    async returnStockByQrCode(qrCode, size, quantity, note = '') {
        const response = await api.post(
            `/products/qr/${qrCode}/return?size=${size}&quantity=${quantity}&note=${encodeURIComponent(note || '')}`
        );
        return response.data;
    },

    async generateQrCode(content = null) {
        const url = content
            ? `/products/generate-qr?content=${encodeURIComponent(content)}`
            : '/products/generate-qr';

        const response = await api.get(url, { responseType: 'blob' });

        let qrCodeValue;
        if (response.headers && typeof response.headers.get === 'function') {
            qrCodeValue = response.headers.get('x-qr-code-value');
        } else {
            qrCodeValue = response.headers['x-qr-code-value'];
        }

        qrCodeValue = String(qrCodeValue || '');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({ qrCodeValue, imageUrl: reader.result });
            };
            reader.onerror = reject;
            reader.readAsDataURL(response.data);
        });
    },

    /**
     * H-1: fetch the QR image as an authenticated blob instead of embedding
     * the JWT in the <img src> URL. Returns an object URL the caller can
     * drop into <img src=""> — caller MUST revoke() it on unmount.
     */
    async fetchQrImageObjectUrl(id) {
        const response = await api.get(`/products/${id}/qr-image`, {
            responseType: 'blob'
        });
        return URL.createObjectURL(response.data);
    }
};

export default productService;
