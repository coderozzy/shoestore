import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import productService from '../services/productService';
import './ScannerPage.css';

export default function ScannerPage() {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState(null);
    const [scannedQrForCreation, setScannedQrForCreation] = useState(null);

    // 'sell' or 'stock'
    const [mode, setMode] = useState('sell');

    // Sell Mode State
    const [selectedSize, setSelectedSize] = useState('');

    // Stock Mode State
    const [newSize, setNewSize] = useState('');
    const [newSizeStock, setNewSizeStock] = useState('1');
    const [stockUpdates, setStockUpdates] = useState({}); // { size: quantity }

    const navigate = useNavigate();

    const handleScan = async (qrCode) => {
        setLoading(true);
        setError(null);
        setProduct(null);
        setSuccessMsg(null);
        setScannedQrForCreation(null);
        setSelectedSize('');
        setNewSize('');
        setNewSizeStock('1');
        setStockUpdates({});

        try {
            const productData = await productService.getProductByQrCode(qrCode);
            setProduct(productData);
            // Pre-select first available size for selling
            const availableSize = productData.sizes?.find(s => s.stockQuantity > 0);
            if (availableSize) {
                setSelectedSize(availableSize.size.toString());
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Product not found.');
                setScannedQrForCreation(qrCode);
            } else {
                setError(err.response?.data?.message || 'Failed to fetch product');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProduct = () => {
        navigate('/generate-qr', { state: { qrCodeValue: scannedQrForCreation } });
    };

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    // --- SELL LOGIC ---
    const handleSell = async () => {
        if (!selectedSize) {
            alert('Please select a size');
            return;
        }

        setActionLoading(true);
        try {
            const updatedProduct = await productService.sellProduct(product.id, parseFloat(selectedSize));
            setProduct(updatedProduct);
            showSuccess(`Sale Successful! Stock updated.`);

            // Re-check selected size stock
            const updatedSize = updatedProduct.sizes.find(s => s.size === parseFloat(selectedSize));
            if (!updatedSize || updatedSize.stockQuantity === 0) {
                const nextAvailable = updatedProduct.sizes.find(s => s.stockQuantity > 0);
                setSelectedSize(nextAvailable ? nextAvailable.size.toString() : '');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Sale failed');
        } finally {
            setActionLoading(false);
        }
    };

    // --- STOCK LOGIC ---
    const handleUpdateStock = async (size) => {
        const qty = parseInt(stockUpdates[size] || 0);
        if (qty === 0) return;

        setActionLoading(true);
        try {
            // This endpoint adds to existing stock
            const updatedProduct = await productService.updateSizeStock(product.id, size, qty);
            setProduct(updatedProduct);
            showSuccess(`${qty} units of stock added for size ${size}.`);
            setStockUpdates(prev => ({ ...prev, [size]: '' }));
        } catch (err) {
            setError(err.response?.data?.message || 'Stock could not be updated');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddNewSize = async (e) => {
        e.preventDefault();
        if (!newSize || !newSizeStock) return;

        setActionLoading(true);
        try {
            const sizeData = {
                size: parseFloat(newSize),
                stockQuantity: parseInt(newSizeStock)
            };
            const updatedProduct = await productService.addSize(product.id, sizeData);
            setProduct(updatedProduct);
            showSuccess(`${newSize} size added.`);
            setNewSize('');
            setNewSizeStock('1');
        } catch (err) {
            setError(err.response?.data?.message || 'Size could not be added');
        } finally {
            setActionLoading(false);
        }
    };

    const handleScanAgain = () => {
        setProduct(null);
        setError(null);
        setSuccessMsg(null);
        setScannedQrForCreation(null);
    };

    return (
        <div className="scanner-page">
            {/* Success Popup */}
            {successMsg && (
                <div className="sell-success-popup">
                    <div className="success-content">
                        <div className="success-icon">🎉</div>
                        <h3>Operation Successful!</h3>
                        <p>{successMsg}</p>
                    </div>
                </div>
            )}

            {!product && !loading && (
                <QRScanner onScan={handleScan} onError={(err) => console.error(err)} />
            )}

            {loading && (
                <div className="scanner-loading">
                    <LoadingSpinner text="Searching for product..." />
                </div>
            )}

            {error && !loading && (
                <div className="scanner-result error-result">
                    <div className="result-icon">❌</div>
                    <h3>Error</h3>
                    <p>{error}</p>
                    {scannedQrForCreation && (
                        <div className="create-product-action">
                            <p className="create-hint">This QR code is not registered in the system.</p>
                            <button className="btn btn-primary" onClick={handleCreateProduct}>
                                ✨ Create New Product
                            </button>
                        </div>
                    )}
                    <button className="btn btn-secondary" onClick={handleScanAgain}>
                        Scan Again
                    </button>
                </div>
            )}

            {product && !loading && (
                <div className="scanner-result success-result fade-in">
                    <div className="result-header">
                        <div className="result-icon">✅</div>
                        <h3>Product Found</h3>
                    </div>

                    <ProductCard
                        product={product}
                        showActions={false}
                    />

                    {/* Mode Tabs */}
                    <div className="mode-tabs">
                        <button
                            className={`tab-btn ${mode === 'sell' ? 'active' : ''}`}
                            onClick={() => setMode('sell')}
                        >
                            💰 Sell
                        </button>
                        <button
                            className={`tab-btn ${mode === 'stock' ? 'active' : ''}`}
                            onClick={() => setMode('stock')}
                        >
                            📦 Stock Management
                        </button>
                    </div>

                    {/* SELL MODE */}
                    {mode === 'sell' && (
                        <div className="sales-section">
                            <h4>Sale Operation</h4>

                            {product.sizes && product.sizes.length > 0 ? (
                                <div className="sales-controls">
                                    <div className="size-selector">
                                        <label>Select Size:</label>
                                        <div className="size-options">
                                            {product.sizes.map((s) => (
                                                <button
                                                    key={s.size}
                                                    className={`size-option-btn ${selectedSize === s.size.toString() ? 'selected' : ''} ${s.stockQuantity === 0 ? 'disabled' : ''}`}
                                                    onClick={() => s.stockQuantity > 0 && setSelectedSize(s.size.toString())}
                                                    disabled={s.stockQuantity === 0}
                                                >
                                                    {s.size}
                                                    <span className="stock-tiny">{s.stockQuantity}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary sell-btn"
                                        onClick={handleSell}
                                        disabled={!selectedSize || actionLoading}
                                    >
                                        {actionLoading ? 'Processing...' : `💰 Sell (${selectedSize ? `Size: ${selectedSize}` : 'Select'})`}
                                    </button>
                                </div>
                            ) : (
                                <div className="no-stock-msg">
                                    <p>No stock has been added to this product yet.</p>
                                    <button className="btn btn-link" onClick={() => setMode('stock')}>
                                        Add Stock →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STOCK MODE */}
                    {mode === 'stock' && (
                        <div className="stock-section">
                            <h4>Stock Management (Warehouse)</h4>

                            {/* Existing Sizes */}
                            <div className="existing-sizes-list">
                                {product.sizes?.map((s) => (
                                    <div key={s.size} className="stock-item">
                                        <div className="stock-info-col">
                                            <span className="size-label">Size: {s.size}</span>
                                            <span className="current-stock">Current: {s.stockQuantity}</span>
                                        </div>
                                        <div className="stock-action-col">
                                            <input
                                                type="number"
                                                className="stock-input"
                                                placeholder="+ Qty"
                                                value={stockUpdates[s.size] || ''}
                                                onChange={(e) => setStockUpdates({ ...stockUpdates, [s.size]: e.target.value })}
                                            />
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleUpdateStock(s.size)}
                                                disabled={!stockUpdates[s.size]}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add New Size */}
                            <form onSubmit={handleAddNewSize} className="add-new-size-form">
                                <h5>Add New Size</h5>
                                <div className="new-size-row">
                                    <input
                                        type="number"
                                        placeholder="Size (e.g. 44)"
                                        className="input"
                                        value={newSize}
                                        onChange={(e) => setNewSize(e.target.value)}
                                        step="0.5"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        className="input"
                                        value={newSizeStock}
                                        onChange={(e) => setNewSizeStock(e.target.value)}
                                        min="1"
                                        required
                                    />
                                </div>
                                <button className="btn btn-primary w-100" type="submit" disabled={actionLoading}>
                                    {actionLoading ? 'Adding...' : '✨ Add New Size'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="result-actions">
                        <button className="btn btn-secondary" onClick={handleScanAgain}>
                            New Scan
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => navigate(`/products`)}
                        >
                            Return to List
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
