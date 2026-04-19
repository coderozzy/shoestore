import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import storefrontService from '../services/storefrontService.js';
import { useCart } from '../context/CartContext.jsx';

const formatPrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? `₺${n.toFixed(2)}` : '—';
};

export default function ProductDetailPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [product, setProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [addedFeedback, setAddedFeedback] = useState(false);

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

    const sortedSizes = useMemo(() => {
        return [...(product?.sizes || [])].sort((a, b) => Number(a.size) - Number(b.size));
    }, [product]);

    const productImages = useMemo(() => {
        if (product?.imageDataUrls?.length) return product.imageDataUrls;
        if (product?.imageDataUrl) return [product.imageDataUrl];
        return [];
    }, [product]);

    if (loading) {
        return (
            <div className="product-detail" style={{ gap: '1rem' }}>
                <div style={{ width: 120, height: 14, borderRadius: 4, background: '#e9ecef' }} />
                <div className="product-detail-grid">
                    <div className="skeleton-image" style={{ borderRadius: 16, aspectRatio: '1' }} />
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
                {error} <Link to="/">Back to catalog</Link>
            </div>
        );
    }
    if (!product) return null;

    const showStrike = product.discounted
        && product.originalPrice != null
        && Number(product.originalPrice) !== Number(product.effectivePrice);

    const totalStock = sortedSizes.reduce((s, sz) => s + (sz.stockQuantity || 0), 0);

    const handleAddToCart = () => {
        if (selectedSize == null) return;
        addItem({
            productId: product.id,
            modelName: product.modelName,
            color: product.color,
            size: selectedSize,
            unitPrice: product.effectivePrice,
            quantity: 1
        });
        setAddedFeedback(true);
        setTimeout(() => setAddedFeedback(false), 1800);
    };

    const handleBuyNow = () => {
        if (selectedSize == null) return;
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
            <Link to="/" className="back-link">&larr; Back to catalog</Link>

            <div className="product-detail-grid">
                <div className="product-detail-image">
                    {productImages.length > 0 ? (
                        <img
                            src={productImages[selectedImageIndex] || productImages[0]}
                            alt={product.modelName}
                        />
                    ) : (
                        <span style={{ fontSize: '6rem' }}>👟</span>
                    )}
                </div>

                <div className="product-detail-body">
                    <h1>{product.modelName}</h1>
                    <p className="product-detail-meta">
                        {product.color}
                        {product.categoryName ? ` · ${product.categoryName}` : ''}
                        {product.gender ? ` · ${product.gender === 'MALE' ? 'Men' : 'Women'}` : ''}
                    </p>

                    <p className="product-detail-price">
                        {showStrike && (
                            <span className="original-price">{formatPrice(product.originalPrice)}</span>
                        )}
                        <span className="effective-price">{formatPrice(product.effectivePrice)}</span>
                    </p>

                    {product.discountName && (
                        <p className="discount-badge">🏷️ {product.discountName}</p>
                    )}

                    {productImages.length > 1 && (
                        <div className="product-gallery-strip">
                            {productImages.map((image, index) => (
                                <button
                                    key={`${product.id}-${index}`}
                                    type="button"
                                    className={`product-gallery-thumb ${selectedImageIndex === index ? 'active' : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <img src={image} alt={`${product.modelName} ${index + 1}`} />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="size-picker">
                        <h3>Choose size</h3>
                        <div className="size-grid">
                            {sortedSizes.map((size) => {
                                const disabled = size.stockQuantity === 0;
                                const active = selectedSize === size.size;
                                return (
                                    <button
                                        key={size.size}
                                        type="button"
                                        className={`size-btn ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                                        onClick={() => !disabled && setSelectedSize(size.size)}
                                        disabled={disabled}
                                    >
                                        {size.size}
                                        <span className="size-stock">
                                            {disabled ? 'sold out' : `${size.stockQuantity} left`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {totalStock === 0 ? (
                        <p style={{
                            marginTop: '1.5rem',
                            color: 'var(--danger)',
                            fontWeight: 700,
                            fontSize: '0.95rem'
                        }}>
                            This product is currently out of stock.
                        </p>
                    ) : (
                        <div className="product-detail-actions">
                            <button
                                type="button"
                                className="store-button outline"
                                onClick={handleAddToCart}
                                disabled={selectedSize == null}
                            >
                                {addedFeedback ? 'Added!' : 'Add to cart'}
                            </button>
                            <button
                                type="button"
                                className="store-button"
                                onClick={handleBuyNow}
                                disabled={selectedSize == null}
                            >
                                Buy now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
