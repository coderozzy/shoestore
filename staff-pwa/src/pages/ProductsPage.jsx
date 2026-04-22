import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import GenderFilter from '../components/GenderFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import productService from '../services/productService';
import authService from '../services/authService';
import { openPrintableQr } from '../utils/printQr';
import './ProductsPage.css';

export default function ProductsPage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [genderFilter, setGenderFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [userRole] = useState(() => authService.getUser()?.role ?? null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await productService.getAllProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        const needle = searchTerm.trim().toLowerCase();
        return products.filter((product) => {
            const matchesGender = genderFilter === 'ALL' || product.gender === genderFilter;
            if (!needle) return matchesGender;
            const modelName = (product.modelName || '').toLowerCase();
            const color = (product.color || '').toLowerCase();
            return matchesGender && (modelName.includes(needle) || color.includes(needle));
        });
    }, [products, genderFilter, searchTerm]);

    const [actionModal, setActionModal] = useState({ open: false, product: null });
    const [actionType, setActionType] = useState('RECEIVE');
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    const openActionModal = (product) => {
        const firstSize = product.sizes?.[0]?.size ?? '';
        setActionModal({ open: true, product });
        setActionType(userRole === 'ADMIN' ? 'SELL' : 'RECEIVE');
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
        if (actionType === 'SELL' && userRole !== 'ADMIN') {
            setActionError('Selling is only available via QR scan for staff.');
            return;
        }
        if (actionType === 'SELL' || actionType === 'RECEIVE' || actionType === 'RETURN') {
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
            if (actionType === 'SELL') {
                updatedProduct = await productService.sellProduct(actionModal.product.id, selectedSize, quantity);
            } else if (actionType === 'RECEIVE') {
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

            setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
            closeActionModal();
        } catch (err) {
            setActionError(err.response?.data?.message || 'Action could not be completed');
        } finally {
            setActionLoading(false);
        }
    };

    const [selectedQrProduct, setSelectedQrProduct] = useState(null);
    const [qrImageUrl, setQrImageUrl] = useState('');

    useEffect(() => {
        if (!selectedQrProduct) {
            setQrImageUrl('');
            return undefined;
        }
        let revoked = false;
        let url = '';
        productService.fetchQrImageObjectUrl(selectedQrProduct.id)
            .then((objectUrl) => {
                if (revoked) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                url = objectUrl;
                setQrImageUrl(objectUrl);
            })
            .catch(() => setQrImageUrl(''));
        return () => {
            revoked = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [selectedQrProduct]);

    const handleShowQr = (product) => setSelectedQrProduct(product);
    const handleCloseQrModal = () => setSelectedQrProduct(null);

    const handlePrintQr = () => {
        if (!selectedQrProduct) return;
        if (!qrImageUrl) {
            alert('QR image is still loading, try again in a moment.');
            return;
        }
        const sizesText = selectedQrProduct.sizes?.map((s) => `${s.size} (${s.stockQuantity})`).join(', ')
            || 'Out of Stock';
        openPrintableQr({
            imageUrl: qrImageUrl,
            title: `QR Kod - ${selectedQrProduct.modelName || 'Product'}`,
            lines: [
                { label: 'Model', value: selectedQrProduct.modelName || '' },
                { label: 'Renk', value: selectedQrProduct.color || '' },
                { label: 'Bedenler', value: sizesText },
                { label: 'Fiyat', value: `₺${selectedQrProduct.price ?? ''}` }
            ]
        });
    };

    if (loading) {
        return (
            <div className="products-page">
                <LoadingSpinner text="Loading products..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="products-page">
                <div className="error-container">
                    <p className="alert alert-error">{error}</p>
                    <button className="btn btn-primary" onClick={fetchProducts}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="products-page">
            {selectedQrProduct && (
                <div className="qr-modal-overlay" onClick={handleCloseQrModal}>
                    <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="qr-modal-header">
                            <h3>QR Code</h3>
                            <button className="close-btn" onClick={handleCloseQrModal}>×</button>
                        </div>
                        <div className="qr-modal-body">
                            {qrImageUrl
                                ? <img src={qrImageUrl} alt="Product QR Code" className="qr-image-large" />
                                : <LoadingSpinner text="Loading QR code..." />}
                            <h4>{selectedQrProduct.modelName}</h4>
                            <p className="qr-value-text">{selectedQrProduct.qrCodeValue}</p>
                        </div>
                        <div className="qr-modal-actions">
                            <button className="btn btn-secondary" onClick={handlePrintQr}>
                                Print label
                            </button>
                            <button className="btn btn-primary" onClick={handleCloseQrModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {actionModal.open && (
                <div className="modal-overlay" onClick={closeActionModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
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
                                        {userRole === 'ADMIN' && <option value="SELL">Sell</option>}
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
                                        {actionModal.product.sizes?.map((s) => (
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
                                        min={actionType === 'SELL' ? 1 : 0}
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
                                        disabled={actionType === 'SELL' || actionType === 'SET'}
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

            <div className="products-header">
                <div className="header-actions">
                    <h1>Products</h1>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
                        Scan QR
                    </button>
                </div>
                <p>{filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} in catalog</p>
            </div>

            <div className="products-filters">
                <div className="search-box">
                    <input
                        type="text"
                        className="input"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <GenderFilter selected={genderFilter} onChange={setGenderFilter} />
            </div>

            {filteredProducts.length === 0 ? (
                <div className="no-products">
                    <p>No products found</p>
                </div>
            ) : (
                <div className="products-grid">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            showActions={userRole === 'ADMIN'}
                            showQrAction={true}
                            onShowQr={handleShowQr}
                            onSell={() => openActionModal(product)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
