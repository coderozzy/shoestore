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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    if (loading) return <p className="store-loading">Loading…</p>;
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
    };

    const handleBuyNow = () => {
        handleAddToCart();
        navigate('/cart');
    };

    return (
        <div className="product-detail">
            <Link to="/" className="back-link">← Back to catalog</Link>

            <div className="product-detail-grid">
                <div className="product-detail-image">👟</div>
                <div className="product-detail-body">
                    <h1>{product.modelName}</h1>
                    <p className="product-detail-meta">
                        {product.color}{product.categoryName ? ` · ${product.categoryName}` : ''}
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

                    <div className="product-detail-actions">
                        <button
                            type="button"
                            className="store-button outline"
                            onClick={handleAddToCart}
                            disabled={selectedSize == null}
                        >
                            Add to cart
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
                </div>
            </div>
        </div>
    );
}
