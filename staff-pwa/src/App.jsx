import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import ScannerPage from './pages/ScannerPage';
import ProductsPage from './pages/ProductsPage';
import GenerateQRPage from './pages/GenerateQRPage';
import './App.css';

function App() {
    const { isAuthenticated } = useAuth();

    return (
        <div className={`app${isAuthenticated ? ' has-tabbar' : ''}`}>
            <main className="main-content">
                <Routes>
                    <Route
                        path="/login"
                        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
                    />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <ScannerPage />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/products"
                        element={
                            <PrivateRoute>
                                <ProductsPage />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/generate-qr"
                        element={
                            <PrivateRoute>
                                <GenerateQRPage />
                            </PrivateRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
            {isAuthenticated && <Navbar />}
        </div>
    );
}

export default App;

