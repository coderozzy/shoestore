import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Layout() {
    const { totalItemCount } = useCart();

    return (
        <div className="storefront-shell">
            <header className="storefront-topbar">
                <Link to="/" className="brand">
                    <span className="brand-mark">👟</span>
                    <span className="brand-name">ShoeStore</span>
                </Link>

                <nav className="storefront-nav">
                    <NavLink to="/" end>Home</NavLink>
                    <NavLink to="/cart" className="cart-link">
                        🛒 Cart{totalItemCount > 0 && <span className="cart-badge">{totalItemCount}</span>}
                    </NavLink>
                </nav>
            </header>

            <main className="storefront-main">
                <Outlet />
            </main>

            <footer className="storefront-footer">
                <span>© {new Date().getFullYear()} ShoeStore — secure payments by Stripe</span>
            </footer>
        </div>
    );
}
