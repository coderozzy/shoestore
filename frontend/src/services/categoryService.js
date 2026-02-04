import api from './api';

export const categoryService = {
    async getAllCategories() {
        const response = await api.get('/categories');
        return response.data;
    },

    async getCategoryById(id) {
        const response = await api.get(`/categories/${id}`);
        return response.data;
    },

    async getCategoryByName(name) {
        const response = await api.get(`/categories/name/${name}`);
        return response.data;
    }
};

export default categoryService;
