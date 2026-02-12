import api from './api';

const formatLocalDateTime = (date) => {
    return date.toISOString().slice(0, 19);
};

export const analyticsService = {
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

    async getSalesRecords(startDate, endDate) {
        const response = await api.get('/analytics/sales-records', {
            params: {
                startDate: formatLocalDateTime(startDate),
                endDate: formatLocalDateTime(endDate)
            }
        });
        return response.data;
    }
};

export default analyticsService;
