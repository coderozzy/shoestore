import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import './storefront.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter basename="/store">
        <CartProvider>
            <App />
        </CartProvider>
    </BrowserRouter>
);
