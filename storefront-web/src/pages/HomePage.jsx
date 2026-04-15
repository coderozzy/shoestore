import { useEffect, useMemo, useState } from 'react';
import storefrontService from '../services/storefrontService.js';
import StoreProductCard from '../components/StoreProductCard.jsx';

export default function HomePage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedGender, setSelectedGender] = useState('ALL');
    const [query, setQuery] = useState('');
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

    const visibleProducts = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return products.filter((p) => {
            if (selectedCategory !== 'ALL' && p.categoryName !== selectedCategory) return false;
            if (selectedGender !== 'ALL' && p.gender !== selectedGender) return false;
            if (!needle) return true;
            return (p.modelName || '').toLowerCase().includes(needle)
                || (p.color || '').toLowerCase().includes(needle);
        });
    }, [products, selectedCategory, selectedGender, query]);

    return (
        <div className="home-page">
            <section className="home-hero">
                <h1>Step into your style</h1>
                <p>Handpicked sneakers — delivered to your door.</p>
            </section>

            <section className="home-filters">
                <input
                    type="search"
                    className="store-input"
                    placeholder="Search by model or color…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <select
                    className="store-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="ALL">All categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                </select>
                <select
                    className="store-select"
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                >
                    <option value="ALL">All</option>
                    <option value="MALE">Men</option>
                    <option value="FEMALE">Women</option>
                </select>
            </section>

            {loading ? (
                <p className="store-loading">Loading products…</p>
            ) : error ? (
                <div className="store-alert">{error}</div>
            ) : visibleProducts.length === 0 ? (
                <p className="store-empty">No products match your filters.</p>
            ) : (
                <div className="storefront-grid">
                    {visibleProducts.map((product) => (
                        <StoreProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
