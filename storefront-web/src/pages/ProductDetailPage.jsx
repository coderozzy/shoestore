import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import storefrontService from '../services/storefrontService.js';
import { useCart } from '../context/CartContext.jsx';
import LeatherSwatch from '../components/LeatherSwatch.jsx';

/** Format ₺ price with Turkish grouping. Matches the Steps design (no decimals). */
const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
};

/**
 * Two-column product detail layout:
 *   • Left: large square product image (or leather swatch fallback)
 *   • Right: category eyebrow → serif title → color meta → price + sale
 *            pill → description → size picker → primary CTA → perks
 *
 * Sizes use a single-row flex grid matching the design. Out-of-stock
 * sizes are dimmed and strike-through. Selecting then clicking "Add to
 * cart" briefly flashes a success state on the button.
 */
export default function ProductDetailPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [added, setAdded] = useState(false);
    const [sizeError, setSizeError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        storefrontService.getProducts()
            .then((products) => {
                if (cancelled) return;
                const match = products.find((p) => String(p.id) === String(productId));
                if (!match) {
                    setError('Product not found.');
                } else {
                    setProduct(match);
                    setSelectedImageIndex(0);
                    const firstAvailable = match.sizes?.find((s) => s.stockQuantity > 0);
                    if (firstAvailable) setSelectedSize(firstAvailable.size);
                }
            })
            .catch(() => !cancelled && setError('Unable to load product details.'))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [productId]);

    const sortedSizes = useMemo(
        () => [...(product?.sizes || [])].sort((a, b) => Number(a.size) - Number(b.size)),
        [product]
    );

    const productImages = useMemo(() => {
        if (product?.imageDataUrls?.length) return product.imageDataUrls;
        if (product?.imageDataUrl) return [product.imageDataUrl];
        return [];
    }, [product]);

    if (loading) {
        return (
            <div className="product-detail">
                <div className="product-detail-grid">
                    <div className="skeleton-image" style={{ borderRadius: 'var(--r-md)', aspectRatio: 1 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="skeleton-text" style={{ width: '60%', height: 28, margin: 0 }} />
                        <div className="skeleton-text" style={{ width: '40%', margin: 0 }} />
                        <div className="skeleton-text" style={{ width: '30%', height: 24, margin: 0 }} />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="store-alert">
                {error} <Link to="/shop" style={{ textDecoration: 'underline' }}>Back to the catalog</Link>
            </div>
        );
    }
    if (!product) return null;

    const showStrike = product.discounted
        && product.originalPrice != null
        && Number(product.originalPrice) !== Number(product.effectivePrice);

    const totalStock = sortedSizes.reduce((s, sz) => s + (sz.stockQuantity || 0), 0);
    const outOfStock = totalStock === 0;

    const handleAddToCart = () => {
        if (selectedSize == null) {
            setSizeError('Please select a size');
            return;
        }
        addItem({
            productId: product.id,
            modelName: product.modelName,
            color: product.color,
            size: selectedSize,
            unitPrice: product.effectivePrice,
            quantity: 1
        });
        setAdded(true);
        setSizeError('');
        setTimeout(() => setAdded(false), 2000);
    };

    const handleBuyNow = () => {
        if (selectedSize == null) {
            setSizeError('Please select a size');
            return;
        }
        addItem({
            productId: product.id,
            modelName: product.modelName,
            color: product.color,
            size: selectedSize,
            unitPrice: product.effectivePrice,
            quantity: 1
        });
        navigate('/cart');
    };

    return (
        <div className="product-detail">
            <Link to="/shop" className="back-link">← Back to the catalog</Link>

            <div className="product-detail-grid">
                <div className="product-detail-image">
                    {productImages.length > 0 ? (
                        <img
                            src={productImages[selectedImageIndex] || productImages[0]}
                            alt={product.modelName}
                        />
                    ) : (
                        <LeatherSwatch color={product.color} id={product.id} />
                    )}
                </div>

                <div className="product-detail-body">
                    {product.categoryName && (
                        <p className="product-detail-meta">{product.categoryName}</p>
                    )}
                    <h1>{product.modelName}</h1>
                    <p className="product-detail-color">
                        Color: <strong>{product.color}</strong>
                        {product.gender && (
                            <> · {product.gender === 'MALE' ? 'Men' : 'Women'}</>
                        )}
                    </p>

                    <div className="product-detail-price">
                        {showStrike && (
                            <span className="original-price">{formatPrice(product.originalPrice)}</span>
                        )}
                        <span className="effective-price">{formatPrice(product.effectivePrice)}</span>
                        {showStrike && <span className="sale-pill">Sale</span>}
                    </div>

                    {product.discountName && (
                        <p className="discount-badge">{product.discountName}</p>
                    )}

                    <p className="product-detail-desc">
                        {product.description
                            || `Full-grain ${(product.color || 'leather').toLowerCase()} leather upper with leather lining and insole. Durable rubber sole. Goodyear welted construction ensures longevity and full resolability.`}
                    </p>

                    {productImages.length > 1 && (
                        <div className="product-gallery-strip">
                            {productImages.map((image, index) => (
                                <button
                                    key={`${product.id}-${index}`}
                                    type="button"
                                    className={`product-gallery-thumb${selectedImageIndex === index ? ' active' : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                    aria-label={`Show image ${index + 1}`}
                                >
                                    <img src={image} alt="" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="size-picker">
                        <h3>Select size — EU</h3>
                        <div className="size-grid">
                            {sortedSizes.map((size) => {
                                const disabled = size.stockQuantity === 0;
                                const active = selectedSize === size.size;
                                return (
                                    <button
                                        key={size.size}
                                        type="button"
                                        className={`size-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                                        onClick={() => {
                                            if (disabled) return;
                                            setSelectedSize(size.size);
                                            setSizeError('');
                                        }}
                                        disabled={disabled}
                                    >
                                        {size.size}
                                    </button>
                                );
                            })}
                        </div>
                        {sizeError && <p className="err-msg">{sizeError}</p>}
                    </div>

                    {outOfStock ? (
                        <button className="store-button full" disabled>Out of stock</button>
                    ) : (
                        <div className="product-detail-actions">
                            <button
                                type="button"
                                className={`store-button full${added ? ' done' : ''}`}
                                onClick={handleAddToCart}
                            >
                                {added ? 'Added to cart' : 'Add to cart'}
                            </button>
                            <button
                                type="button"
                                className="store-button outline full"
                                onClick={handleBuyNow}
                            >
                                Buy now
                            </button>
                        </div>
                    )}

                    <div className="product-perks">
                        <span>Free shipping on orders over ₺500</span>
                        <span>14-day hassle-free returns</span>
                        <span>Genuine full-grain leather guarantee</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
