import './ProductCard.css';

const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_SIZE_THRESHOLD = 3;

export default function ProductCard({ product, onSell, onShowQr, onDelete, showActions = false, showQrAction = false }) {
    const formatPrice = (price) => new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(Number.isFinite(Number(price)) ? Number(price) : 0);

    const sortedSizes = [...(product.sizes || [])].sort((a, b) => Number(a.size) - Number(b.size));

    const totalStock = product.totalStock
        ?? product.sizes?.reduce((sum, s) => sum + (s.stockQuantity || 0), 0)
        ?? 0;
    const isLowStock = product.sizes?.some((s) => (s.stockQuantity ?? 0) <= LOW_STOCK_SIZE_THRESHOLD)
        || totalStock <= LOW_STOCK_THRESHOLD;

    const genderClass = product.gender ? product.gender.toLowerCase() : 'unknown';

    return (
        <div className="product-card fade-in">
            <div className="product-header">
                <h3 className="product-name">{product.modelName}</h3>
                <span className={`badge badge-${genderClass}`}>
                    {product.gender ?? '—'}
                </span>
            </div>

            <div className="product-details">
                <div className="detail-row">
                    <span className="detail-label">Color</span>
                    <span className="detail-value">{product.color ?? '—'}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Price</span>
                    <span className="detail-value price">{formatPrice(product.price)}</span>
                </div>

                <div className="detail-row sizes-row">
                    <span className="detail-label">Sizes & Stock</span>
                    <div className="sizes-grid">
                        {sortedSizes.map((sizeObj) => (
                            <div key={sizeObj.id ?? sizeObj.size}
                                 className={`size-badge ${sizeObj.stockQuantity === 0 ? 'out-of-stock' : ''}`}>
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

            {showActions && (
                <div className="product-actions">
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
