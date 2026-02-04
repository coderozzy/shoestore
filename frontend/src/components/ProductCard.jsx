import productService from '../services/productService';
import './ProductCard.css';

export default function ProductCard({ product, onSell, onAddStock, onShowQr, onDelete, showActions = false, showQrAction = false }) {
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    // Calculate total stock if not provided (though backend usually provides it)
    const totalStock = product.totalStock ?? product.sizes?.reduce((sum, s) => sum + s.stockQuantity, 0) ?? 0;
    const isLowStock = product.sizes?.some(s => s.stockQuantity <= 3) || totalStock <= 5; // Simplified logic

    return (
        <div className="product-card fade-in">
            <div className="product-header">
                <h3 className="product-name">{product.modelName}</h3>
                <span className={`badge badge-${product.gender.toLowerCase()}`}>
                    {product.gender}
                </span>
            </div>

            <div className="product-details">
                <div className="detail-row">
                    <span className="detail-label">Color</span>
                    <span className="detail-value">{product.color}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Price</span>
                    <span className="detail-value price">{formatPrice(product.price)}</span>
                </div>

                {/* Sizes Display */}
                <div className="detail-row sizes-row">
                    <span className="detail-label">Sizes & Stock</span>
                    <div className="sizes-grid">
                        {product.sizes?.map((sizeObj, index) => (
                            <div key={index} className={`size-badge ${sizeObj.stockQuantity === 0 ? 'out-of-stock' : ''}`}>
                                <span className="size-num">{sizeObj.size}</span>
                                <span className="stock-num">x{sizeObj.stockQuantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="detail-row">
                    <span className="detail-label">Total Stock</span>
                    <span className={`detail-value ${isLowStock ? 'low-stock' : ''}`}>
                        {totalStock}
                        {isLowStock && <span className="stock-warning"> ⚠️ Low</span>}
                    </span>
                </div>

                {product.categoryName && (
                    <div className="detail-row">
                        <span className="detail-label">Category</span>
                        <span className="detail-value">{product.categoryName}</span>
                    </div>
                )}
            </div>

            {/* Actions are usually handled by parent (like ScannerPage) now, 
                but keeping this for backward compatibility or direct calls if needed.
                However, for multi-size, simple actions might be ambiguous. 
                We'll hide generic sell button if we need size selection.
            */}
            {showActions && (
                <div className="product-actions">
                    {/* Replaced generic Sell/AddStock with size-specific logic in ScannerPage.
                        If showActions is true here, we might want to trigger a callback that opens a modal.
                    */}
                    <button
                        className="btn btn-primary action-btn"
                        onClick={() => onSell?.(product.id)}
                        disabled={totalStock === 0}
                    >
                        Action Menu
                    </button>
                </div>
            )}

            {showQrAction && (
                <div className="product-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => onShowQr?.(product)}
                    >
                        🔳 Show QR
                    </button>
                </div>
            )}

            <div className="product-qr">
                <span className="qr-label">QR Code</span>
                <code className="qr-value">{product.qrCodeValue}</code>
            </div>

            {onDelete && (
                <div className="delete-action">
                    <button
                        className="btn btn-danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(product.id);
                        }}
                    >
                        🗑️ Delete
                    </button>
                </div>
            )}
        </div>
    );
}
