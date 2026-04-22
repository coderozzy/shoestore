import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

/**
 * Bottom tab bar — replaces the legacy top navbar to match the Steps Staff
 * PWA design. Shows three primary actions (Scanner, Products, New QR) plus
 * a small sign-out button. Logout is intentionally tucked away rather than
 * occupying tab real-estate; it's a once-a-shift action.
 */
const ICONS = {
    scan: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="5" height="5" rx="1" />
            <rect x="16" y="3" width="5" height="5" rx="1" />
            <rect x="3" y="16" width="5" height="5" rx="1" />
            <rect x="16" y="16" width="5" height="5" rx="1" />
            <line x1="12" y1="3" x2="12" y2="6" />
            <line x1="12" y1="9" x2="12" y2="12" />
            <line x1="12" y1="15" x2="12" y2="18" />
            <line x1="3" y1="12" x2="6" y2="12" />
            <line x1="9" y1="12" x2="12" y2="12" />
            <line x1="15" y1="12" x2="18" y2="12" />
        </svg>
    ),
    list: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    ),
    qr: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M17 20h3M20 20v1" />
        </svg>
    ),
    out: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const tabs = [
        { id: 'scanner',  label: 'Scanner',  to: '/',           icon: ICONS.scan },
        { id: 'products', label: 'Products', to: '/products',   icon: ICONS.list },
        { id: 'qr',       label: 'New QR',   to: '/generate-qr', icon: ICONS.qr },
    ];

    return (
        <>
            <button className="signout-btn" onClick={handleLogout} title={`Sign out (${user?.username || ''})`}>
                {ICONS.out}
            </button>
            <nav className="tab-bar" aria-label="Primary">
                {tabs.map((t) => (
                    <Link
                        key={t.id}
                        to={t.to}
                        className={`tab-bar-item${isActive(t.to) ? ' active' : ''}`}
                        aria-current={isActive(t.to) ? 'page' : undefined}
                    >
                        <span className="tab-bar-icon" aria-hidden>{t.icon}</span>
                        <span className="tab-bar-label">{t.label}</span>
                    </Link>
                ))}
            </nav>
        </>
    );
}
