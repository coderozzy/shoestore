import api from './api';

const formatLocalDate = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 19);
};

export const analyticsService = {
    async getSalesStats(startDate, endDate) {
        const response = await api.get('/analytics/sales', {
            params: {
                startDate: formatLocalDate(startDate),
                endDate: formatLocalDate(endDate)
            }
        });
        return response.data;
    },

    async getDailyReport(startDate, endDate) {
        const response = await api.get('/analytics/daily-report', {
            params: {
                startDate: formatLocalDate(startDate),
                endDate: formatLocalDate(endDate)
            }
        });
        return response.data;
    }
};

export default analyticsService;
