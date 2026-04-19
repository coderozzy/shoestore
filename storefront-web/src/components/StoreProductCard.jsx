import { Link } from 'react-router-dom';

const formatPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? `₺${n.toFixed(2)}` : '—';
};

export default function StoreProductCard({ product }) {
    const totalStock = product.sizes?.reduce((sum, s) => sum + (s.stockQuantity || 0), 0) ?? 0;
    const outOfStock = totalStock === 0;
    const primaryImage = product.imageDataUrls?.[0] || product.imageDataUrl;
    const showStrike = product.discounted
        && product.originalPrice != null
        && Number(product.originalPrice) !== Number(product.effectivePrice);

    return (
        <Link to={`/product/${product.id}`} className={`store-card ${outOfStock ? 'out-of-stock' : ''}`}>
            <div className="store-card-image">
                {primaryImage ? (
                    <img src={primaryImage} alt={product.modelName} loading="lazy" />
                ) : '👟'}
            </div>
            <div className="store-card-body">
                <h3 className="store-card-title">{product.modelName}</h3>
                <p className="store-card-meta">
                    {product.color}{product.categoryName ? ` · ${product.categoryName}` : ''}
                </p>
                <p className="store-card-price">
                    {showStrike && (
                        <span className="original-price">{formatPrice(product.originalPrice)}</span>
                    )}
                    <span className="effective-price">{formatPrice(product.effectivePrice)}</span>
                </p>
                {outOfStock && <p className="out-of-stock-label">Out of stock</p>}
                {product.discountName && (
                    <p className="discount-label">🏷️ {product.discountName}</p>
                )}
            </div>
        </Link>
    );
}
