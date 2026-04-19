import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import adminService from './services/adminService.js';
import ProductsPage from './pages/ProductsPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

const DASHBOARD_DAYS_WINDOW = 30;
const STOCK_MOVEMENTS_DAYS_WINDOW = 7;
const MAX_RECENT_MOVEMENTS = 10;

const formatCurrency = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
    .format(Number.isFinite(v) ? v : 0);

const formatLocalDate = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="custom-tooltip">
            <p className="t-title">{d.modelName || d.label || d.date}</p>
            {d.color && <p className="t-detail">Color: {d.color}</p>}
            {d.totalRevenue != null && <p className="t-value">{formatCurrency(d.totalRevenue)}</p>}
            {d.salesCount != null && <p className="t-detail">{d.salesCount} units</p>}
        </div>
    );
};

// ==================== DASHBOARD ====================
function DashboardPage() {
    const [orders, setOrders] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [staffSales, setStaffSales] = useState([]);
    const [salesStats, setSalesStats] = useState([]);
    const [dailyData, setDailyData] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [stockMovements, setStockMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const now = new Date();
        const todayStr = formatLocalDate(now);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 1);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DASHBOARD_DAYS_WINDOW);

        Promise.all([
            adminService.getOrders().catch(() => []),
            adminService.getDiscounts().catch(() => []),
            adminService.getStaffSales(todayStr, todayStr).catch(() => []),
            adminService.getSalesStats(thirtyDaysAgo, endDate).catch(() => []),
            adminService.getDailyReport(thirtyDaysAgo, endDate, 'DAY').catch(() => []),
            adminService.getLowStockProducts().catch(() => []),
            adminService.getRecentStockMovements(STOCK_MOVEMENTS_DAYS_WINDOW).catch(() => [])
        ]).then(([orderData, discountData, staffData, stats, daily, low, movements]) => {
            if (cancelled) return;
            setOrders(orderData || []);
            setDiscounts(discountData || []);
            setStaffSales(staffData || []);
            setSalesStats(stats || []);
            setDailyData(daily || []);
            setLowStock(low || []);
            setStockMovements(movements || []);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const totalStaffRevenue = staffSales.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
    const totalSalesCount = salesStats.reduce((sum, s) => sum + (s.salesCount || 0), 0);
    const totalSalesRevenue = salesStats.reduce((sum, s) => sum + (s.totalRevenue || 0), 0);

    // Split 30-day revenue into online (paid CustomerOrders) vs in-store (everything else).
    const thirtyDaysAgoTs = Date.now() - DASHBOARD_DAYS_WINDOW * 24 * 60 * 60 * 1000;
    const paidOnline = orders.filter((o) =>
        o.status === 'PAID' && o.paidAt && new Date(o.paidAt).getTime() >= thirtyDaysAgoTs);
    const onlineRevenue = paidOnline.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const inStoreRevenue = Math.max(0, totalSalesRevenue - onlineRevenue);
    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;

    const chartData = salesStats.map((item) => ({
        ...item,
        shortLabel: item.modelName?.length > 12 ? item.modelName.substring(0, 10) + '…' : item.modelName
    }));

    if (loading) return <div className="admin-page-section"><p style={{ color: 'var(--text-secondary)' }}>Loading dashboard…</p></div>;

    return (
        <div className="admin-page-section">
            <div className="section-header"><h2>📊 Dashboard</h2></div>

            {/* Top-level stats — revenue split by channel */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon green">📈</div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(totalSalesRevenue)}</span>
                        <span className="stat-label">30-Day Revenue (total)</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">🏬</div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(inStoreRevenue)}</span>
                        <span className="stat-label">In-store (QR)</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🌐</div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(onlineRevenue)}</span>
                        <span className="stat-label">Online (Stripe)</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">👥</div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(totalStaffRevenue)}</span>
                        <span className="stat-label">Today's Staff Sales</span>
                    </div>
                </div>
            </div>

            {/* Operational counters */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon blue">🛒</div>
                    <div className="stat-content">
                        <span className="stat-value">{totalSalesCount}</span>
                        <span className="stat-label">30-Day Units Sold</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-content">
                        <span className="stat-value">{pendingOrders}</span>
                        <span className="stat-label">Pending Online Orders</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">🏷️</div>
                    <div className="stat-content">
                        <span className="stat-value">{discounts.filter((d) => d.active).length}</span>
                        <span className="stat-label">Active Discounts</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">⚠️</div>
                    <div className="stat-content">
                        <span className="stat-value">{lowStock.length}</span>
                        <span className="stat-label">Low Stock Products</span>
                    </div>
                </div>
            </div>

            {/* Revenue Bar Chart */}
            <div className="chart-card">
                <h3>💵 Product Revenue (Last 30 Days)</h3>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 40, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="shortLabel" angle={-45} textAnchor="end" interval={0}
                                   tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <YAxis tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`}
                                   tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                {chartData.map((entry, i) => (
                                    <Cell key={entry.productId ?? entry.modelName ?? i}
                                          fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="chart-empty"><span className="icon">📊</span><p>No sales data available</p></div>
                )}
            </div>

            {/* Daily Trend Line Chart */}
            {dailyData.length > 0 && (
                <div className="chart-card">
                    <h3>📅 Daily Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyData} margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }}
                                   axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                   tickFormatter={(v) => new Date(v).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} />
                            <YAxis tickFormatter={(v) => `₺${v}`}
                                   tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(l) => new Date(l).toLocaleDateString('tr-TR')} />
                            <Line type="monotone" dataKey="totalRevenue" stroke="#667eea" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Low Stock Alerts */}
            {lowStock.length > 0 && (
                <div className="chart-card">
                    <h3>⚠️ Low Stock Alerts</h3>
                    <div className="low-stock-grid">
                        {lowStock.map((p) => (
                            <div key={p.id} className="low-stock-item">
                                <span className="name">{p.modelName ?? 'Unknown'} ({p.color ?? '—'})</span>
                                <span className="stock">{p.totalStock ?? 0} left</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Stock Movements */}
            {stockMovements.length > 0 && (
                <div className="chart-card">
                    <h3>📋 Recent Stock Movements</h3>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr><th>Date</th><th>Product</th><th>Size</th><th>Qty</th><th>Direction</th><th>Reason</th></tr>
                            </thead>
                            <tbody>
                                {stockMovements.slice(0, MAX_RECENT_MOVEMENTS).map((m) => {
                                    const direction = m.direction || 'UNKNOWN';
                                    const directionClass = direction.toLowerCase();
                                    return (
                                        <tr key={m.id}>
                                            <td>{m.occurredAt ? new Date(m.occurredAt).toLocaleString('tr-TR') : '—'}</td>
                                            <td className="model-name">{m.modelName ?? '—'}</td>
                                            <td>{m.size ?? '—'}</td>
                                            <td>{m.quantity ?? 0}</td>
                                            <td><span className={`badge badge-${directionClass}`}>{direction}</span></td>
                                            <td>{m.reason ?? '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==================== LOGIN ====================
function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-card">
                <h1>🛡️ Admin Portal</h1>
                <p>Dashboard, orders, discounts and reporting</p>
                <form onSubmit={handleSubmit} className="product-form">
                    {error && <div className="alert alert-error">{error}</div>}
                    <div className="form-group">
                        <label className="label">Username</label>
                        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="admin" />
                    </div>
                    <div className="form-group">
                        <label className="label">Password</label>
                        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <button className="btn btn-primary" disabled={loading} type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ==================== ORDERS ====================
function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        let cancelled = false;
        adminService.getOrders()
            .then((data) => { if (!cancelled) setOrders(data || []); })
            .catch((err) => {
                if (!cancelled) {
                    console.error('Failed to load orders', err);
                    setOrders([]);
                }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleStatusChange = async (orderId, status) => {
        setActionError('');
        try {
            const updated = await adminService.updateOrderStatus(orderId, status);
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        } catch (err) {
            console.error('Failed to update order status', err);
            setActionError(err.response?.data?.message || 'Failed to update order status');
        }
    };

    const getStatusBadge = (status) => {
        const map = { PENDING: 'pending', PAID: 'paid', FULFILLED: 'fulfilled', CANCELLED: 'cancelled' };
        return <span className={`badge badge-${map[status] || 'pending'}`}>{status}</span>;
    };

    return (
        <div className="admin-page-section">
            <div className="section-header"><h2>📦 Online Orders</h2></div>
            {actionError && <div className="alert alert-error">{actionError}</div>}
            {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>ID</th><th>Customer</th><th>Contact</th><th>Items</th>
                                <th>Total</th><th>Payment</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No orders yet</td></tr>
                            ) : orders.flatMap((order) => {
                                const rows = [(
                                    <tr key={order.id}>
                                        <td>
                                            <button className="btn btn-sm btn-secondary"
                                                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                                                {expanded === order.id ? '▾' : '▸'}
                                            </button>
                                        </td>
                                        <td>#{order.id}</td>
                                        <td className="model-name">{order.customerName}</td>
                                        <td>
                                            <div>{order.customerEmail || '—'}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {order.customerPhone}
                                            </div>
                                        </td>
                                        <td>{order.items?.length || 0}</td>
                                        <td className="revenue">{formatCurrency(order.totalAmount)}</td>
                                        <td>
                                            <span className="badge badge-secondary">
                                                {order.stripePaymentStatus || '—'}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(order.status)}</td>
                                        <td>
                                            <select className="input" value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}>
                                                <option value="PENDING">PENDING</option>
                                                <option value="PAID">PAID</option>
                                                <option value="FULFILLED">FULFILLED</option>
                                                <option value="CANCELLED">CANCELLED</option>
                                            </select>
                                        </td>
                                    </tr>
                                )];
                                if (expanded === order.id) {
                                    rows.push((
                                        <tr key={`${order.id}-details`} className="details-row">
                                            <td colSpan="9">
                                                <div className="order-details-grid">
                                                    <div>
                                                        <strong>Shipping to</strong>
                                                        <div>{order.shippingLine1 || '—'}</div>
                                                        {order.shippingLine2 && <div>{order.shippingLine2}</div>}
                                                        <div>
                                                            {[order.shippingPostalCode, order.shippingCity,
                                                              order.shippingCountry].filter(Boolean).join(' · ') || '—'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong>Payment</strong>
                                                        <div>Intent: <code>{order.stripePaymentIntentId || '—'}</code></div>
                                                        <div>Paid at: {order.paidAt ? new Date(order.paidAt).toLocaleString('tr-TR') : '—'}</div>
                                                    </div>
                                                    <div>
                                                        <strong>Items</strong>
                                                        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                                                            {order.items?.map((it) => (
                                                                <li key={it.id}>
                                                                    {it.productName} · size {it.size} · qty {it.quantity}
                                                                    · {formatCurrency(it.totalPrice)}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                }
                                return rows;
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ==================== DISCOUNTS ====================
function DiscountsPage() {
    const [products, setProducts] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [form, setForm] = useState({ name: '', type: 'PERCENTAGE', value: '', productIds: [] });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            adminService.getProducts().catch(() => []),
            adminService.getDiscounts().catch(() => [])
        ]).then(([pd, dd]) => {
            if (cancelled) return;
            setProducts(pd || []);
            setDiscounts(dd || []);
        });
        return () => { cancelled = true; };
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        setFormError('');
        const numericValue = Number(form.value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            setFormError('Value must be a positive number');
            return;
        }
        if (!form.productIds.length) {
            setFormError('Select at least one product');
            return;
        }
        setSubmitting(true);
        try {
            const payload = { ...form, value: numericValue, productIds: form.productIds.map(Number) };
            const created = await adminService.createDiscount(payload);
            setDiscounts((prev) => [created, ...prev]);
            setForm({ name: '', type: 'PERCENTAGE', value: '', productIds: [] });
        } catch (err) {
            console.error('Failed to create discount', err);
            setFormError(err.response?.data?.message || 'Failed to create discount');
        } finally {
            setSubmitting(false);
        }
    };

    const toggle = async (discount) => {
        setFormError('');
        try {
            const updated = await adminService.toggleDiscount(discount.id, !discount.active);
            setDiscounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            console.error('Failed to toggle discount', err);
            setFormError(err.response?.data?.message || 'Failed to toggle discount');
        }
    };

    return (
        <div className="admin-page-section">
            <div className="section-header"><h2>🏷️ Discounts</h2></div>

            <div className="chart-card">
                <h3>Create New Discount</h3>
                {formError && <div className="alert alert-error">{formError}</div>}
                <form className="product-form" onSubmit={submit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="label">Name</label>
                            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Summer Sale" />
                        </div>
                        <div className="form-group">
                            <label className="label">Type</label>
                            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FIXED">Fixed Amount</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="label">Value</label>
                            <input className="input" type="number" min="0.01" step="0.01" value={form.value}
                                   onChange={(e) => setForm({ ...form, value: e.target.value })} required placeholder="10" />
                        </div>
                        <div className="form-group">
                            <label className="label">Products</label>
                            <select multiple className="input" value={form.productIds.map(String)} style={{ minHeight: '80px' }}
                                    onChange={(e) => setForm({ ...form, productIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
                                {products.map((p) => <option key={p.id} value={String(p.id)}>{p.modelName} ({p.color})</option>)}
                            </select>
                        </div>
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                        {submitting ? 'Creating…' : 'Create Discount'}
                    </button>
                </form>
            </div>

            <div className="admin-table-wrapper" style={{ marginTop: '1.5rem' }}>
                <table className="admin-table">
                    <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {discounts.map((d) => (
                            <tr key={d.id}>
                                <td className="model-name">{d.name}</td>
                                <td>{d.type}</td>
                                <td>{d.type === 'PERCENTAGE' ? `${d.value}%` : formatCurrency(d.value)}</td>
                                <td>{d.productIds?.length || 0} products</td>
                                <td><span className={`badge badge-${d.active ? 'active' : 'inactive'}`}>{d.active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <button className={`btn btn-sm ${d.active ? 'btn-danger' : 'btn-primary'}`}
                                            onClick={() => toggle(d)}>
                                        {d.active ? 'Disable' : 'Enable'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ==================== STAFF SALES ====================
function StaffSalesPage() {
    const [rows, setRows] = useState([]);
    const [dateRange, setDateRange] = useState(() => {
        const today = formatLocalDate(new Date());
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: formatLocalDate(weekAgo), end: today };
    });

    useEffect(() => {
        adminService.getStaffSales(dateRange.start, dateRange.end).then(setRows).catch(() => setRows([]));
    }, [dateRange]);

    const totalRevenue = rows.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
    const totalQty = rows.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);

    return (
        <div className="admin-page-section">
            <div className="section-header">
                <h2>👥 Staff Sales</h2>
                <div className="controls-row">
                    <input type="date" className="input" value={dateRange.start}
                           onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} />
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <input type="date" className="input" value={dateRange.end}
                           onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} />
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card">
                    <div className="stat-icon green">💰</div>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(totalRevenue)}</span>
                        <span className="stat-label">Total Revenue</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-content">
                        <span className="stat-value">{totalQty}</span>
                        <span className="stat-label">Total Quantity</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple">👤</div>
                    <div className="stat-content">
                        <span className="stat-value">{new Set(rows.map((r) => r.userId)).size}</span>
                        <span className="stat-label">Active Staff</span>
                    </div>
                </div>
            </div>

            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead><tr><th>Date</th><th>User</th><th>Quantity</th><th>Revenue</th></tr></thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No staff sales in this period</td></tr>
                        ) : rows.map((row, i) => (
                            <tr key={`${row.userId}-${row.summaryDate}-${i}`}>
                                <td>{row.summaryDate}</td>
                                <td className="model-name">{row.username}</td>
                                <td>{row.totalQuantity}</td>
                                <td className="revenue">{formatCurrency(row.totalRevenue)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan="2" style={{ textAlign: 'right' }}>TOTAL</td>
                                <td>{totalQty}</td>
                                <td className="revenue">{formatCurrency(totalRevenue)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

// ==================== SHELL ====================
function AdminShell() {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return (
        <div className="admin-shell">
            <nav className="admin-shell-nav">
                <NavLink to="/" end>📊 Dashboard</NavLink>
                <NavLink to="/products">👟 Products</NavLink>
                <NavLink to="/orders">📦 Online Orders</NavLink>
                <NavLink to="/discounts">🏷️ Discounts</NavLink>
                <NavLink to="/staff-sales">👥 Staff Sales</NavLink>
                <NavLink to="/staff">🧑‍💼 Staff</NavLink>
                <div className="nav-spacer" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user?.username}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/login'); }}>
                    Logout
                </button>
            </nav>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/discounts" element={<DiscountsPage />} />
                <Route path="/staff-sales" element={<StaffSalesPage />} />
                <Route path="/staff" element={<StaffPage />} />
            </Routes>
        </div>
    );
}

// ==================== APP ====================
export default function AdminApp() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <AdminLoginPage />} />
            <Route path="/*" element={<PrivateRoute adminOnly><AdminShell /></PrivateRoute>} />
        </Routes>
    );
}
