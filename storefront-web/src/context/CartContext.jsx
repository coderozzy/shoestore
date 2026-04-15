import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'shoestore-cart';

const initialState = { items: [] };

function cartReducer(state, action) {
    switch (action.type) {
        case 'HYDRATE':
            return action.payload || initialState;

        case 'ADD': {
            const incoming = action.payload;
            const existingIdx = state.items.findIndex((item) =>
                item.productId === incoming.productId && item.size === incoming.size);
            if (existingIdx >= 0) {
                const items = [...state.items];
                items[existingIdx] = {
                    ...items[existingIdx],
                    quantity: items[existingIdx].quantity + (incoming.quantity || 1)
                };
                return { items };
            }
            return { items: [...state.items, { ...incoming, quantity: incoming.quantity || 1 }] };
        }

        case 'SET_QUANTITY': {
            const { productId, size, quantity } = action.payload;
            if (quantity <= 0) {
                return {
                    items: state.items.filter((item) =>
                        !(item.productId === productId && item.size === size))
                };
            }
            return {
                items: state.items.map((item) =>
                    item.productId === productId && item.size === size
                        ? { ...item, quantity }
                        : item)
            };
        }

        case 'REMOVE': {
            const { productId, size } = action.payload;
            return {
                items: state.items.filter((item) =>
                    !(item.productId === productId && item.size === size))
            };
        }

        case 'CLEAR':
            return initialState;

        default:
            return state;
    }
}

export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    // Load cart from localStorage on first mount.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) dispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
        } catch (err) {
            console.warn('Failed to read cart from storage', err);
        }
    }, []);

    // Persist on change.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn('Failed to persist cart', err);
        }
    }, [state]);

    const value = useMemo(() => ({
        items: state.items,
        totalItemCount: state.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: state.items.reduce(
            (sum, item) => sum + (Number(item.unitPrice) || 0) * item.quantity, 0),

        addItem: (item) => dispatch({ type: 'ADD', payload: item }),
        setQuantity: (productId, size, quantity) =>
            dispatch({ type: 'SET_QUANTITY', payload: { productId, size, quantity } }),
        removeItem: (productId, size) =>
            dispatch({ type: 'REMOVE', payload: { productId, size } }),
        clear: () => dispatch({ type: 'CLEAR' })
    }), [state]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
