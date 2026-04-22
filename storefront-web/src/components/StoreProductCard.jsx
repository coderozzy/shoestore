import { Link } from 'react-router-dom';
import LeatherSwatch from './LeatherSwatch.jsx';

/** Format a price in Turkish Lira with no currency trailing zeros. */
const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    // Match the design: ₺890 (no decimals), grouped with Turkish locale.
    return `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
};

/**
 * Product card in the Steps editorial style. Falls back to a leather-tone
 * diagonal stripe swatch when the product has no uploaded image.
 */
export default function StoreProductCard({ product }) {
    const totalStock = product.sizes?.reduce((sum, s) => sum + (s.stockQuantity || 0), 0) ?? 0;
    const outOfStock = totalStock === 0;
    const primaryImage = product.imageDataUrls?.[0] || product.imageDataUrl;
    const showStrike = product.discounted
        && product.originalPrice != null
        && Number(product.originalPrice) !== Number(product.effectivePrice);

    return (
        <Link
            to={`/product/${product.id}`}
            className={`store-card${outOfStock ? ' out-of-stock' : ''}`}
        >
            <div className="store-card-image">
                {primaryImage
                    ? <img src={primaryImage} alt={product.modelName} loading="lazy" />
                    : <LeatherSwatch color={product.color} id={product.id} />}
                {showStrike && !outOfStock && (
                    <span className="store-card-badge">Sale</span>
                )}
                {outOfStock && (
                    <span className="store-card-badge sold-out">Sold out</span>
                )}
            </div>
            <div className="store-card-body">
                <p className="store-card-meta">
                    {[product.categoryName, product.color].filter(Boolean).join(' · ')}
                </p>
                <h3 className="store-card-title">{product.modelName}</h3>
                <p className="store-card-price">
                    {showStrike && (
                        <span className="original-price">{formatPrice(product.originalPrice)}</span>
                    )}
                    <span>{formatPrice(product.effectivePrice)}</span>
                </p>
                {product.discountName && !outOfStock && (
                    <p className="discount-label">{product.discountName}</p>
                )}
            </div>
        </Link>
    );
}
