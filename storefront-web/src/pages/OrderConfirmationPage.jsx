import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import storefrontService, { getStoredOrderToken } from '../services/storefrontService.js';

const formatPrice = (v) => `₺${(Number(v) || 0).toFixed(2)}`;

const BADGE_COPY = {
    PENDING: { label: 'Waiting for payment', tone: 'warn' },
    PAID: { label: 'Payment received — thank you!', tone: 'ok' },
    FULFILLED: { label: 'Shipped', tone: 'ok' },
    CANCELLED: { label: 'Cancelled', tone: 'bad' }
};

export default function OrderConfirmationPage() {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    useEffect(() => {
        let cancelled = false;
        let timeout;
        const token = searchParams.get('token') || getStoredOrderToken(orderId);
        if (!token) {
            setError('This order link is missing its lookup token.');
            return undefined;
        }

        const load = () => {
            storefrontService.getOrder(orderId, token)
                .then((data) => {
                    if (cancelled) return;
                    setOrder(data);
                    if (data.status === 'PENDING' && attempts < 5) {
                        timeout = setTimeout(() => setAttempts((a) => a + 1), 1500);
                    }
                })
                .catch(() => !cancelled && setError('We could not find that order.'));
        };
        load();
        return () => {
            cancelled = true;
            if (timeout) clearTimeout(timeout);
        };
    }, [orderId, attempts, searchParams]);

    if (error) {
        return (
            <div className="store-alert">
                {error} <Link to="/">Back to catalog</Link>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="order-confirmation" style={{ alignItems: 'center', paddingTop: '3rem' }}>
                <div className="skeleton-text" style={{ width: 200, height: 24, margin: 0 }} />
                <div className="skeleton-text" style={{ width: 320, margin: 0 }} />
            </div>
        );
    }

    const badge = BADGE_COPY[order.status] || BADGE_COPY.PENDING;

    return (
        <div className="order-confirmation">
            <div className={`confirmation-hero tone-${badge.tone}`}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>
                    {badge.tone === 'ok' ? '🎉' : badge.tone === 'warn' ? '⏳' : '⚠️'}
                </span>
                <h1>Order #{order.id}</h1>
                <p>{badge.label}</p>
            </div>

            <section className="confirmation-section">
                <h2>Items</h2>
                <ul className="confirmation-items">
                    {order.items.map((item) => (
                        <li key={item.id}>
                            <div>
                                <strong>{item.productName}</strong>
                                <div className="muted">
                                    {item.color} &middot; Size {item.size} &middot; qty {item.quantity}
                                </div>
                            </div>
                            <span style={{ fontWeight: 700 }}>{formatPrice(item.totalPrice)}</span>
                        </li>
                    ))}
                </ul>
                <div className="confirmation-total">
                    <span>Total paid</span>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                </div>
            </section>

            <p className="muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                We emailed the shipping confirmation to the address you provided at checkout.
            </p>

            <Link to="/" className="store-button outline" style={{ alignSelf: 'center' }}>
                Continue shopping
            </Link>
        </div>
    );
}
