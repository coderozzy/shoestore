import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import productService from '../services/productService';
import { openPrintableQr } from '../utils/printQr';
import './GenerateQRPage.css';

const SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

export default function GenerateQRPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Generate, 2: Fill Form, 3: Success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [qrData, setQrData] = useState(null); // { qrCodeValue, imageUrl }

    const [sizeStocks, setSizeStocks] = useState({}); // { 35: 0, 36: 5, ... }

    const [formData, setFormData] = useState({
        modelName: '',
        gender: 'MALE',
        color: '',
        price: ''
    });
    const [createdProduct, setCreatedProduct] = useState(null);

    const location = useLocation();

    // Check for pre-filled QR data from ScannerPage
    useEffect(() => {
        if (location.state?.qrCodeValue) {
            handleGenerateQR(location.state.qrCodeValue);
        }
    }, [location.state]);

    const handleGenerateQR = async (content = null) => {
        setLoading(true);
        setError(null);
        try {
            const data = await productService.generateQrCode(content);
            setQrData(data);
            setStep(2);
        } catch (err) {
            setError('Could not generate QR code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSizeStockChange = (size, value) => {
        setSizeStocks(prev => ({
            ...prev,
            [size]: value === '' ? '' : parseInt(value)
        }));
    };

    const calculateTotalStock = () => {
        return Object.values(sizeStocks).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Convert sizeStocks object into a list of sizes with positive stock.
        const sizesList = Object.entries(sizeStocks)
            .filter(([, stock]) => stock && Number(stock) > 0)
            .map(([size, stock]) => ({
                size: parseFloat(size),
                stockQuantity: parseInt(stock, 10)
            }));

        if (sizesList.length === 0) {
            setError('Please enter stock for at least one size.');
            setLoading(false);
            return;
        }

        try {
            const productData = {
                modelName: formData.modelName,
                gender: formData.gender,
                color: formData.color,
                price: parseFloat(formData.price),
                // categoryId is resolved server-side from Gender.
                qrCodeValue: qrData.qrCodeValue,
                sizes: sizesList
            };

            const product = await productService.createProduct(productData);
            setCreatedProduct(product);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Product could not be created');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintQR = () => {
        const sizesText = createdProduct?.sizes?.map((s) => `${s.size} (${s.stockQuantity})`).join(', ')
            || 'No Sizes';
        const modelName = createdProduct?.modelName || formData.modelName;
        openPrintableQr({
            imageUrl: qrData?.imageUrl,
            title: `QR Code - ${modelName || 'Product'}`,
            lines: [
                { heading: true, value: modelName },
                { label: 'Color', value: createdProduct?.color || formData.color },
                { label: 'Sizes', value: sizesText },
                { label: 'Price', value: `₺${createdProduct?.price || formData.price}` }
            ]
        });
    };

    return (
        <div className="generate-qr-page">
            <h1>New QR</h1>

            {/* Step 1: Generate QR */}
            {step === 1 && (
                <div className="step-container">
                    <div className="step-info">
                        <div className="step-number">1</div>
                        <h2>Create new QR code</h2>
                        <p>Generate a unique QR code for a new product, then fill in the details.</p>
                    </div>

                    {loading ? (
                        <LoadingSpinner text="Generating QR code…" />
                    ) : (
                        <button className="btn btn-primary btn-large" onClick={() => handleGenerateQR()}>
                            Generate QR code
                        </button>
                    )}

                    {error && <p className="error-message">{error}</p>}
                </div>
            )}

            {/* Step 2: Fill Form */}
            {step === 2 && (
                <div className="step-container">
                    <div className="qr-preview">
                        <img src={qrData.imageUrl} alt="QR Code" />
                        <p className="qr-value">ID: {qrData.qrCodeValue.slice(0, 8)}...</p>
                    </div>

                    <form onSubmit={handleSubmit} className="product-form">
                        <h2>Product details</h2>

                        <div className="form-group">
                            <label htmlFor="modelName">Model Name *</label>
                            <input
                                type="text"
                                id="modelName"
                                name="modelName"
                                value={formData.modelName}
                                onChange={handleInputChange}
                                placeholder="e.g. Nike Air Max 270"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="gender">Gender *</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="color">Color *</label>
                                <input
                                    type="text"
                                    id="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleInputChange}
                                    placeholder="Black/White"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="price">Price (₺) *</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                placeholder="159.99"
                                step="0.01"
                                min="0.01"
                                required
                            />
                        </div>

                        {/* Size Grid Input */}
                        <div className="form-group size-grid-container">
                            <label>Enter Size Stock (35-45)</label>
                            <div className="size-inputs-grid">
                                {SIZES.map(size => (
                                    <div key={size} className="size-input-item">
                                        <span className="size-lbl">{size}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={sizeStocks[size] || ''}
                                            onChange={(e) => handleSizeStockChange(size, e.target.value)}
                                            className={sizeStocks[size] > 0 ? 'has-stock' : ''}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="total-stock-display">
                                Total Stock: <strong>{calculateTotalStock()}</strong>
                            </div>
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving…' : 'Save product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="step-container success-container">
                    <div className="success-icon" aria-hidden>✓</div>
                    <h2>Product created</h2>

                    <div className="qr-preview">
                        <img src={qrData.imageUrl} alt="QR Code" />
                    </div>

                    <div className="product-summary">
                        <h3>{createdProduct.modelName}</h3>
                        <p>Color: {createdProduct.color} | Gender: {createdProduct.gender}</p>
                        <p>Price: ₺{createdProduct.price}</p>
                        <div className="created-sizes-list">
                            <strong>Added Sizes:</strong>
                            {createdProduct.sizes && createdProduct.sizes.length > 0 ? (
                                <ul>
                                    {createdProduct.sizes.map(s => (
                                        <li key={s.size}>Size: {s.size} - {s.stockQuantity} pcs.</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No stock entered.</p>
                            )}
                        </div>
                    </div>

                    <div className="success-actions">
                        <button className="btn btn-secondary" onClick={handlePrintQR}>
                            Print QR label
                        </button>
                        <button className="btn btn-primary" onClick={() => {
                            setStep(1);
                            setQrData(null);
                            setCreatedProduct(null);
                            setSizeStocks({});
                            setFormData({
                                modelName: '',
                                gender: 'MALE',
                                color: '',
                                price: ''
                            });
                        }}>
                            Add another
                        </button>
                    </div>

                    <button className="btn btn-link" onClick={() => navigate('/products')}>
                        View products →
                    </button>
                </div>
            )}
        </div>
    );
}
