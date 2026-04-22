import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

/**
 * Shared chrome for the Steps storefront:
 * announcement bar, sticky top-bar with wordmark + cart icon, and the
 * footer. Navigation items mirror the Steps design (Shop + three category
 * shortcuts); legacy "Categories"/"Contact" routes are still
 * accessible from the mobile drawer + footer.
 */
export default function Layout() {
    const { totalItemCount } = useCart();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handle = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handle, { passive: true });
        return () => window.removeEventListener('scroll', handle);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname]);

    return (
        <div className="storefront-shell">
            {/* Announcement bar — thin, uppercase, dark */}
            <div className="announcement-bar">
                Free shipping on orders over ₺500
                <Link to="/shop">Shop now</Link>
            </div>

            {/* Top bar */}
            <header className={`storefront-topbar${scrolled ? ' scrolled' : ''}`}>
                <div className="storefront-topbar-inner">
                    <Link to="/" className="brand" aria-label="Steps home">
                        Steps
                    </Link>

                    <nav className="storefront-nav desktop-nav">
                        <NavLink to="/shop" end={false}>Shop</NavLink>
                        <NavLink to="/shop?category=Sneakers">Sneakers</NavLink>
                        <NavLink to="/shop?category=Boots">Boots</NavLink>
                        <NavLink to="/shop?category=Oxfords">Oxfords</NavLink>
                        <NavLink to="/shop?category=Loafers">Loafers</NavLink>
                        <NavLink to="/shop?category=Sandals">Sandals</NavLink>
                        <NavLink to="/shop?category=Heels">Heels</NavLink>
                        <NavLink to="/shop?category=Flats">Flats</NavLink>
                        <NavLink to="/shop?category=Trainers">Trainers</NavLink>
                        <NavLink to="/track">Track order</NavLink>
                    </nav>

                    <div className="nav-right">
                        <NavLink to="/track" className="nav-icon-link" title="Track order" aria-label="Track order">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="16" rx="2" />
                                <path d="M8 2v4" />
                                <path d="M16 2v4" />
                                <path d="M3 10h18" />
                            </svg>
                        </NavLink>
                        <NavLink to="/cart" className="cart-link" title="Cart" aria-label="Cart">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                            {totalItemCount > 0 && <span className="cart-badge">{totalItemCount}</span>}
                        </NavLink>

                        <button
                            className={`hamburger${menuOpen ? ' open' : ''}`}
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label="Toggle menu"
                            aria-expanded={menuOpen}
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile drawer */}
            {menuOpen && <div className="mobile-backdrop" onClick={() => setMenuOpen(false)} />}
            <nav className={`mobile-drawer${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
                <NavLink to="/" end>Home</NavLink>
                <NavLink to="/shop">Shop all</NavLink>
                <NavLink to="/shop?category=Sneakers">Sneakers</NavLink>
                <NavLink to="/shop?category=Boots">Boots</NavLink>
                <NavLink to="/shop?category=Oxfords">Oxfords</NavLink>
                <NavLink to="/shop?category=Loafers">Loafers</NavLink>
                <NavLink to="/shop?category=Sandals">Sandals</NavLink>
                <NavLink to="/shop?category=Heels">Heels</NavLink>
                <NavLink to="/shop?category=Flats">Flats</NavLink>
                <NavLink to="/shop?category=Trainers">Trainers</NavLink>
                <NavLink to="/categories">All categories</NavLink>
                <NavLink to="/contact">Contact</NavLink>
                <NavLink to="/track">Track order</NavLink>
                <div className="mobile-drawer-divider" />
                <NavLink to="/cart" className="mobile-cart-link">
                    Cart{totalItemCount > 0 && <span className="cart-badge" style={{ position: 'static' }}>{totalItemCount}</span>}
                </NavLink>
            </nav>

            <main className="storefront-main">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="storefront-footer">
                <div className="footer-grid">
                    <div className="footer-col">
                        <Link to="/" className="brand footer-brand">Steps</Link>
                        <p className="footer-tagline">
                            Quality leather footwear at fair prices. Made to last a lifetime.
                        </p>
                    </div>
                    <div className="footer-col">
                        <h4>Shop</h4>
                        <Link to="/shop">All shoes</Link>
                        <Link to="/shop?category=Sneakers">Sneakers</Link>
                        <Link to="/shop?category=Boots">Boots</Link>
                        <Link to="/shop?category=Oxfords">Oxfords</Link>
                        <Link to="/shop?category=Loafers">Loafers</Link>
                        <Link to="/shop?category=Sandals">Sandals</Link>
                        <Link to="/shop?category=Heels">Heels</Link>
                        <Link to="/shop?category=Flats">Flats</Link>
                        <Link to="/shop?category=Trainers">Trainers</Link>
                        <Link to="/shop?sale=true">On sale</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Help</h4>
                        <Link to="/track">Track order</Link>
                        <Link to="/contact">Contact us</Link>
                        <Link to="/shop">Size guide</Link>
                    </div>
                    <div className="footer-col">
                        <h4>Secure payments</h4>
                        <p className="footer-note">
                            All transactions are encrypted and processed securely through Stripe.
                        </p>
                        <div className="payment-icons">
                            <span>Visa</span>
                            <span>Mastercard</span>
                            <span>Stripe</span>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    © {new Date().getFullYear()} Steps. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
