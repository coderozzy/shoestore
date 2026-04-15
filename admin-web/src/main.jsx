import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AdminApp from './AdminApp.jsx';
import './admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter basename="/admin">
            <AuthProvider>
                <AdminApp />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
);
