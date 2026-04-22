import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import storefrontService from '../services/storefrontService.js';
import StoreProductCard from '../components/StoreProductCard.jsx';
import LeatherSwatch from '../components/LeatherSwatch.jsx';

// Same icon + gradient pools the dedicated /categories page uses, kept in
// sync so the home page rail and the standalone categories page feel like
// two views of the same component.
const HOME_CATEGORY_ICONS = ['👟', '👠', '🥾', '👞', '🩴', '👡', '👢', '⚡'];
const HOME_CATEGORY_COLORS = [
    'linear-gradient(135deg, #7a4c2c 0%, #5e3820 100%)',
    'linear-gradient(135deg, #b58656 0%, #7a4c2c 100%)',
    'linear-gradient(135deg, #3d2c1e 0%, #1c1510 100%)',
    'linear-gradient(135deg, #a05a2c 0%, #6a3a1c 100%)',
    'linear-gradient(135deg, #c8a97a 0%, #8c6a3f 100%)',
    'linear-gradient(135deg, #6a5b4e 0%, #3d2c1e 100%)',
    'linear-gradient(135deg, #d8a86b 0%, #7a4c2c 100%)',
    'linear-gradient(135deg, #9c6b3f 0%, #5e3820 100%)',
];

function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-text" style={{ width: '75%' }} />
            <div className="skeleton-text short" />
        </div>
    );
}

function SectionHeader({ title, subtitle, linkTo, linkLabel }) {
    return (
        <div className="section-heading">
            <div>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {linkTo && (
                <Link to={linkTo} className="section-link">{linkLabel || 'View all'} →</Link>
            )}
        </div>
    );
}

/**
 * One card on the home "Browse by style" grid. Replaces the static gradient
 * background with an auto-rotating mini-carousel of real product photos
 * from the same category. Falls back to the gradient when the category has
 * no products with images yet (or only one product, in which case the
 * single image is shown statically without a timer).
 *
 * No prev/next chrome on purpose — the cards are entry points, not
 * galleries. A subtle 600ms cross-fade every ~2.5s keeps the home page
 * visually alive without distracting from the headline grid above.
 */
function CategoryCarouselCard({ category, products, fallbackGradient, icon, animationDelay }) {
    const slides = useMemo(() => (
        products
            .map((p) => p.imageDataUrls?.[0] || p.imageDataUrl)
            .filter(Boolean)
            .slice(0, 6)
    ), [products]);

    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (slides.length < 2) return undefined;
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % slides.length);
        }, 2500);
        return () => clearInterval(id);
    }, [slides.length]);

    return (
        <Link
            to={`/shop?category=${encodeURIComponent(category.name)}`}
            className="category-card category-card-carousel fade-in-up"
            style={{ animationDelay }}
        >
            {slides.length === 0 ? (
                <div className="category-card-bg" style={{ background: fallbackGradient }} />
            ) : (
                slides.map((image, i) => (
                    <div
                        key={image}
                        className={`cat-slide${i === index ? ' active' : ''}`}
                        style={{ backgroundImage: `url(${image})` }}
                    />
                ))
            )}
            <div className="category-card-content">
                <span className="category-card-icon">{icon}</span>
                <h3>{category.name}</h3>
                <span className="category-card-count">
                    {products.length} {products.length === 1 ? 'style' : 'styles'}
                </span>
            </div>
        </Link>
    );
}

/**
 * Home page — Steps editorial layout:
 *   • Hero with eyebrow / serif title / body / dual CTAs and leather
 *     swatch visual to the right
 *   • "Browse by style" horizontal category chip strip
 *   • "Featured" 4-up product grid
 *   • Four-item value proposition strip (full-grain, Goodyear, shipping,
 *     returns) rendered as a full-bleed band
 */
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

    const featured = useMemo(
        () => products
            .filter((p) => (p.sizes?.reduce((s, sz) => s + (sz.stockQuantity || 0), 0) ?? 0) > 0)
            .slice(0, 8),
        [products]
    );

    const onSale = useMemo(
        () => products.filter((p) => p.discounted).slice(0, 4),
        [products]
    );

    // For the hero visual we pick the first in-stock product so the
    // leather swatch hue matches something from the actual catalogue.
    const heroHint = products.find((p) => p.color) || {};

    // Pull every product that already has at least one uploaded image and
    // line them up for the hero carousel. Products store images under
    // `imageDataUrls` (the new gallery), with `imageDataUrl` retained as a
    // legacy single-image fallback — checking both keeps the carousel
    // populated regardless of which path the admin used.
    const carouselSlides = useMemo(() => {
        return products
            .map((p) => {
                const image = p.imageDataUrls?.[0] || p.imageDataUrl;
                return image
                    ? { id: p.id, image, name: p.modelName }
                    : null;
            })
            .filter(Boolean)
            .slice(0, 6);
    }, [products]);

    const [carouselIndex, setCarouselIndex] = useState(0);
    const [carouselPaused, setCarouselPaused] = useState(false);

    const advanceSlide = (delta) => {
        setCarouselIndex((i) => {
            if (carouselSlides.length === 0) return 0;
            const next = (i + delta + carouselSlides.length) % carouselSlides.length;
            return next;
        });
    };

    useEffect(() => {
        if (carouselSlides.length < 2 || carouselPaused) return undefined;
        const id = setInterval(() => advanceSlide(1), 2800);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carouselSlides.length, carouselPaused]);

    // If the catalogue shrinks (e.g. an image is removed) clamp the index
    // so we never render an undefined slide.
    useEffect(() => {
        if (carouselSlides.length === 0) return;
        if (carouselIndex >= carouselSlides.length) {
            setCarouselIndex(0);
        }
    }, [carouselSlides.length, carouselIndex]);

    return (
        <div className="home-page">
            {/* ===== HERO ===== */}
            <section className="hero">
                <div className="hero-content fade-in-up">
                    <p className="hero-eyebrow">Handcrafted since 2008</p>
                    <h1>Shoes built to last</h1>
                    <p>
                        A leather-led collection of everyday footwear — Goodyear welted
                        where it counts, fairly priced, and made to be worn every day.
                    </p>
                    <div className="hero-actions">
                        <Link to="/shop" className="store-button">Shop all styles</Link>
                    </div>
                </div>
                <div
                    className="hero-visual hero-carousel fade-in-up"
                    style={{ animationDelay: '0.15s' }}
                    onMouseEnter={() => setCarouselPaused(true)}
                    onMouseLeave={() => setCarouselPaused(false)}
                >
                    {carouselSlides.length > 0 ? (
                        <>
                            {carouselSlides.map((slide, i) => (
                                <Link
                                    key={slide.id}
                                    to={`/product/${slide.id}`}
                                    className={`hero-slide${i === carouselIndex ? ' active' : ''}`}
                                    aria-label={slide.name}
                                    aria-hidden={i !== carouselIndex}
                                    tabIndex={i === carouselIndex ? 0 : -1}
                                >
                                    <img src={slide.image} alt={slide.name || 'Steps shoes'} />
                                </Link>
                            ))}
                            {carouselSlides.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        className="hero-nav prev"
                                        onClick={() => advanceSlide(-1)}
                                        aria-label="Previous slide"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        className="hero-nav next"
                                        onClick={() => advanceSlide(1)}
                                        aria-label="Next slide"
                                    >
                                        ›
                                    </button>
                                    <div className="hero-caption">
                                        {carouselSlides[carouselIndex]?.name}
                                    </div>
                                    <div className="hero-dots" aria-hidden>
                                        {carouselSlides.map((slide, i) => (
                                            <button
                                                key={slide.id}
                                                type="button"
                                                className={`hero-dot${i === carouselIndex ? ' active' : ''}`}
                                                onClick={() => setCarouselIndex(i)}
                                                aria-label={`Show slide ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <LeatherSwatch color={heroHint.color || 'Cognac'} id="hero" />
                    )}
                </div>
            </section>

            {/* ===== CATEGORIES ===== */}
            {categories.length > 0 && (
                <section className="home-section">
                    <SectionHeader
                        title="Browse by style"
                        subtitle="Pick a silhouette and shop the full collection."
                    />
                    <div className="categories-grid home-categories-grid">
                        {categories.slice(0, 8).map((cat, i) => {
                            const productsInCat = products.filter((p) => p.categoryName === cat.name);
                            return (
                                <CategoryCarouselCard
                                    key={cat.id}
                                    category={cat}
                                    products={productsInCat}
                                    fallbackGradient={HOME_CATEGORY_COLORS[i % HOME_CATEGORY_COLORS.length]}
                                    icon={HOME_CATEGORY_ICONS[i % HOME_CATEGORY_ICONS.length]}
                                    animationDelay={`${i * 0.06}s`}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ===== FEATURED ===== */}
            <section className="home-section" style={{ paddingTop: 0 }}>
                <SectionHeader title="Featured" linkTo="/shop" linkLabel="View all" />
                {loading ? (
                    <div className="storefront-grid">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    <div className="store-alert">{error}</div>
                ) : featured.length === 0 ? (
                    <div className="store-empty">No products to show yet.</div>
                ) : (
                    <div className="storefront-grid">
                        {featured.map((product, i) => (
                            <div
                                key={product.id}
                                className="fade-in-up"
                                style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                            >
                                <StoreProductCard product={product} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ===== VALUE STRIP ===== */}
            <section className="features-strip">
                <div className="feature-item">
                    <h4>Full-grain leather</h4>
                    <p>Only the top layer — the most durable part of the hide.</p>
                </div>
                <div className="feature-item">
                    <h4>Goodyear welt</h4>
                    <p>Resolable, waterproof, built to outlast fashion cycles.</p>
                </div>
                <div className="feature-item">
                    <h4>Free shipping</h4>
                    <p>On all orders over ₺500 within Turkey.</p>
                </div>
                <div className="feature-item">
                    <h4>14-day returns</h4>
                    <p>Unworn, in original box — no questions asked.</p>
                </div>
            </section>

            {/* ===== ON SALE ===== */}
            {onSale.length > 0 && (
                <section className="home-section">
                    <SectionHeader
                        title="On sale"
                        subtitle="Limited runs and end-of-season pieces."
                        linkTo="/shop?sale=true"
                        linkLabel="All deals"
                    />
                    <div className="storefront-grid">
                        {onSale.map((product, i) => (
                            <div
                                key={product.id}
                                className="fade-in-up"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <StoreProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
