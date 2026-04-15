import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import storefrontService from '../services/storefrontService.js';

const formatPrice = (v) => `₺${(Number(v) || 0).toFixed(2)}`;

const BADGE_COPY = {
    PENDING: { label: 'Waiting for payment', tone: 'warn' },
    PAID: { label: 'Payment received', tone: 'ok' },
    FULFILLED: { label: 'Shipped', tone: 'ok' },
    CANCELLED: { label: 'Cancelled', tone: 'bad' }
};

export default function OrderConfirmationPage() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    // Poll briefly while the order is still PENDING so the Stripe webhook /
    // confirm call has a chance to arrive.
    useEffect(() => {
        let cancelled = false;
        let timeout;
        const load = () => {
            storefrontService.getOrder(orderId)
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
    }, [orderId, attempts]);

    if (error) {
        return (
            <div className="store-alert">
                {error} <Link to="/">Back to catalog</Link>
            </div>
        );
    }
    if (!order) return <p className="store-loading">Loading your order…</p>;

    const badge = BADGE_COPY[order.status] || BADGE_COPY.PENDING;

    return (
        <div className="order-confirmation">
            <div className={`confirmation-hero tone-${badge.tone}`}>
                <h1>Order #{order.id}</h1>
                <p>{order.status === 'PAID' ? 'Thank you for your order — ' : ''}{badge.label}.</p>
            </div>

            <section className="confirmation-section">
                <h2>Items</h2>
                <ul className="confirmation-items">
                    {order.items.map((item) => (
                        <li key={item.id}>
                            <div>
                                <strong>{item.productName}</strong>
                                <div className="muted">{item.color} · Size {item.size} · qty {item.quantity}</div>
                            </div>
                            <span>{formatPrice(item.totalPrice)}</span>
                        </li>
                    ))}
                </ul>
                <div className="confirmation-total">
                    <span>Total paid</span>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                </div>
            </section>

            <section className="confirmation-section">
                <h2>Shipping to</h2>
                <p>{order.customerName}</p>
                <p>{order.shippingLine1}{order.shippingLine2 ? `, ${order.shippingLine2}` : ''}</p>
                <p>{order.shippingPostalCode} {order.shippingCity} · {order.shippingCountry}</p>
                <p className="muted">{order.customerEmail} · {order.customerPhone}</p>
            </section>

            <Link to="/" className="store-button outline">Continue shopping</Link>
        </div>
    );
}
