import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '../context/CartContext.jsx';
import storefrontService from '../services/storefrontService.js';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

const formatPrice = (v) => `₺${(Number(v) || 0).toFixed(2)}`;

export default function CheckoutPage() {
    const { items, subtotal } = useCart();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        shippingLine1: '',
        shippingLine2: '',
        shippingCity: '',
        shippingPostalCode: '',
        shippingCountry: 'TR'
    });
    const [checkoutSession, setCheckoutSession] = useState(null); // { orderId, clientSecret, paymentIntentId }
    const [creatingIntent, setCreatingIntent] = useState(false);
    const [intentError, setIntentError] = useState('');

    useEffect(() => {
        if (items.length === 0 && !checkoutSession) {
            navigate('/cart', { replace: true });
        }
    }, [items.length, checkoutSession, navigate]);

    const canSubmit = useMemo(() => {
        return customer.customerName.trim()
            && customer.customerPhone.trim()
            && customer.customerEmail.trim()
            && customer.shippingLine1.trim()
            && customer.shippingCity.trim()
            && customer.shippingPostalCode.trim()
            && customer.shippingCountry.trim().length === 2
            && items.length > 0;
    }, [customer, items]);

    const handleField = (field) => (e) =>
        setCustomer((prev) => ({ ...prev, [field]: e.target.value }));

    const handleStartPayment = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setCreatingIntent(true);
        setIntentError('');
        try {
            const response = await storefrontService.createPaymentIntent({
                ...customer,
                shippingCountry: customer.shippingCountry.toUpperCase(),
                items: items.map((item) => ({
                    productId: item.productId,
                    size: item.size,
                    quantity: item.quantity
                }))
            });
            setCheckoutSession(response);
        } catch (err) {
            console.error('Payment intent failed', err);
            setIntentError(err.response?.data?.message
                || 'Unable to start the payment. Please try again.');
        } finally {
            setCreatingIntent(false);
        }
    };

    if (!STRIPE_PK) {
        return (
            <div className="store-alert">
                Payments are not configured. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code>
                {' '}in the storefront environment.
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <h1>Checkout</h1>

            <div className="checkout-layout">
                <form className="checkout-form" onSubmit={handleStartPayment}>
                    <h2>Contact</h2>
                    <div className="form-row">
                        <label>
                            Full name
                            <input value={customer.customerName} onChange={handleField('customerName')}
                                   required disabled={!!checkoutSession} />
                        </label>
                        <label>
                            Email
                            <input type="email" value={customer.customerEmail}
                                   onChange={handleField('customerEmail')}
                                   required disabled={!!checkoutSession} />
                        </label>
                    </div>
                    <label>
                        Phone
                        <input value={customer.customerPhone} onChange={handleField('customerPhone')}
                               required disabled={!!checkoutSession} />
                    </label>

                    <h2>Shipping</h2>
                    <label>
                        Address line 1
                        <input value={customer.shippingLine1} onChange={handleField('shippingLine1')}
                               required disabled={!!checkoutSession} />
                    </label>
                    <label>
                        Address line 2 (optional)
                        <input value={customer.shippingLine2} onChange={handleField('shippingLine2')}
                               disabled={!!checkoutSession} />
                    </label>
                    <div className="form-row">
                        <label>
                            City
                            <input value={customer.shippingCity} onChange={handleField('shippingCity')}
                                   required disabled={!!checkoutSession} />
                        </label>
                        <label>
                            Postal code
                            <input value={customer.shippingPostalCode}
                                   onChange={handleField('shippingPostalCode')}
                                   required disabled={!!checkoutSession} />
                        </label>
                        <label>
                            Country
                            <input value={customer.shippingCountry}
                                   onChange={handleField('shippingCountry')}
                                   maxLength={2} required disabled={!!checkoutSession} />
                        </label>
                    </div>

                    {intentError && <div className="store-alert">{intentError}</div>}

                    {!checkoutSession && (
                        <button
                            type="submit"
                            className="store-button"
                            disabled={!canSubmit || creatingIntent}
                        >
                            {creatingIntent ? 'Preparing payment…' : 'Continue to payment'}
                        </button>
                    )}

                    {checkoutSession && (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret: checkoutSession.clientSecret,
                                appearance: { theme: 'stripe' }
                            }}
                        >
                            <StripePaymentForm session={checkoutSession} />
                        </Elements>
                    )}
                </form>

                <aside className="checkout-summary">
                    <h2>Order summary</h2>
                    <ul>
                        {items.map((item) => (
                            <li key={`${item.productId}-${item.size}`}>
                                <div>
                                    <strong>{item.modelName}</strong>
                                    <div className="muted">Size {item.size} · qty {item.quantity}</div>
                                </div>
                                <span>{formatPrice((Number(item.unitPrice) || 0) * item.quantity)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="checkout-total">
                        <span>Total</span>
                        <strong>{formatPrice(subtotal)}</strong>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function StripePaymentForm({ session }) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { clear } = useCart();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setProcessing(true);
        setError('');

        const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/store/order/${session.orderId}`
            },
            redirect: 'if_required'
        });

        if (stripeError) {
            setError(stripeError.message || 'Payment failed.');
            setProcessing(false);
            return;
        }

        try {
            await storefrontService.confirmPayment({
                orderId: session.orderId,
                paymentIntentId: paymentIntent?.id || session.paymentIntentId,
                lookupToken: session.lookupToken
            });
        } catch (err) {
            console.error('Confirm call failed', err);
        }

        clear();
        navigate(`/order/${session.orderId}`, { replace: true });
    };

    return (
        <div className="stripe-form">
            <h2>Payment</h2>
            <PaymentElement />
            {error && <div className="store-alert">{error}</div>}
            <button
                type="button"
                className="store-button"
                onClick={handleSubmit}
                disabled={!stripe || processing}
            >
                {processing ? 'Processing…' : 'Pay now'}
            </button>
            <p className="checkout-note">
                Test card: 4242 4242 4242 4242 · any future expiry · any CVC.
            </p>
        </div>
    );
}
