import { useState } from 'react';
import { Link } from 'react-router-dom';
import storefrontService, { getStoredOrderToken } from '../services/storefrontService.js';

const formatPrice = (v) => `₺${(Number(v) || 0).toFixed(2)}`;

const STATUS_INFO = {
    PENDING: { icon: '⏳', label: 'Awaiting Payment', color: '#e8590c', step: 1 },
    PAID: { icon: '✅', label: 'Payment Received', color: '#2f9e44', step: 2 },
    FULFILLED: { icon: '📦', label: 'Shipped', color: '#228be6', step: 3 },
    CANCELLED: { icon: '❌', label: 'Cancelled', color: '#e03131', step: 0 }
};

export default function TrackOrderPage() {
    const [orderId, setOrderId] = useState('');
    const [token, setToken] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const id = orderId.trim().replace('#', '');
        if (!id) return;
        const lookupToken = token.trim() || getStoredOrderToken(id);
        if (!lookupToken) {
            setError('Order tracking requires the secure link we emailed you. Please open it from your inbox.');
            return;
        }
        setLoading(true);
        setError('');
        setOrder(null);
        try {
            const data = await storefrontService.getOrder(id, lookupToken);
            setOrder(data);
        } catch (err) {
            setError(err.response?.status === 400
                ? 'That order number or token is not valid.'
                : 'Unable to look up this order right now.');
        } finally {
            setLoading(false);
        }
    };

    const status = order ? (STATUS_INFO[order.status] || STATUS_INFO.PENDING) : null;
    const steps = ['Order Placed', 'Payment', 'Shipped'];

    return (
        <div className="track-page">
            <div className="page-header fade-in-up">
                <h1>Track Your Order</h1>
                <p>Open the confirmation link we emailed you, or paste your order number and token below.</p>
            </div>

            <form onSubmit={handleSubmit} className="track-form fade-in-up" style={{ animationDelay: '0.05s' }}>
                <input
                    className="store-input"
                    placeholder="Order number"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                    style={{ flex: 1, maxWidth: 200 }}
                />
                <input
                    className="store-input"
                    placeholder="Tracking token (from your email)"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    style={{ flex: 2, maxWidth: 400 }}
                />
                <button type="submit" className="store-button" disabled={loading}>
                    {loading ? 'Searching…' : 'Track order'}
                </button>
            </form>

            {error && <div className="store-alert fade-in-up">{error}</div>}

            {order && (
                <div className="track-result fade-in-up">
                    <div className="track-status-card" style={{ borderColor: status.color }}>
                        <span style={{ fontSize: '2rem' }}>{status.icon}</span>
                        <div>
                            <h2>Order #{order.id}</h2>
                            <span className="track-status-label" style={{ color: status.color }}>
                                {status.label}
                            </span>
                        </div>
                    </div>

                    {order.status !== 'CANCELLED' && (
                        <div className="track-steps">
                            {steps.map((label, i) => {
                                const stepNum = i + 1;
                                const active = stepNum <= status.step;
                                return (
                                    <div key={label} className={`track-step ${active ? 'active' : ''}`}>
                                        <div className="track-step-dot">{active ? '✓' : stepNum}</div>
                                        <span>{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="track-details">
                        <div className="track-detail-section">
                            <h3>Items</h3>
                            <ul className="confirmation-items">
                                {order.items?.map((item) => (
                                    <li key={item.id}>
                                        <div>
                                            <strong>{item.productName}</strong>
                                            <div className="muted">{item.color} &middot; Size {item.size} &middot; qty {item.quantity}</div>
                                        </div>
                                        <span style={{ fontWeight: 700 }}>{formatPrice(item.totalPrice)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="confirmation-total">
                                <span>Total</span>
                                <strong>{formatPrice(order.totalAmount)}</strong>
                            </div>
                        </div>
                    </div>

                    <Link to="/" className="store-button outline" style={{ alignSelf: 'center', marginTop: '0.5rem' }}>
                        Continue shopping
                    </Link>
                </div>
            )}
        </div>
    );
}
