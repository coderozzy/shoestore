import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import LeatherSwatch from '../components/LeatherSwatch.jsx';

/** Format ₺ price with Turkish grouping + 2 decimals for sub-total math. */
const formatPrice = (v) => {
    const n = Number(v) || 0;
    return `₺${n.toLocaleString('tr-TR', {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    })}`;
};

const FREE_SHIPPING_THRESHOLD = 500;
const FLAT_SHIPPING = 49;

/**
 * Shopping cart — Steps design:
 *   • Two-column grid on desktop (items left, sticky summary right, 320px)
 *   • Collapses to one column on mobile; summary becomes static
 *   • Each row is a 80px swatch + info + quantity controls with a
 *     "Remove" link underneath
 *   • Summary shows subtotal, shipping (free over ₺500), and total
 *
 * Empty state gets an editorial title, soft body copy, and a primary CTA
 * that takes the shopper back to the shop.
 */
export default function CartPage() {
    const { items, setQuantity, removeItem, subtotal } = useCart();
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="empty-cart">
                <h2>Your cart is empty</h2>
                <p>Discover our collection of quality leather footwear.</p>
                <Link to="/shop" className="store-button">Shop now</Link>
            </div>
        );
    }

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
    const total = subtotal + shipping;

    return (
        <div className="cart-page">
            <h1>Shopping cart</h1>
            <div className="cart-layout">
                <div>
                    {items.map((item) => (
                        <div key={`${item.productId}-${item.size}`} className="cart-item">
                            <div className="ci-img">
                                {item.imageDataUrl
                                    ? <img src={item.imageDataUrl} alt={item.modelName} />
                                    : <LeatherSwatch color={item.color} id={`${item.productId}-${item.size}`} />}
                            </div>
                            <div className="cart-row-info">
                                <h3>{item.modelName}</h3>
                                <p>{item.color} · Size {item.size}</p>
                                <p className="cart-row-unit">{formatPrice(item.unitPrice)}</p>
                            </div>
                            <div className="cart-row-ctrl">
                                <div className="qty">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(item.productId, item.size, item.quantity - 1)}
                                        aria-label="Decrease quantity"
                                    >−</button>
                                    <span>{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(item.productId, item.size, item.quantity + 1)}
                                        aria-label="Increase quantity"
                                    >+</button>
                                </div>
                                <button
                                    type="button"
                                    className="rm-btn"
                                    onClick={() => removeItem(item.productId, item.size)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <aside className="summary">
                    <h3>Order summary</h3>
                    <div className="sum-row">
                        <span>Subtotal</span>
                        <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="sum-row">
                        <span>Shipping</span>
                        <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                    </div>
                    <div className="sum-row sum-total">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                    <button
                        type="button"
                        className="store-button full"
                        style={{ marginTop: '1.25rem' }}
                        onClick={() => navigate('/checkout')}
                        disabled={items.length === 0}
                    >
                        Proceed to checkout
                    </button>
                    <Link to="/shop" className="cont-link">Continue shopping</Link>
                </aside>
            </div>
        </div>
    );
}
