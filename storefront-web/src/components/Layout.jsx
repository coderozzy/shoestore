import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Layout() {
    const { totalItemCount } = useCart();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    /* scroll shadow */
    useEffect(() => {
        const handle = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handle, { passive: true });
        return () => window.removeEventListener('scroll', handle);
    }, []);

    /* close mobile menu on route change */
    useEffect(() => {
        setMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname]);

    return (
        <div className="storefront-shell">
            {/* Announcement bar */}
            <div className="announcement-bar">
                Free shipping on orders over ₺500 &mdash; <Link to="/shop">Shop now</Link>
            </div>

            {/* Header */}
            <header className={`storefront-topbar${scrolled ? ' scrolled' : ''}`}>
                <Link to="/" className="brand">
                    <span className="brand-mark">👟</span>
                    <span className="brand-name">ShoeStore</span>
                </Link>

                {/* Desktop nav */}
                <nav className="storefront-nav desktop-nav">
                    <NavLink to="/" end>Home</NavLink>
                    <NavLink to="/shop">Shop</NavLink>
                    <NavLink to="/categories">Categories</NavLink>
                    <NavLink to="/about">About</NavLink>
                    <NavLink to="/contact">Contact</NavLink>
                </nav>

                <div className="nav-right">
                    <NavLink to="/track" className="nav-icon-link" title="Track order">
                        📋
                    </NavLink>
                    <NavLink to="/cart" className="cart-link" title="Cart">
                        🛒
                        {totalItemCount > 0 && <span className="cart-badge">{totalItemCount}</span>}
                    </NavLink>

                    {/* Hamburger (mobile) */}
                    <button
                        className={`hamburger ${menuOpen ? 'open' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span /><span /><span />
                    </button>
                </div>
            </header>

            {/* Mobile drawer */}
            {menuOpen && <div className="mobile-backdrop" onClick={() => setMenuOpen(false)} />}
            <nav className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
                <NavLink to="/" end>Home</NavLink>
                <NavLink to="/shop">Shop All</NavLink>
                <NavLink to="/categories">Categories</NavLink>
                <NavLink to="/about">About Us</NavLink>
                <NavLink to="/contact">Contact</NavLink>
                <NavLink to="/track">Track Order</NavLink>
                <div className="mobile-drawer-divider" />
                <NavLink to="/cart" className="mobile-cart-link">
                    🛒 Cart {totalItemCount > 0 && <span className="cart-badge">{totalItemCount}</span>}
                </NavLink>
            </nav>

            <main className="storefront-main">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="storefront-footer">
                <div className="footer-grid">
                    <div className="footer-col">
                        <Link to="/" className="brand footer-brand">
                            <span className="brand-mark">👟</span>
                            <span className="brand-name">ShoeStore</span>
                        </Link>
                        <p className="footer-tagline">Handpicked sneakers &mdash; curated for comfort, designed for the streets.</p>
                    </div>
                    <div className="footer-col">
                        <h4>Shop</h4>
                        <Link to="/shop">All Products</Link>
                        <Link to="/categories">Categories</Link>
                        <Link to="/shop?sale=true">On Sale</Link>
                        <Link to="/shop?sort=newest">New Arrivals</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Help</h4>
                        <Link to="/track">Track Order</Link>
                        <Link to="/contact">Contact Us</Link>
                        <Link to="/about">About Us</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Secure Payments</h4>
                        <p className="footer-note">All transactions are encrypted and processed securely through Stripe.</p>
                        <div className="payment-icons">
                            <span title="Visa">💳</span>
                            <span title="Mastercard">💳</span>
                            <span title="Stripe">🔒</span>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>&copy; {new Date().getFullYear()} ShoeStore. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
