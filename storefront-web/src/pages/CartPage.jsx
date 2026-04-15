import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const formatPrice = (v) => `₺${(Number(v) || 0).toFixed(2)}`;

export default function CartPage() {
    const { items, setQuantity, removeItem, subtotal } = useCart();
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="cart-empty">
                <h1>Your cart is empty</h1>
                <p>Add a pair of sneakers to get started.</p>
                <Link to="/" className="store-button">Browse products</Link>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <h1>Your cart</h1>

            <ul className="cart-list">
                {items.map((item) => (
                    <li key={`${item.productId}-${item.size}`} className="cart-row">
                        <div className="cart-row-info">
                            <h3>{item.modelName}</h3>
                            <p>{item.color} · Size {item.size}</p>
                            <p className="cart-row-unit">{formatPrice(item.unitPrice)} each</p>
                        </div>
                        <div className="cart-row-qty">
                            <button
                                type="button"
                                className="qty-btn"
                                onClick={() => setQuantity(item.productId, item.size, item.quantity - 1)}
                                aria-label="Decrease"
                            >−</button>
                            <span>{item.quantity}</span>
                            <button
                                type="button"
                                className="qty-btn"
                                onClick={() => setQuantity(item.productId, item.size, item.quantity + 1)}
                                aria-label="Increase"
                            >+</button>
                        </div>
                        <div className="cart-row-total">
                            {formatPrice(item.unitPrice * item.quantity)}
                        </div>
                        <button
                            type="button"
                            className="cart-row-remove"
                            onClick={() => removeItem(item.productId, item.size)}
                        >Remove</button>
                    </li>
                ))}
            </ul>

            <div className="cart-summary">
                <div>
                    <span>Subtotal</span>
                    <strong>{formatPrice(subtotal)}</strong>
                </div>
                <p className="cart-summary-note">Shipping calculated at checkout.</p>
                <button
                    type="button"
                    className="store-button"
                    onClick={() => navigate('/checkout')}
                    disabled={items.length === 0}
                >
                    Proceed to checkout
                </button>
            </div>
        </div>
    );
}
