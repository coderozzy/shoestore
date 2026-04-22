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
    { value: 'newest', label: 'Featured' },
    { value: 'price-asc', label: 'Price: low → high' },
    { value: 'price-desc', label: 'Price: high → low' },
    { value: 'name-asc', label: 'Name: A to Z' }
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

/**
 * Shop listing page, Steps design: editorial header with the active
 * category as the page title + style count, pill-shaped category chips
 * (All, then each category), search + sort on the right. Falls through
 * to a 1/2/3/4 column grid controlled by the --cols CSS variable.
 */
export default function ShopPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        setSelectedCategory(searchParams.get('category') || 'ALL');
        setSelectedGender(searchParams.get('gender') || 'ALL');
        setSortBy(searchParams.get('sort') || 'newest');
        setSaleOnly(searchParams.get('sale') === 'true');
        setQuery(searchParams.get('q') || '');
    }, [searchParams]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const list = products.filter((p) => {
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
        if (value === defaultVal || value === '' || value == null) next.delete(key);
        else next.set(key, value);
        setSearchParams(next, { replace: true });
    };

    const handleCategoryChange = (v) => { setSelectedCategory(v); updateParam('category', v, 'ALL'); };
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

    const pageTitle = selectedCategory !== 'ALL' ? selectedCategory : 'All shoes';

    return (
        <div className="shop-page">
            <div className="page-header fade-in-up">
                <h1>{pageTitle}</h1>
                <p>
                    {loading
                        ? 'Loading…'
                        : `${filtered.length} ${filtered.length === 1 ? 'style' : 'styles'}`}
                </p>
            </div>

            <div className="shop-toolbar fade-in-up" style={{ animationDelay: '0.05s' }}>
                <div className="shop-filters">
                    <button
                        type="button"
                        className={`filter-chip${selectedCategory === 'ALL' && !saleOnly ? ' active' : ''}`}
                        onClick={() => handleCategoryChange('ALL')}
                    >
                        All
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            className={`filter-chip${selectedCategory === c.name ? ' active' : ''}`}
                            onClick={() => handleCategoryChange(c.name)}
                        >
                            {c.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={`filter-chip${saleOnly ? ' active' : ''}`}
                        onClick={handleSaleToggle}
                    >
                        On sale
                    </button>
                    {activeFilterCount > 0 && (
                        <button type="button" className="filter-clear" onClick={clearFilters}>
                            Clear all
                        </button>
                    )}
                </div>
                <div className="shop-right" style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    <input
                        type="search"
                        className="store-input"
                        placeholder="Search…"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ width: 180 }}
                    />
                    <select
                        className="store-select sort-select"
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="storefront-grid">
                    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="store-empty">
                    No styles match your filters.
                    {activeFilterCount > 0 && (
                        <div>
                            <button
                                className="store-button outline"
                                onClick={clearFilters}
                                style={{ marginTop: '1rem' }}
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="storefront-grid">
                    {filtered.map((product, i) => (
                        <div
                            key={product.id}
                            className="fade-in-up"
                            style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
                        >
                            <StoreProductCard product={product} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
