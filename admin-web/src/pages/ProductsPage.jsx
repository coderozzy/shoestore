import { useEffect, useMemo, useState } from 'react';
import adminService from '../services/adminService.js';

const formatCurrency = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
    .format(Number.isFinite(Number(v)) ? Number(v) : 0);

const EMPTY_FORM = {
    modelName: '',
    gender: 'MALE',
    color: '',
    price: '',
    categoryId: '',
    sizes: {} // { 36: 0, 37: 5, ... }
};

const DEFAULT_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // Product being edited (null = create)
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const [qrProduct, setQrProduct] = useState(null);

    const reload = () => {
        setLoading(true);
        Promise.all([
            adminService.getProducts().catch(() => []),
            adminService.getCategories().catch(() => [])
        ]).then(([prods, cats]) => {
            setProducts(prods || []);
            setCategories(cats || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const visibleProducts = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return products;
        return products.filter((p) => (p.modelName || '').toLowerCase().includes(needle)
            || (p.color || '').toLowerCase().includes(needle));
    }, [products, search]);

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, sizes: {} });
        setFormError('');
        setModalOpen(true);
    };

    const openEdit = (product) => {
        setEditing(product);
        const sizeMap = {};
        (product.sizes || []).forEach((s) => { sizeMap[s.size] = s.stockQuantity; });
        setForm({
            modelName: product.modelName || '',
            gender: product.gender || 'MALE',
            color: product.color || '',
            price: product.price != null ? String(product.price) : '',
            categoryId: product.categoryId ? String(product.categoryId) : '',
            sizes: sizeMap
        });
        setFormError('');
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');

        const priceNum = Number(form.price);
        if (!form.modelName.trim() || !form.color.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
            setFormError('Please fill in all fields with valid values.');
            return;
        }

        const sizesList = Object.entries(form.sizes)
            .filter(([, qty]) => qty != null && qty !== '' && Number(qty) >= 0)
            .map(([size, qty]) => ({
                size: parseFloat(size),
                stockQuantity: parseInt(qty, 10) || 0
            }));

        if (!editing && sizesList.length === 0) {
            setFormError('Add stock for at least one size.');
            return;
        }

        setSaving(true);
        try {
            if (editing) {
                // Update meta
                const payload = {
                    modelName: form.modelName,
                    gender: form.gender,
                    color: form.color,
                    price: priceNum,
                    categoryId: form.categoryId ? Number(form.categoryId) : null
                };
                await adminService.updateProduct(editing.id, payload);

                // Adjust existing sizes + add new ones
                const existing = new Map((editing.sizes || []).map((s) => [Number(s.size), s]));
                for (const sizeRow of sizesList) {
                    const prev = existing.get(sizeRow.size);
                    if (prev) {
                        if (prev.stockQuantity !== sizeRow.stockQuantity) {
                            await adminService.adjustSizeStock(editing.id, sizeRow.size, sizeRow.stockQuantity);
                        }
                    } else {
                        await adminService.addSize(editing.id, sizeRow.size, sizeRow.stockQuantity);
                    }
                }
            } else {
                const payload = {
                    modelName: form.modelName,
                    gender: form.gender,
                    color: form.color,
                    price: priceNum,
                    categoryId: form.categoryId ? Number(form.categoryId) : null,
                    qrCodeValue: crypto.randomUUID(),
                    sizes: sizesList
                };
                await adminService.createProduct(payload);
            }
            setModalOpen(false);
            reload();
        } catch (err) {
            console.error('Save product failed', err);
            setFormError(err.response?.data?.message || 'Failed to save product.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (product) => {
        if (!window.confirm(`Delete "${product.modelName}" permanently?`)) return;
        try {
            await adminService.deleteProduct(product.id);
            reload();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed.');
        }
    };

    const handlePrintQr = (product) => {
        const win = window.open('', '_blank');
        if (!win) {
            alert('Pop-up blocked. Please allow pop-ups to print the QR.');
            return;
        }
        const url = adminService.getQrCodeImageUrl(product.id);
        win.document.write(`
            <html><head><title>QR · ${product.modelName}</title></head>
            <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                         height:100vh;font-family:system-ui;">
                <img src="${url}" alt="QR" style="width:300px;height:300px;" onload="window.print();" />
                <h2>${product.modelName}</h2>
                <p>${product.color ?? ''} · ${formatCurrency(product.price)}</p>
            </body></html>`);
        win.document.close();
    };

    return (
        <div className="admin-page-section">
            <div className="section-header">
                <h2>👟 Products</h2>
                <div className="controls-row">
                    <input
                        className="input"
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>+ New product</button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Gender</th>
                                <th>Color</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Sizes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleProducts.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No products.
                                </td></tr>
                            ) : visibleProducts.map((p) => (
                                <tr key={p.id}>
                                    <td className="model-name">{p.modelName}</td>
                                    <td>{p.gender}</td>
                                    <td>{p.color}</td>
                                    <td className="revenue">{formatCurrency(p.price)}</td>
                                    <td className={p.lowStock ? 'low-stock' : ''}>{p.totalStock ?? 0}</td>
                                    <td>{(p.sizes || []).length} sizes</td>
                                    <td>
                                        <div className="row-actions">
                                            <button className="btn btn-sm btn-secondary"
                                                    onClick={() => setQrProduct(p)}>QR</button>
                                            <button className="btn btn-sm btn-secondary"
                                                    onClick={() => openEdit(p)}>Edit</button>
                                            <button className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(p)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Edit product' : 'New product'}</h2>
                            <button className="modal-close"
                                    onClick={() => !saving && setModalOpen(false)}>×</button>
                        </div>
                        <form className="product-form" onSubmit={handleSave}>
                            {formError && <div className="alert alert-error">{formError}</div>}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Model name</label>
                                    <input className="input" required value={form.modelName}
                                           onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Color</label>
                                    <input className="input" required value={form.color}
                                           onChange={(e) => setForm({ ...form, color: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Gender</label>
                                    <select className="input" value={form.gender}
                                            onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Price (₺)</label>
                                    <input className="input" type="number" step="0.01" min="0.01" required
                                           value={form.price}
                                           onChange={(e) => setForm({ ...form, price: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Category</label>
                                    <select className="input" value={form.categoryId}
                                            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                                        <option value="">Auto (by gender)</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label">Sizes &amp; stock</label>
                                <div className="size-input-grid">
                                    {DEFAULT_SIZES.map((size) => (
                                        <div key={size} className="size-input-item">
                                            <span>{size}</span>
                                            <input type="number" min="0" className="input"
                                                   placeholder="0"
                                                   value={form.sizes[size] ?? ''}
                                                   onChange={(e) => setForm({
                                                       ...form,
                                                       sizes: { ...form.sizes, [size]: e.target.value }
                                                   })} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary"
                                        onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving…' : (editing ? 'Save changes' : 'Create product')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {qrProduct && (
                <div className="modal-overlay" onClick={() => setQrProduct(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>QR · {qrProduct.modelName}</h2>
                            <button className="modal-close" onClick={() => setQrProduct(null)}>×</button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <img src={adminService.getQrCodeImageUrl(qrProduct.id)}
                                 alt="QR" style={{ width: 280, height: 280 }} />
                            <p className="muted" style={{ wordBreak: 'break-all' }}>{qrProduct.qrCodeValue}</p>
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-secondary"
                                    onClick={() => handlePrintQr(qrProduct)}>🖨️ Print</button>
                            <button className="btn btn-primary" onClick={() => setQrProduct(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
