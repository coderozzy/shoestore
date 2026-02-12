import { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import SalesChart from '../components/SalesChart';
import productService from '../services/productService';
import analyticsService from '../services/analyticsService';
import pdfService from '../services/pdfService';
import stockMovementService from '../services/stockMovementService';
import './AdminPage.css';

export default function AdminPage() {
    const [products, setProducts] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [salesRecords, setSalesRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [stockMovements, setStockMovements] = useState([]);
    const [movementsLoading, setMovementsLoading] = useState(false);

    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseLocalDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0);
    };

    // Default to last 30 days (local dates)
    const [dateRange, setDateRange] = useState({
        start: formatLocalDate(new Date(new Date().setDate(new Date().getDate() - 30))),
        end: formatLocalDate(new Date())
    });
    const [sortOrder, setSortOrder] = useState('desc');
    const [reportGroupBy, setReportGroupBy] = useState('DAY');

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
        fetchStockMovements();
    }, []);

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
            const start = parseLocalDate(dateRange.start);
            const end = parseLocalDate(dateRange.end);
            end.setDate(end.getDate() + 1);

            const [salesStats, dailyReport] = await Promise.all([
                analyticsService.getSalesStats(start, end),
                analyticsService.getDailyReport(start, end, reportGroupBy)
            ]);
            setSalesData(salesStats);
            setDailyData(dailyReport);
        } catch (err) {
            console.error('Failed to fetch sales stats:', err);
            const message = err.response?.data?.message || err.message || 'An error occurred while loading sales data';
            alert(message);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchSalesRecords = async () => {
        setRecordsLoading(true);
        try {
            const start = parseLocalDate(dateRange.start);
            const end = parseLocalDate(dateRange.end);
            end.setDate(end.getDate() + 1);
            const records = await analyticsService.getSalesRecords(start, end);
            setSalesRecords(records);
        } catch (err) {
            console.error('Failed to fetch sales records:', err);
        } finally {
            setRecordsLoading(false);
        }
    };

    const fetchStockMovements = async () => {
        setMovementsLoading(true);
        try {
            const movements = await stockMovementService.getRecentMovements(7);
            setStockMovements(movements);
        } catch (err) {
            console.error('Failed to fetch stock movements:', err);
        } finally {
            setMovementsLoading(false);
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
            setReportGroupBy('DAY');
        } else if (type === 'monthly') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            setReportGroupBy('MONTH');
        } else if (type === 'yearly') {
            start = new Date(today.getFullYear(), 0, 1);
            setReportGroupBy('YEAR');
        }

        setDateRange({
            start: formatLocalDate(start),
            end: formatLocalDate(end)
        });

    };

    useEffect(() => {
        fetchSalesStats();
        fetchSalesRecords();
    }, [dateRange, reportGroupBy]);

    const downloadSalesReport = async (startDate, endDate, label) => {
        const confirmDownload = confirm(`You are about to download the ${label} report. Continue?`);
        if (!confirmDownload) return;

        try {
            const reportSalesRecords = await analyticsService.getSalesRecords(startDate, endDate);

            if (!Array.isArray(reportSalesRecords)) {
                throw new Error("Sales records could not be retrieved (Invalid format).");
            }

            const totalSales = reportSalesRecords.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const totalRevenue = reportSalesRecords.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

            console.log("PDF Generation Starting...", { reportSalesRecords, totalSales, totalRevenue });
            pdfService.generateDailyReport(startDate, reportSalesRecords, { salesCount: totalSales, totalRevenue });
        } catch (error) {
            console.error("Error creating report:", error);
            const errorMessage = error.response?.data?.message || error.message || "Unknown error";
            alert(`Report could not be created: ${errorMessage}`);
        }
    };

    const handleDownloadReport = async () => {
        const todayStart = parseLocalDate(formatLocalDate(new Date()));
        const todayEnd = parseLocalDate(formatLocalDate(new Date()));
        todayEnd.setDate(todayEnd.getDate() + 1);
        return downloadSalesReport(todayStart, todayEnd, "End of Day");
    };

    const handleDownloadMonthlyReport = async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
        return downloadSalesReport(start, end, "Monthly");
    };

    const handleDownloadYearlyReport = async () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        const end = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
        return downloadSalesReport(start, end, "Yearly");
    };

    const processedSalesData = [...salesData].sort((a, b) => {
        return sortOrder === 'desc'
            ? b.salesCount - a.salesCount
            : a.salesCount - b.salesCount;
    });

    const getSortedSizes = (sizes = []) => {
        return [...sizes].sort((a, b) => Number(a.size) - Number(b.size));
    };

    const [actionModal, setActionModal] = useState({
        open: false,
        product: null
    });
    const [actionType, setActionType] = useState('RECEIVE');
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    const openActionModal = (product) => {
        const firstSize = product.sizes?.[0]?.size ?? '';
        setActionModal({ open: true, product });
        setActionType('RECEIVE');
        setSelectedSize(firstSize);
        setQuantity(1);
        setNote('');
        setActionError('');
    };

    const closeActionModal = () => {
        if (actionLoading) return;
        setActionModal({ open: false, product: null });
    };

    const handleConfirmAction = async () => {
        if (!actionModal.product) return;
        if (!selectedSize) {
            setActionError('Please select a size');
            return;
        }
        if (actionType === 'RECEIVE' || actionType === 'RETURN') {
            if (!quantity || quantity <= 0) {
                setActionError('Quantity must be greater than 0');
                return;
            }
        }
        if (actionType === 'SET' && quantity < 0) {
            setActionError('Stock cannot be negative');
            return;
        }

        setActionLoading(true);
        setActionError('');
        try {
            let updatedProduct;
            if (actionType === 'RECEIVE') {
                updatedProduct = await productService.receiveStock(
                    actionModal.product.id,
                    selectedSize,
                    quantity,
                    note
                );
            } else if (actionType === 'RETURN') {
                updatedProduct = await productService.returnStock(
                    actionModal.product.id,
                    selectedSize,
                    quantity,
                    note
                );
            } else {
                updatedProduct = await productService.updateSizeStock(
                    actionModal.product.id,
                    selectedSize,
                    quantity
                );
            }

            setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            fetchStockMovements();
            closeActionModal();
        } catch (err) {
            setActionError(err.response?.data?.message || 'Action could not be completed');
        } finally {
            setActionLoading(false);
        }
    };

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
                        📄 End of Day Report (PDF)
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadMonthlyReport}>
                        📄 Monthly Report (PDF)
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadYearlyReport}>
                        📄 Yearly Report (PDF)
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        + Add Product
                    </button>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="analytics-section">
                <div className="section-header">
                    <h2>📊 Sales Analytics</h2>

                    <div className="analytics-controls">
                        <div className="filter-buttons">
                            <button className="btn btn-sm btn-outline" onClick={() => handleFilter('daily')}>Daily</button>
                            <button className="btn btn-sm btn-outline" onClick={() => handleFilter('monthly')}>Monthly</button>
                            <button className="btn btn-sm btn-outline" onClick={() => handleFilter('yearly')}>Yearly</button>
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
                                <option value="desc">Best Sellers</option>
                                <option value="asc">Least Sellers</option>
                            </select>
                        </div>
                    </div>
                </div>

                <SalesChart data={processedSalesData} isLoading={statsLoading} dailyData={dailyData} />
            </div>

            {/* Sales Records */}
            <div className="products-section">
                <div className="section-header">
                    <h2>🧾 Sales Records</h2>
                    <button className="btn btn-sm btn-outline" onClick={fetchSalesRecords}>
                        Refresh
                    </button>
                </div>
                <div className="table-container">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>Color</th>
                                <th>Size</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                                <th>User</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recordsLoading ? (
                                <tr>
                                    <td colSpan="8">Loading...</td>
                                </tr>
                            ) : salesRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8">No sales found for this period.</td>
                                </tr>
                            ) : (
                                salesRecords.map((record) => (
                                    <tr key={record.id}>
                                        <td>{new Date(record.occurredAt).toLocaleString()}</td>
                                        <td>{record.modelName}</td>
                                        <td>{record.color}</td>
                                        <td>{record.size}</td>
                                        <td>{record.quantity}</td>
                                        <td>₺{record.unitPrice?.toFixed(2)}</td>
                                        <td>₺{record.totalPrice?.toFixed(2)}</td>
                                        <td>{record.username}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
                                        {getSortedSizes(editingProduct.sizes).map((s, i) => (
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

            {/* Stock Action Modal */}
            {actionModal.open && (
                <div className="modal-overlay" onClick={closeActionModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Stock Actions</h2>
                            <button className="modal-close" onClick={closeActionModal}>×</button>
                        </div>
                        <div className="product-form">
                            {actionError && <div className="alert alert-error">{actionError}</div>}
                            <div className="form-group">
                                <label className="label">Product</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={`${actionModal.product.modelName} (${actionModal.product.color})`}
                                    disabled
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Action</label>
                                    <select
                                        className="input"
                                        value={actionType}
                                        onChange={(e) => setActionType(e.target.value)}
                                    >
                                        <option value="RECEIVE">Receive Stock</option>
                                        <option value="RETURN">Return Stock</option>
                                        <option value="SET">Set Stock (Adjust)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Size</label>
                                    <select
                                        className="input"
                                        value={selectedSize}
                                        onChange={(e) => setSelectedSize(e.target.value)}
                                    >
                                        <option value="">Select size</option>
                                        {getSortedSizes(actionModal.product.sizes).map((s) => (
                                            <option key={s.size} value={s.size}>
                                                {s.size} (stock {s.stockQuantity})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Quantity</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min={actionType === 'SET' ? 0 : 1}
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Note (optional)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="e.g., supplier delivery"
                                        disabled={actionType === 'SET'}
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button className="btn btn-secondary" onClick={closeActionModal} type="button">
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleConfirmAction}
                                    disabled={actionLoading}
                                    type="button"
                                >
                                    {actionLoading ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
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
                                            {getSortedSizes(product.sizes).map((s, i) => (
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
                                                onClick={() => openActionModal(product)}
                                            >
                                                Stock
                                            </button>
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

            {/* Stock Movements */}
            <div className="products-section">
                <div className="section-header">
                    <h2>📦 Stock Movements</h2>
                    <button className="btn btn-sm btn-outline" onClick={fetchStockMovements}>
                        Refresh
                    </button>
                </div>
                <div className="table-container">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>Size</th>
                                <th>Qty</th>
                                <th>Direction</th>
                                <th>Reason</th>
                                <th>User</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movementsLoading ? (
                                <tr>
                                    <td colSpan="8">Loading...</td>
                                </tr>
                            ) : stockMovements.length === 0 ? (
                                <tr>
                                    <td colSpan="8">No stock movements found.</td>
                                </tr>
                            ) : (
                                stockMovements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td>{new Date(movement.occurredAt).toLocaleString()}</td>
                                        <td>{movement.productName}</td>
                                        <td>{movement.size}</td>
                                        <td>{movement.quantity}</td>
                                        <td>{movement.direction}</td>
                                        <td>{movement.reason}</td>
                                        <td>{movement.username}</td>
                                        <td>{movement.note || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
