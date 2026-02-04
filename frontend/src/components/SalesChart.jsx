import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './SalesChart.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export default function SalesChart({ data, isLoading, dailyData }) {
    if (isLoading) {
        return (
            <div className="chart-container loading">
                <div className="spinner"></div>
                <p>Analizler yükleniyor...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="chart-container empty">
                <div className="empty-icon">📊</div>
                <p>Bu tarih aralığında satış verisi bulunamadı.</p>
            </div>
        );
    }

    // Calculate totals
    const totalRevenue = data.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    const totalSales = data.reduce((sum, item) => sum + item.salesCount, 0);
    const topProduct = data[0]; // Already sorted by backend

    // Prepare chart data with shortened labels
    const chartData = data.map(item => ({
        ...item,
        label: item.modelName,
        shortLabel: item.modelName.length > 15 ? item.modelName.substring(0, 12) + '...' : item.modelName
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-title">{item.modelName}</p>
                    <p className="tooltip-detail">Renk: {item.color}</p>
                    <p className="tooltip-revenue">Gelir: {formatCurrency(item.totalRevenue)}</p>
                    <p className="tooltip-count">Satış: {item.salesCount} adet @ {formatCurrency(item.unitPrice)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="sales-dashboard">
            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card total-revenue">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <span className="card-value">{formatCurrency(totalRevenue)}</span>
                        <span className="card-label">Toplam Gelir</span>
                    </div>
                </div>
                <div className="summary-card total-sales">
                    <div className="card-icon">📦</div>
                    <div className="card-content">
                        <span className="card-value">{totalSales}</span>
                        <span className="card-label">Toplam Satış</span>
                    </div>
                </div>
                <div className="summary-card avg-value">
                    <div className="card-icon">📈</div>
                    <div className="card-content">
                        <span className="card-value">{formatCurrency(totalSales > 0 ? totalRevenue / totalSales : 0)}</span>
                        <span className="card-label">Ortalama Satış</span>
                    </div>
                </div>
                {topProduct && (
                    <div className="summary-card top-product">
                        <div className="card-icon">🏆</div>
                        <div className="card-content">
                            <span className="card-value">{topProduct.modelName}</span>
                            <span className="card-label">En Çok Satan ({topProduct.salesCount} adet)</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Revenue Chart */}
            <div className="chart-section">
                <h3>💵 Ürün Bazlı Gelir</h3>
                <div className="chart-content">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
                        >
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#764ba2" stopOpacity={0.9} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="shortLabel"
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            />
                            <YAxis
                                tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}K`}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar
                                name="Gelir"
                                dataKey="totalRevenue"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={50}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Products Table */}
            <div className="products-revenue-table">
                <h3>📋 Satış Detayları</h3>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ürün</th>
                                <th>Renk</th>
                                <th>Birim Fiyat</th>
                                <th>Satış Adedi</th>
                                <th>Toplam Gelir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item.productId}>
                                    <td className="rank">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                    </td>
                                    <td className="product-name">{item.modelName}</td>
                                    <td><span className="color-badge">{item.color}</span></td>
                                    <td className="price">{formatCurrency(item.unitPrice)}</td>
                                    <td className="count">{item.salesCount}</td>
                                    <td className="revenue">{formatCurrency(item.totalRevenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'right', paddingRight: '20px' }}><strong>TOPLAM</strong></td>
                                <td className="count"><strong>{totalSales}</strong></td>
                                <td className="revenue"><strong>{formatCurrency(totalRevenue)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Daily Report */}
            {dailyData && dailyData.length > 0 && (
                <div className="daily-report">
                    <h3>📅 Günlük Rapor</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Satış Adedi</th>
                                    <th>Günlük Gelir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyData.map((day) => (
                                    <tr key={day.date}>
                                        <td className="date">{new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                        <td className="count">{day.totalSales}</td>
                                        <td className="revenue">{formatCurrency(day.totalRevenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
