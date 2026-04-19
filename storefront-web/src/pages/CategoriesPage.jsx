import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import storefrontService from '../services/storefrontService.js';

const categoryIcons = ['👟', '👠', '🥾', '👞', '🩴', '🧲', '👢', '⚡'];
const categoryColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            storefrontService.getCategories().catch(() => []),
            storefrontService.getProducts().catch(() => [])
        ]).then(([catData, prodData]) => {
            if (cancelled) return;
            setCategories(catData || []);
            setProducts(prodData || []);
        }).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, []);

    const getCategoryCount = (catName) =>
        products.filter((p) => p.categoryName === catName).length;

    if (loading) {
        return (
            <div className="categories-page">
                <div className="page-header fade-in-up">
                    <h1>Categories</h1>
                    <p>Browse our collection by category</p>
                </div>
                <div className="categories-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="skeleton-card" style={{ minHeight: 180 }}>
                            <div className="skeleton-image" style={{ height: 180 }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="categories-page">
            <div className="page-header fade-in-up">
                <h1>Categories</h1>
                <p>Browse our collection by category</p>
            </div>

            {categories.length === 0 ? (
                <div className="store-empty">
                    <p>No categories available yet.</p>
                </div>
            ) : (
                <div className="categories-grid">
                    {categories.map((cat, i) => (
                        <Link
                            key={cat.id}
                            to={`/shop?category=${encodeURIComponent(cat.name)}`}
                            className="category-card fade-in-up"
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            <div className="category-card-bg" style={{ background: categoryColors[i % categoryColors.length] }} />
                            <div className="category-card-content">
                                <span className="category-card-icon">{categoryIcons[i % categoryIcons.length]}</span>
                                <h3>{cat.name}</h3>
                                <span className="category-card-count">{getCategoryCount(cat.name)} product{getCategoryCount(cat.name) !== 1 ? 's' : ''}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Gender sections */}
            <div className="gender-cards">
                <Link to="/shop?gender=MALE" className="gender-card fade-in-up">
                    <div className="gender-card-bg" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }} />
                    <div className="gender-card-content">
                        <h3>Men's Collection</h3>
                        <p>{products.filter((p) => p.gender === 'MALE').length} products</p>
                        <span className="gender-card-link">Shop now &rarr;</span>
                    </div>
                </Link>
                <Link to="/shop?gender=FEMALE" className="gender-card fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="gender-card-bg" style={{ background: 'linear-gradient(135deg, #831843, #be185d)' }} />
                    <div className="gender-card-content">
                        <h3>Women's Collection</h3>
                        <p>{products.filter((p) => p.gender === 'FEMALE').length} products</p>
                        <span className="gender-card-link">Shop now &rarr;</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
