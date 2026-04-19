import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'name-asc', label: 'Name: A to Z' },
];

function sortProducts(list, sortKey) {
    const copy = [...list];
    switch (sortKey) {
        case 'price-asc':
            return copy.sort((a, b) => (a.effectivePrice || 0) - (b.effectivePrice || 0));
        case 'price-desc':
            return copy.sort((a, b) => (b.effectivePrice || 0) - (a.effectivePrice || 0));
        case 'name-asc':
            return copy.sort((a, b) => (a.modelName || '').localeCompare(b.modelName || ''));
        case 'newest':
        default:
            return copy.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
}

export default function ShopPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    /* Read URL params */
    const urlCategory = searchParams.get('category') || 'ALL';
    const urlGender = searchParams.get('gender') || 'ALL';
    const urlSort = searchParams.get('sort') || 'newest';
    const urlSale = searchParams.get('sale') === 'true';
    const urlQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(urlQuery);
    const [selectedCategory, setSelectedCategory] = useState(urlCategory);
    const [selectedGender, setSelectedGender] = useState(urlGender);
    const [sortBy, setSortBy] = useState(urlSort);
    const [saleOnly, setSaleOnly] = useState(urlSale);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            storefrontService.getProducts().catch(() => []),
            storefrontService.getCategories().catch(() => [])
        ]).then(([prodData, catData]) => {
            if (cancelled) return;
            setProducts(prodData || []);
            setCategories(catData || []);
        }).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, []);

    /* Sync URL params when they change externally (e.g. from category page link) */
    useEffect(() => {
        setSelectedCategory(searchParams.get('category') || 'ALL');
        setSelectedGender(searchParams.get('gender') || 'ALL');
        setSortBy(searchParams.get('sort') || 'newest');
        setSaleOnly(searchParams.get('sale') === 'true');
        setQuery(searchParams.get('q') || '');
    }, [searchParams]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        let list = products.filter((p) => {
            if (selectedCategory !== 'ALL' && p.categoryName !== selectedCategory) return false;
            if (selectedGender !== 'ALL' && p.gender !== selectedGender) return false;
            if (saleOnly && !p.discounted) return false;
            if (needle) {
                return (p.modelName || '').toLowerCase().includes(needle)
                    || (p.color || '').toLowerCase().includes(needle);
            }
            return true;
        });
        return sortProducts(list, sortBy);
    }, [products, selectedCategory, selectedGender, sortBy, saleOnly, query]);

    const updateParam = (key, value, defaultVal) => {
        const next = new URLSearchParams(searchParams);
        if (value === defaultVal) next.delete(key);
        else next.set(key, value);
        setSearchParams(next, { replace: true });
    };

    const handleCategoryChange = (v) => { setSelectedCategory(v); updateParam('category', v, 'ALL'); };
    const handleGenderChange = (v) => { setSelectedGender(v); updateParam('gender', v, 'ALL'); };
    const handleSortChange = (v) => { setSortBy(v); updateParam('sort', v, 'newest'); };
    const handleSaleToggle = () => {
        const next = !saleOnly;
        setSaleOnly(next);
        updateParam('sale', next ? 'true' : 'false', 'false');
    };
    const handleSearch = (v) => { setQuery(v); updateParam('q', v, ''); };

    const activeFilterCount =
        (selectedCategory !== 'ALL' ? 1 : 0)
        + (selectedGender !== 'ALL' ? 1 : 0)
        + (saleOnly ? 1 : 0)
        + (query.trim() ? 1 : 0);

    const clearFilters = () => {
        setSelectedCategory('ALL');
        setSelectedGender('ALL');
        setSortBy('newest');
        setSaleOnly(false);
        setQuery('');
        setSearchParams({}, { replace: true });
    };

    return (
        <div className="shop-page">
            <div className="page-header fade-in-up">
                <h1>Shop All</h1>
                <p>{loading ? 'Loading...' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}</p>
            </div>

            {/* Filters bar */}
            <div className="shop-toolbar fade-in-up" style={{ animationDelay: '0.05s' }}>
                <div className="shop-filters">
                    <input
                        type="search"
                        className="store-input"
                        placeholder="Search products…"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ maxWidth: 240 }}
                    />
                    <select className="store-select" value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
                        <option value="ALL">All categories</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                    <select className="store-select" value={selectedGender} onChange={(e) => handleGenderChange(e.target.value)}>
                        <option value="ALL">All genders</option>
                        <option value="MALE">Men</option>
                        <option value="FEMALE">Women</option>
                    </select>
                    <button
                        type="button"
                        className={`filter-chip ${saleOnly ? 'active' : ''}`}
                        onClick={handleSaleToggle}
                    >
                        🏷️ On sale
                    </button>
                    {activeFilterCount > 0 && (
                        <button type="button" className="filter-clear" onClick={clearFilters}>
                            Clear all
                        </button>
                    )}
                </div>
                <select className="store-select sort-select" value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
                    {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Products */}
            {loading ? (
                <div className="storefront-grid">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="store-empty">
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                    <p>No products match your filters.</p>
                    {activeFilterCount > 0 && (
                        <button className="store-button outline" onClick={clearFilters} style={{ marginTop: '0.75rem' }}>
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="storefront-grid">
                    {filtered.map((product, i) => (
                        <div key={product.id} className="fade-in-up" style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
                            <StoreProductCard product={product} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
