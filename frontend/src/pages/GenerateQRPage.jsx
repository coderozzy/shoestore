import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import './GenerateQRPage.css';

export default function GenerateQRPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Generate, 2: Fill Form, 3: Success
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [qrData, setQrData] = useState(null); // { qrCodeValue, imageUrl }

    // Size Grid State
    const SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
    const [sizeStocks, setSizeStocks] = useState({}); // { 35: 0, 36: 5, ... }

    const [formData, setFormData] = useState({
        modelName: '',
        gender: 'MALE',
        color: '',
        price: '',
        categoryId: ''
    });
    const [createdProduct, setCreatedProduct] = useState(null);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await categoryService.getAllCategories();
                setCategories(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, categoryId: data[0].id }));
                }
            } catch (err) {
                console.error('Kategoriler yüklenemedi', err);
            }
        };
        fetchCategories();
    }, []);

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
            setError('QR kod oluşturulamadı. Lütfen tekrar deneyin.');
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

        // Convert sizeStocks object to list
        const sizesList = Object.entries(sizeStocks)
            .filter(([_, stock]) => stock && stock > 0)
            .map(([size, stock]) => ({
                size: parseFloat(size),
                stockQuantity: parseInt(stock)
            }));

        /* Allow empty sizes? User said "girsem", implying they might enter some.
           If they enter none, should we block? Maybe warn. 
           But backend allows empty. Let's allow empty but warn if total stock is 0.
        */

        try {
            const productData = {
                modelName: formData.modelName,
                gender: formData.gender,
                color: formData.color,
                price: parseFloat(formData.price),
                // categoryId removed to let backend decide based on Gender
                qrCodeValue: qrData.qrCodeValue,
                sizes: sizesList
            };

            const product = await productService.createProduct(productData);
            setCreatedProduct(product);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Ürün oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintQR = () => {
        const printWindow = window.open('', '_blank');
        const sizesText = createdProduct?.sizes?.map(s => `${s.size} (${s.stockQuantity})`).join(', ') || 'Beden Yok';

        printWindow.document.write(`
            <html>
                <head><title>QR Kod - ${createdProduct?.modelName || 'Ürün'}</title></head>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Arial;">
                    <img src="${qrData.imageUrl}" style="width:300px;height:300px;" onload="window.print();"/>
                    <h2>${createdProduct?.modelName || formData.modelName}</h2>
                    <p>Renk: ${createdProduct?.color || formData.color}</p>
                    <p>Bedenler: ${sizesText}</p>
                    <p>Fiyat: ₺${createdProduct?.price || formData.price}</p>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="generate-qr-page">
            <h1>🏷️ QR Kod Oluştur</h1>

            {/* Step 1: Generate QR */}
            {step === 1 && (
                <div className="step-container">
                    <div className="step-info">
                        <div className="step-number">1</div>
                        <h2>Yeni QR Kod Oluştur</h2>
                        <p>Yeni bir ürün için QR kod oluşturun.</p>
                    </div>

                    {loading ? (
                        <LoadingSpinner text="QR kod oluşturuluyor..." />
                    ) : (
                        <button className="btn btn-primary btn-large" onClick={() => handleGenerateQR()}>
                            🔲 QR Kod Oluştur
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
                        <h2>Ürün Bilgilerini Girin</h2>

                        <div className="form-group">
                            <label htmlFor="modelName">Model Adı *</label>
                            <input
                                type="text"
                                id="modelName"
                                name="modelName"
                                value={formData.modelName}
                                onChange={handleInputChange}
                                placeholder="örn: Nike Air Max 270"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="gender">Cinsiyet *</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="MALE">Erkek</option>
                                    <option value="FEMALE">Kadın</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="color">Renk *</label>
                                <input
                                    type="text"
                                    id="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleInputChange}
                                    placeholder="Siyah/Beyaz"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="price">Fiyat (₺) *</label>
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
                            <label>Beden Stoğu Girin (35-45)</label>
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
                                Toplam Stok: <strong>{calculateTotalStock()}</strong>
                            </div>
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                                ← Geri
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Kaydediliyor...' : '✓ Ürünü Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="step-container success-container">
                    <div className="success-icon">🎉</div>
                    <h2>Ürün Başarıyla Oluşturuldu!</h2>

                    <div className="qr-preview">
                        <img src={qrData.imageUrl} alt="QR Code" />
                    </div>

                    <div className="product-summary">
                        <h3>{createdProduct.modelName}</h3>
                        <p>Renk: {createdProduct.color} | Cinsiyet: {createdProduct.gender}</p>
                        <p>Fiyat: ₺{createdProduct.price}</p>
                        <div className="created-sizes-list">
                            <strong>Eklenen Bedenler:</strong>
                            {createdProduct.sizes && createdProduct.sizes.length > 0 ? (
                                <ul>
                                    {createdProduct.sizes.map(s => (
                                        <li key={s.size}>No: {s.size} - {s.stockQuantity} ad.</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Hiç stok girilmedi.</p>
                            )}
                        </div>
                    </div>

                    <div className="success-actions">
                        <button className="btn btn-secondary" onClick={handlePrintQR}>
                            🖨️ QR Kodu Yazdır
                        </button>
                        <button className="btn btn-primary" onClick={() => {
                            setStep(1);
                            setQrData(null);
                            setCreatedProduct(null);
                            setSizes({});
                            setFormData({
                                modelName: '',
                                gender: 'MALE',
                                color: '',
                                price: '',
                                categoryId: categories.length > 0 ? categories[0].id : ''
                            });
                        }}>
                            + Yeni Ürün Ekle
                        </button>
                    </div>

                    <button className="btn btn-link" onClick={() => navigate('/products')}>
                        Ürünleri Görüntüle →
                    </button>
                </div>
            )}
        </div>
    );
}
