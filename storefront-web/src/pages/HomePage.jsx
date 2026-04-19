import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import storefrontService from '../services/storefrontService.js';
import StoreProductCard from '../components/StoreProductCard.jsx';

function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-text" style={{ width: '75%' }} />
            <div className="skeleton-text short" />
        </div>
    );
}

/* ---- small reusable section header ---- */
function SectionHeader({ title, subtitle, linkTo, linkLabel }) {
    return (
        <div className="section-heading">
            <div>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {linkTo && (
                <Link to={linkTo} className="section-link">{linkLabel || 'View all'} &rarr;</Link>
            )}
        </div>
    );
}

export default function HomePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            storefrontService.getProducts().catch(() => null),
            storefrontService.getCategories().catch(() => null)
        ]).then(([productData, categoryData]) => {
            if (cancelled) return;
            if (!productData) {
                setError('Unable to load products right now. Please try again later.');
                setProducts([]);
            } else {
                setProducts(productData);
            }
            setCategories(categoryData || []);
        }).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, []);

    /* derived lists */
    const newArrivals = useMemo(() =>
        [...products].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8),
        [products]);

    const onSale = useMemo(() =>
        products.filter((p) => p.discounted),
        [products]);

    const bestSellers = useMemo(() =>
        products.filter((p) => {
            const stock = p.sizes?.reduce((s, sz) => s + (sz.stockQuantity || 0), 0) ?? 0;
            return stock > 0;
        }).slice(0, 4),
        [products]);

    /* category icons — fallback palette */
    const categoryIcons = ['👟', '👠', '🥾', '👞', '🩴', '🧲', '👢', '⚡'];

    return (
        <div className="home-page">
            {/* ===== HERO ===== */}
            <section className="hero">
                <div className="hero-content fade-in-up">
                    <span className="hero-badge">New Collection 2026</span>
                    <h1>Step into<br />your style</h1>
                    <p>Handpicked sneakers and footwear — curated for comfort, designed for the streets.</p>
                    <div className="hero-actions">
                        <Link to="/shop" className="store-button">Shop now</Link>
                        <Link to="/categories" className="store-button outline">Browse categories</Link>
                    </div>
                </div>
                <div className="hero-visual fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <div className="hero-shoe-display">👟</div>
                </div>
            </section>

            {/* ===== CATEGORIES ===== */}
            {categories.length > 0 && (
                <section className="home-section">
                    <SectionHeader title="Shop by Category" linkTo="/categories" linkLabel="All categories" />
                    <div className="category-strip">
                        {categories.slice(0, 6).map((cat, i) => (
                            <Link
                                key={cat.id}
                                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                                className="category-chip fade-in-up"
                                style={{ animationDelay: `${i * 0.06}s` }}
                            >
                                <span className="category-chip-icon">{categoryIcons[i % categoryIcons.length]}</span>
                                <span className="category-chip-name">{cat.name}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== NEW ARRIVALS ===== */}
            <section className="home-section">
                <SectionHeader title="New Arrivals" subtitle="The latest additions to our collection" linkTo="/shop?sort=newest" linkLabel="See all" />
                {loading ? (
                    <div className="storefront-grid">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    <div className="store-alert">{error}</div>
                ) : (
                    <div className="storefront-grid">
                        {newArrivals.map((product, i) => (
                            <div key={product.id} className="fade-in-up" style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
                                <StoreProductCard product={product} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ===== PROMO BANNER ===== */}
            <section className="promo-banner fade-in-up">
                <div className="promo-content">
                    <h2>Free Shipping on Orders Over ₺500</h2>
                    <p>Plus easy returns within 14 days — no questions asked.</p>
                    <Link to="/shop" className="store-button">Start shopping</Link>
                </div>
            </section>

            {/* ===== ON SALE ===== */}
            {onSale.length > 0 && (
                <section className="home-section">
                    <SectionHeader title="On Sale" subtitle="Don't miss these deals" linkTo="/shop?sale=true" linkLabel="All deals" />
                    <div className="storefront-grid">
                        {onSale.slice(0, 4).map((product, i) => (
                            <div key={product.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                                <StoreProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== FEATURES ===== */}
            <section className="features-strip">
                <div className="feature-item fade-in-up">
                    <span className="feature-icon">🚚</span>
                    <h4>Free Shipping</h4>
                    <p>On orders over ₺500</p>
                </div>
                <div className="feature-item fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <span className="feature-icon">🔄</span>
                    <h4>Easy Returns</h4>
                    <p>14-day return policy</p>
                </div>
                <div className="feature-item fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <span className="feature-icon">🔒</span>
                    <h4>Secure Payment</h4>
                    <p>Powered by Stripe</p>
                </div>
                <div className="feature-item fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <span className="feature-icon">💬</span>
                    <h4>Support</h4>
                    <p>We're here to help</p>
                </div>
            </section>
        </div>
    );
}
