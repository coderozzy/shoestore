import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import GenderFilter from '../components/GenderFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import productService from '../services/productService';
import './ProductsPage.css';

export default function ProductsPage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [genderFilter, setGenderFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await productService.getAllProducts();
            setProducts(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesGender = genderFilter === 'ALL' || product.gender === genderFilter;
        const matchesSearch = product.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.color.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesGender && matchesSearch;
    });

    const handleSell = async (productId) => {
        try {
            const updatedProduct = await productService.sellProduct(productId);
            setProducts(products.map(p => p.id === productId ? updatedProduct : p));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to sell product');
        }
    };

    const [selectedQrProduct, setSelectedQrProduct] = useState(null);

    const handleShowQr = (product) => {
        setSelectedQrProduct(product);
    };

    const handleCloseQrModal = () => {
        setSelectedQrProduct(null);
    };

    const handlePrintQr = () => {
        if (!selectedQrProduct) return;

        const qrUrl = productService.getQrCodeImageUrl(selectedQrProduct.id);
        const printWindow = window.open('', '_blank');

        // Format sizes string
        const sizesText = selectedQrProduct.sizes?.map(s => `${s.size} (${s.stockQuantity})`).join(', ') || 'Out of Stock';

        printWindow.document.write(`
            <html>
                <head><title>QR Kod - ${selectedQrProduct.modelName}</title></head>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
                    <img src="${qrUrl}" style="width:300px;height:300px;" onload="window.print();"/>
                    <h2>${selectedQrProduct.modelName}</h2>
                    <p>Renk: ${selectedQrProduct.color}</p>
                    <p>Bedenler: ${sizesText}</p>
                    <p>Fiyat: ₺${selectedQrProduct.price}</p>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setUserRole(user.role);
        }
    }, []);

    const handleDelete = async (productId) => {
        if (!window.confirm('Are you sure you want to permanently delete this product and its QR code?')) {
            return;
        }
        try {
            await productService.deleteProduct(productId);
            setProducts(products.filter(p => p.id !== productId));
        } catch (err) {
            alert(err.response?.data?.message || 'Product could not be deleted');
        }
    };

    const handleDeleteClick = (productId) => {
        if (userRole !== 'ADMIN') {
            alert('You are not authorized to perform this action!');
            return;
        }
        handleDelete(productId);
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
            {/* QR Code Modal */}
            {selectedQrProduct && (
                <div className="qr-modal-overlay" onClick={handleCloseQrModal}>
                    <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="qr-modal-header">
                            <h3>QR Code</h3>
                            <button className="close-btn" onClick={handleCloseQrModal}>×</button>
                        </div>
                        <div className="qr-modal-body">
                            <img
                                src={productService.getQrCodeImageUrl(selectedQrProduct.id)}
                                alt="Product QR Code"
                                className="qr-image-large"
                            />
                            <h4>{selectedQrProduct.modelName}</h4>
                            <p className="qr-value-text">{selectedQrProduct.qrCodeValue}</p>
                        </div>
                        <div className="qr-modal-actions">
                            <button className="btn btn-secondary" onClick={handlePrintQr}>
                                🖨️ Print
                            </button>
                            <button className="btn btn-primary" onClick={handleCloseQrModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="products-header">
                <div className="header-actions">
                    <h1>📦 Products</h1>
                    <button className="btn btn-primary" onClick={() => navigate('/scan')}>
                        📸 Scan QR
                    </button>
                </div>
                <p>{filteredProducts.length} products found</p>
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
                            showActions={false}
                            showQrAction={true}
                            onShowQr={handleShowQr}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
