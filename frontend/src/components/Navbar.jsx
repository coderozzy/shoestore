import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">
                    <span className="brand-icon">👟</span>
                    <span className="brand-text">ShoeStore</span>
                </Link>
            </div>

            <div className="navbar-menu">
                <Link
                    to="/"
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                >
                    <span className="nav-icon">📷</span>
                    <span>Scan (Продать / Добавить на склад)</span>
                </Link>

                <Link
                    to="/generate-qr"
                    className={`nav-link ${isActive('/generate-qr') ? 'active' : ''}`}
                >
                    <span className="nav-icon">🏷️</span>
                    <span>QR Oluştur</span>
                </Link>

                <Link
                    to="/products"
                    className={`nav-link ${isActive('/products') ? 'active' : ''}`}
                >
                    <span className="nav-icon">📦</span>
                    <span>Products</span>
                </Link>

                {isAdmin() && (
                    <Link
                        to="/admin"
                        className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">⚙️</span>
                        <span>Admin</span>
                    </Link>
                )}
            </div>

            <div className="navbar-user">
                <span className="user-info">
                    <span className="user-role">{user?.role}</span>
                    <span className="user-name">{user?.username}</span>
                </span>
                <button onClick={handleLogout} className="btn-logout">
                    Logout
                </button>
            </div>
        </nav>
    );
}
