import { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import SalesChart from '../components/SalesChart';
import productService from '../services/productService';
import analyticsService from '../services/analyticsService';
import pdfService from '../services/pdfService';
import './AdminPage.css';

export default function AdminPage() {
    const [products, setProducts] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);

    // Default to last 30 days
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [sortOrder, setSortOrder] = useState('desc');

    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        modelName: '',
        gender: 'MALE',
        color: '',
        price: '',
        sizes: [{ size: '', stockQuantity: '' }]
    });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchData();
        fetchSalesStats();
    }, []);

    // ... (fetchData remains same, skipping for brevity in implementation plan but creating partial Replace in tool)
    // Wait, replacing a large chunk. Let's keep existing fetchData and just target the imports and the component body start.
    // For the tool call I need to precise target.

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allProducts, lowStock] = await Promise.all([
                productService.getAllProducts(),
                productService.getLowStockProducts()
            ]);
            setProducts(allProducts);
            setLowStockProducts(lowStock);
        } catch (err) {
            console.error('Failed to fetch product data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSalesStats = async () => {
        setStatsLoading(true);
        try {
            const start = new Date(dateRange.start);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateRange.end);
            end.setDate(end.getDate() + 1);
            end.setHours(0, 0, 0, 0);

            const [salesStats, dailyReport] = await Promise.all([
                analyticsService.getSalesStats(start, end),
                analyticsService.getDailyReport(start, end)
            ]);
            setSalesData(salesStats);
            setDailyData(dailyReport);
        } catch (err) {
            console.error('Failed to fetch sales stats:', err);
            alert('Satış verileri yüklenirken bir hata oluştu');
        } finally {
            setStatsLoading(false);
        }
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const handleFilter = (type) => {
        const today = new Date();
        let start = new Date();
        const end = new Date(); // Today

        if (type === 'daily') {
            start = today;
        } else if (type === 'monthly') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (type === 'yearly') {
            start = new Date(today.getFullYear(), 0, 1);
        }

        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });

        // Trigger fetch immediately (useEffect depends on dateRange changes? No, it currently doesn't listed in dependencies)
        // The original useEffect was [], so I need to either add dateRange to useEffect dependency or call fetch manually.
        // Let's call fetch manually after state update? React state update is async. 
        // Better to add useEffect on dateRange change.
    };

    // Need to modify useEffect to listen to dateRange or call fetchSalesStats inside handleFilter (but with new values).
    // Let's add useEffect for dateRange change.
    useEffect(() => {
        fetchSalesStats();
    }, [dateRange]);

    const handleDownloadReport = async () => {
        // "Gün Sonu" implies report for WHAT IS HAPPENING TODAY, regardless of what I am viewing
        const confirmDownload = confirm("Bugünün 'Gün Sonu Raporu'nu indirmek üzeresiniz. Devam edilsin mi?");
        if (!confirmDownload) return;

        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const todayEnd = new Date();
            todayEnd.setDate(todayEnd.getDate() + 1);
            todayEnd.setHours(0, 0, 0, 0);

            // Fetch dedicated data for the report
            const [reportSalesStats, reportDailyStats] = await Promise.all([
                analyticsService.getSalesStats(todayStart, todayEnd),
                analyticsService.getDailyReport(todayStart, todayEnd)
            ]);

            if (!Array.isArray(reportSalesStats)) {
                throw new Error("Satış verisi alınamadı (Hatalı format).");
            }

            // Calculate totals from the fresh data
            const totalSales = reportSalesStats.reduce((sum, item) => sum + item.salesCount, 0);
            const totalRevenue = reportSalesStats.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);

            console.log("PDF Generasyon Başlıyor...", { reportSalesStats, totalSales, totalRevenue });
            pdfService.generateDailyReport(new Date(), reportSalesStats, { salesCount: totalSales, totalRevenue });
        } catch (error) {
            console.error("Rapor oluşturulurken hata:", error);
            // Show more specific error to user
            const errorMessage = error.response?.data?.message || error.message || "Bilinmeyen bir hata";
            alert(`Rapor oluşturulamadı: ${errorMessage}`);
        }
    };

    const processedSalesData = [...salesData].sort((a, b) => {
        return sortOrder === 'desc'
            ? b.salesCount - a.salesCount
            : a.salesCount - b.salesCount;
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSizeChange = (index, field, value) => {
        setFormData(prev => {
            const newSizes = [...prev.sizes];
            newSizes[index] = { ...newSizes[index], [field]: value };
            return { ...prev, sizes: newSizes };
        });
    };

    const addSizeRow = () => {
        setFormData(prev => ({
            ...prev,
            sizes: [...prev.sizes, { size: '', stockQuantity: '' }]
        }));
    };

    const removeSizeRow = (index) => {
        if (formData.sizes.length > 1) {
            setFormData(prev => ({
                ...prev,
                sizes: prev.sizes.filter((_, i) => i !== index)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            if (editingProduct) {
                // For edit, only update basic info (not sizes)
                const updateData = {
                    modelName: formData.modelName,
                    gender: formData.gender,
                    color: formData.color,
                    price: parseFloat(formData.price)
                };
                await productService.updateProduct(editingProduct.id, updateData);
            } else {
                // For create, include sizes
                const productData = {
                    modelName: formData.modelName,
                    gender: formData.gender,
                    color: formData.color,
                    price: parseFloat(formData.price),
                    sizes: formData.sizes.map(s => ({
                        size: parseFloat(s.size),
                        stockQuantity: parseInt(s.stockQuantity)
                    }))
                };
                await productService.createProduct(productData);
            }

            await fetchData();
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to save product');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            modelName: product.modelName,
            gender: product.gender,
            color: product.color,
            price: product.price.toString(),
            sizes: product.sizes?.length > 0
                ? product.sizes.map(s => ({ size: s.size.toString(), stockQuantity: s.stockQuantity.toString() }))
                : [{ size: '', stockQuantity: '' }]
        });
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await productService.deleteProduct(productId);
            await fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete product');
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingProduct(null);
        setFormData({
            modelName: '',
            gender: 'MALE',
            color: '',
            price: '',
            sizes: [{ size: '', stockQuantity: '' }]
        });
        setFormError('');
    };

    if (loading) {
        return (
            <div className="admin-page">
                <LoadingSpinner text="Loading admin dashboard..." />
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>⚙️ Admin Dashboard</h1>
                <div className="admin-actions">
                    <button className="btn btn-primary" onClick={handleDownloadReport}>
                        📄 Gün Sonu Raporu (PDF)
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        + Add Product
                    </button>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="analytics-section">
                <div className="section-header">
                    <h2>📊 Satış Analizleri</h2>

                    <div className="analytics-controls">
                        <div className="filter-buttons">
                            <button className="btn btn-sm btn-outline" onClick={() => handleFilter('daily')}>Günlük</button>
                            <button className="btn btn-sm btn-outline" onClick={() => handleFilter('monthly')}>Aylık</button>
                            <button className="btn btn-sm btn-outline" onClick={() => handleFilter('yearly')}>Yıllık</button>
                        </div>

                        <div className="date-range-picker">
                            <div className="date-inputs">
                                <input
                                    type="date"
                                    name="start"
                                    className="input date-input"
                                    value={dateRange.start}
                                    onChange={handleDateChange}
                                />
                                <span>-</span>
                                <input
                                    type="date"
                                    name="end"
                                    className="input date-input"
                                    value={dateRange.end}
                                    onChange={handleDateChange}
                                />
                                {/* Filter button removed as useEffect handles it now */}
                            </div>
                            <select
                                className="input sort-select"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="desc">En Çok Satan</option>
                                <option value="asc">En Az Satan</option>
                            </select>
                        </div>
                    </div>
                </div>

                <SalesChart data={processedSalesData} isLoading={statsLoading} dailyData={dailyData} />
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{products.length}</div>
                    <div className="stat-label">Total Products</div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-value">{lowStockProducts.length}</div>
                    <div className="stat-label">Low Stock</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {products.reduce((sum, p) => sum + (p.totalStock || 0), 0)}
                    </div>
                    <div className="stat-label">Total Stock</div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <div className="low-stock-section">
                    <h2>⚠️ Low Stock Alert</h2>
                    <div className="low-stock-list">
                        {lowStockProducts.map(product => (
                            <div key={product.id} className="low-stock-item">
                                <span className="product-info">
                                    {product.modelName} ({product.color})
                                </span>
                                <span className="stock-count">{product.totalStock} left</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Product Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal modal-large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <button className="modal-close" onClick={resetForm}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="product-form">
                            {formError && <div className="alert alert-error">{formError}</div>}

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Model Name</label>
                                    <input
                                        type="text"
                                        name="modelName"
                                        className="input"
                                        value={formData.modelName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Gender</label>
                                    <select
                                        name="gender"
                                        className="input"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                    >
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Color</label>
                                    <input
                                        type="text"
                                        name="color"
                                        className="input"
                                        value={formData.color}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Price (₺)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        className="input"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Sizes Section */}
                            {!editingProduct && (
                                <div className="sizes-section">
                                    <div className="sizes-header">
                                        <label className="label">Sizes & Stock</label>
                                        <button type="button" className="btn btn-sm btn-secondary" onClick={addSizeRow}>
                                            + Add Size
                                        </button>
                                    </div>
                                    {formData.sizes.map((sizeItem, index) => (
                                        <div key={index} className="size-row">
                                            <input
                                                type="number"
                                                className="input"
                                                placeholder="Size (e.g., 42)"
                                                value={sizeItem.size}
                                                onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                                                step="0.5"
                                                min="20"
                                                max="55"
                                                required
                                            />
                                            <input
                                                type="number"
                                                className="input"
                                                placeholder="Qty"
                                                value={sizeItem.stockQuantity}
                                                onChange={(e) => handleSizeChange(index, 'stockQuantity', e.target.value)}
                                                min="0"
                                                required
                                            />
                                            {formData.sizes.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => removeSizeRow(index)}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Show existing sizes for edit mode */}
                            {editingProduct && editingProduct.sizes && (
                                <div className="sizes-display">
                                    <label className="label">Current Sizes</label>
                                    <div className="size-tags">
                                        {editingProduct.sizes.map((s, i) => (
                                            <span key={i} className="size-tag">
                                                Size {s.size}: {s.stockQuantity} in stock
                                            </span>
                                        ))}
                                    </div>
                                    <p className="hint">To modify sizes, use the product detail page.</p>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                                    {formLoading ? 'Saving...' : 'Save Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="products-section">
                <h2>📦 All Products</h2>
                <div className="table-container">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Gender</th>
                                <th>Color</th>
                                <th>Price</th>
                                <th>Sizes</th>
                                <th>Total Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className={product.lowStock ? 'low-stock' : ''}>
                                    <td>{product.modelName}</td>
                                    <td>{product.gender}</td>
                                    <td>
                                        <span className="color-badge" style={{
                                            backgroundColor: product.color.toLowerCase() === 'white' ? '#f0f0f0' : product.color.toLowerCase()
                                        }}>
                                            {product.color}
                                        </span>
                                    </td>
                                    <td>₺{product.price?.toFixed(2)}</td>
                                    <td>
                                        <div className="size-chips">
                                            {product.sizes?.map((s, i) => (
                                                <span key={i} className={`size-chip ${s.stockQuantity <= 5 ? 'low' : ''}`}>
                                                    {s.size} ({s.stockQuantity})
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className={product.lowStock ? 'warning' : ''}>
                                        {product.totalStock}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(product)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(product.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
