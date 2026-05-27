import { useEffect, useMemo, useRef, useState } from 'react';
import adminService from '../services/adminService.js';
import { openPrintableQr } from '../utils/printQr.js';

const formatCurrency = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
    .format(Number.isFinite(Number(v)) ? Number(v) : 0);

const EMPTY_FORM = {
    modelName: '', gender: 'MALE', color: '', price: '', categoryId: '',
    imageDataUrl: '', imageDataUrls: [],
    publishedToStore: false, storeDisplayOrder: '',
    sizes: {}
};
const DEFAULT_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
const CITY_OPTIONS = ['Istanbul', 'Paris', 'Tokyo', 'Berlin', 'New York'];
const EMPTY_GEN = { mode: 'studio', city: 'Istanbul', timeOfDay: 'day' };

function shrinkImage(dataUrl, maxDim = 1000, quality = 0.78) {
    return new Promise((resolve) => {
        if (!dataUrl) { resolve(''); return; }
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => shrinkImage(r.result, 1100, 0.82).then((b) => resolve({ base64: b, mimeType: 'image/jpeg' }));
        r.onerror = () => reject(new Error('Could not read file'));
        r.readAsDataURL(file);
    });
}

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const [gen, setGen] = useState(EMPTY_GEN);
    const [genError, setGenError] = useState('');
    const [generating, setGenerating] = useState(false);
    const [sourceImage, setSourceImage] = useState(null);
    const [backgroundImage, setBackgroundImage] = useState(null);

    const [pickOpen, setPickOpen] = useState(false);
    const [pickImages, setPickImages] = useState([]);
    const [pickSelected, setPickSelected] = useState(new Set());

    const [qrProduct, setQrProduct] = useState(null);

    const srcGallery = useRef(null);
    const srcCamera = useRef(null);
    const bgGallery = useRef(null);
    const bgCamera = useRef(null);

    const reload = () => {
        setLoading(true);
        Promise.all([
            adminService.getProducts().catch(() => []),
            adminService.getCategories().catch(() => [])
        ]).then(([p, c]) => { setProducts(p || []); setCategories(c || []); })
            .finally(() => setLoading(false));
    };
    useEffect(() => { reload(); }, []);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) => (p.modelName || '').toLowerCase().includes(q)
            || (p.color || '').toLowerCase().includes(q));
    }, [products, search]);

    const openCreate = () => {
        setEditing(null); setForm({ ...EMPTY_FORM, sizes: {} }); setFormError('');
        setGen(EMPTY_GEN); setGenError(''); setSourceImage(null); setBackgroundImage(null);
        setPickOpen(false); setPickImages([]); setPickSelected(new Set());
        setModalOpen(true);
    };
    const openEdit = (product) => {
        setEditing(product);
        const sizeMap = {};
        (product.sizes || []).forEach((s) => { sizeMap[s.size] = s.stockQuantity; });
        const cat = categories.find((c) => c.name === product.categoryName);
        setForm({
            modelName: product.modelName || '', gender: product.gender || 'MALE',
            color: product.color || '', price: product.price != null ? String(product.price) : '',
            categoryId: cat ? String(cat.id) : '', imageDataUrl: product.imageDataUrl || '',
            imageDataUrls: product.imageDataUrls || (product.imageDataUrl ? [product.imageDataUrl] : []),
            publishedToStore: !!product.publishedToStore,
            storeDisplayOrder: product.storeDisplayOrder != null ? String(product.storeDisplayOrder) : '',
            sizes: sizeMap
        });
        setFormError(''); setGen(EMPTY_GEN); setGenError(''); setSourceImage(null); setBackgroundImage(null);
        setPickOpen(false); setPickImages([]); setPickSelected(new Set());
        setModalOpen(true);
    };
    const closeModal = () => { if (!saving && !generating) setModalOpen(false); };

    const pickFile = async (file, target) => {
        if (!file) return;
        try {
            const img = await readFile(file);
            if (target === 'source') { setSourceImage(img); setGenError(''); }
            else setBackgroundImage(img);
        } catch (e) { setGenError(e.message); }
    };

    const handleGenerate = async () => {
        setGenError('');
        if (!sourceImage) { setGenError('Upload a shoe photo first.'); return; }
        if (gen.mode === 'background' && !backgroundImage) { setGenError('Upload a background photo.'); return; }

        setGenerating(true);
        try {
            const res = await adminService.generateProductImage({
                ...gen, shoeImage: sourceImage,
                backgroundImage: gen.mode === 'background' ? backgroundImage : null
            });
            const imgs = res.imageDataUrls?.length ? res.imageDataUrls
                : (res.imageDataUrl ? [res.imageDataUrl] : []);
            if (!imgs.length) { setGenError('No images returned.'); return; }

            setPickImages(imgs);
            setPickSelected(new Set());
            setGenerating(false);
            setPickOpen(true);
        } catch (e) {
            console.error(e);
            setGenError(e.response?.data?.message || 'Generation failed.');
        } finally {
            setGenerating(false);
        }
    };

    const togglePick = (i) => {
        setPickSelected((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
        });
    };

    const confirmPick = async () => {
        const chosen = [...pickSelected].sort().map((i) => pickImages[i]).filter(Boolean);
        if (!chosen.length) { setGenError('Select at least one image.'); return; }
        setGenerating(true);
        try {
            const compressed = await Promise.all(chosen.map((d) => shrinkImage(d)));
            setForm((f) => ({ ...f, imageDataUrl: compressed[0] || '', imageDataUrls: compressed.filter(Boolean) }));
            setPickOpen(false);
        } catch (e) { setGenError('Compression failed.'); }
        finally { setGenerating(false); }
    };

    const useOriginal = () => {
        if (!sourceImage) { setGenError('Upload a photo first.'); return; }
        setForm((f) => ({ ...f, imageDataUrl: sourceImage.base64, imageDataUrls: [sourceImage.base64] }));
    };

    const handleSave = async (e) => {
        e.preventDefault(); setFormError('');
        const price = Number(form.price);
        if (!form.modelName.trim() || !form.color.trim() || !Number.isFinite(price) || price <= 0)
            { setFormError('Fill all required fields.'); return; }
        const sizes = Object.entries(form.sizes)
            .filter(([, q]) => q != null && q !== '' && Number(q) >= 0)
            .map(([s, q]) => ({ size: parseFloat(s), stockQuantity: parseInt(q, 10) || 0 }));
        if (!editing && !sizes.length) { setFormError('Add at least one size.'); return; }
        const order = form.storeDisplayOrder === '' ? null : Number(form.storeDisplayOrder);

        setSaving(true);
        try {
            const base = {
                modelName: form.modelName, gender: form.gender, color: form.color, price,
                imageDataUrl: form.imageDataUrl || null, imageDataUrls: form.imageDataUrls || [],
                publishedToStore: form.publishedToStore, storeDisplayOrder: order,
                categoryId: form.categoryId ? Number(form.categoryId) : null
            };
            if (editing) {
                await adminService.updateProduct(editing.id, base);
                const existing = new Map((editing.sizes || []).map((s) => [Number(s.size), s]));
                for (const row of sizes) {
                    const prev = existing.get(row.size);
                    if (prev) { if (prev.stockQuantity !== row.stockQuantity) await adminService.adjustSizeStock(editing.id, row.size, row.stockQuantity); }
                    else await adminService.addSize(editing.id, row.size, row.stockQuantity);
                }
            } else {
                await adminService.createProduct({ ...base, qrCodeValue: crypto.randomUUID(), sizes });
            }
            setModalOpen(false); reload();
        } catch (e) { setFormError(e.response?.data?.message || 'Save failed.'); }
        finally { setSaving(false); }
    };

    const togglePublish = async (p) => {
        try { await adminService.updateProduct(p.id, { publishedToStore: !p.publishedToStore }); reload(); }
        catch (e) { alert(e.response?.data?.message || 'Failed.'); }
    };
    const handleDelete = async (p) => {
        if (!confirm(`Delete "${p.modelName}"?`)) return;
        try { await adminService.deleteProduct(p.id); reload(); }
        catch (e) { alert(e.response?.data?.message || 'Failed.'); }
    };
    const printQr = async (p) => {
        try {
            const imageUrl = await adminService.fetchQrImageObjectUrl(p.id);
            openPrintableQr({
                imageUrl,
                title: `QR · ${p.modelName || ''}`,
                lines: [
                    { heading: true, value: p.modelName || '' },
                    { label: 'Color', value: p.color ?? '' },
                    { label: 'Price', value: formatCurrency(p.price) }
                ]
            });
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);
        } catch (err) {
            alert(err.response?.data?.message || 'Could not load QR image.');
        }
    };

    return (
        <div className="admin-page-section">
            <div className="section-header">
                <h2>Products</h2>
                <div className="controls-row">
                    <input className="input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <button className="btn btn-primary" onClick={openCreate}>+ New product</button>
                </div>
            </div>
            {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead><tr>
                            <th>Image</th><th>Model</th><th>Storefront</th><th>Order</th>
                            <th>Gender</th><th>Color</th><th>Price</th><th>Stock</th><th>Sizes</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {!visible.length ? <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>No products.</td></tr>
                            : visible.map((p) => (
                                <tr key={p.id}>
                                    <td><div className="product-thumb">{(p.imageDataUrls?.[0] || p.imageDataUrl)
                                        ? <img src={p.imageDataUrls?.[0] || p.imageDataUrl} alt="" /> : <span>👟</span>}</div></td>
                                    <td className="model-name">{p.modelName}</td>
                                    <td><span className={`badge ${p.publishedToStore ? 'badge-live' : 'badge-draft'}`}>{p.publishedToStore ? 'Live' : 'Draft'}</span></td>
                                    <td>{p.storeDisplayOrder ?? 'Auto'}</td>
                                    <td>{p.gender}</td><td>{p.color}</td>
                                    <td className="revenue">{formatCurrency(p.price)}</td>
                                    <td className={p.lowStock ? 'low-stock' : ''}>{p.totalStock ?? 0}</td>
                                    <td>{(p.sizes || []).length}</td>
                                    <td><div className="row-actions">
                                        <button className="btn btn-sm btn-secondary" onClick={() => setQrProduct(p)}>QR</button>
                                        <button className={`btn btn-sm ${p.publishedToStore ? 'btn-danger' : 'btn-primary'}`} onClick={() => togglePublish(p)}>
                                            {p.publishedToStore ? 'Pull offline' : 'Push online'}</button>
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>Edit</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>Delete</button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== PRODUCT FORM MODAL ===== */}
            {modalOpen && !pickOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Edit product' : 'New product'}</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <form className="product-form" onSubmit={handleSave}>
                            {formError && <div className="alert alert-error">{formError}</div>}
                            <div className="form-row">
                                <div className="form-group"><label className="label">Model name</label>
                                    <input className="input" required value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} /></div>
                                <div className="form-group"><label className="label">Color</label>
                                    <input className="input" required value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="label">Gender</label>
                                    <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                        <option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                                <div className="form-group"><label className="label">Price (₺)</label>
                                    <input className="input" type="number" step="0.01" min="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                                <div className="form-group"><label className="label">Category</label>
                                    <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                                        <option value="">Auto</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-group"><label className="label">Sizes &amp; stock</label>
                                <div className="size-input-grid">{DEFAULT_SIZES.map((s) => (
                                    <div key={s} className="size-input-item"><span>{s}</span>
                                        <input type="number" min="0" className="input" placeholder="0" value={form.sizes[s] ?? ''}
                                            onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, [s]: e.target.value } })} />
                                    </div>))}</div></div>
                            <div className="form-row">
                                <div className="form-group"><label className="label">Storefront</label>
                                    <label className="toggle-card">
                                        <input type="checkbox" checked={form.publishedToStore} onChange={(e) => setForm({ ...form, publishedToStore: e.target.checked })} />
                                        <span>{form.publishedToStore ? 'Published' : 'Draft'}</span></label></div>
                                <div className="form-group"><label className="label">Order</label>
                                    <input className="input" type="number" min="1" placeholder="Auto" value={form.storeDisplayOrder}
                                        onChange={(e) => setForm({ ...form, storeDisplayOrder: e.target.value })} /></div>
                            </div>

                            <div className="form-group"><label className="label">Storefront image</label>
                                <div className="image-tools-grid">
                                    <div className="image-card">
                                        <strong>Shoe photo</strong>
                                        <div className="image-stage">{sourceImage
                                            ? <img src={sourceImage.base64} alt="" className="image-stage-preview" />
                                            : <div className="image-stage-placeholder">Upload shoe photo</div>}</div>
                                        <div className="row-actions">
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => srcCamera.current?.click()}>Camera</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => srcGallery.current?.click()}>Gallery</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={useOriginal}>Use original</button>
                                        </div>
                                        <input ref={srcGallery} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0], 'source')} />
                                        <input ref={srcCamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0], 'source')} />
                                    </div>
                                    <div className="image-card">
                                        <strong>AI Generate</strong>
                                        <div className="form-row compact">
                                            <div className="form-group"><label className="label">Mode</label>
                                                <select className="input" value={gen.mode} onChange={(e) => setGen((g) => ({ ...g, mode: e.target.value }))}>
                                                    <option value="studio">Studio</option><option value="lifestyle">Lifestyle</option>
                                                    <option value="multiple">Multiple (3x)</option><option value="background">Background</option>
                                                </select></div>
                                            <div className="form-group"><label className="label">City</label>
                                                <select className="input" value={gen.city} onChange={(e) => setGen((g) => ({ ...g, city: e.target.value }))}
                                                    disabled={gen.mode === 'studio' || gen.mode === 'background'}>
                                                    {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                                            <div className="form-group"><label className="label">Time</label>
                                                <select className="input" value={gen.timeOfDay} onChange={(e) => setGen((g) => ({ ...g, timeOfDay: e.target.value }))}
                                                    disabled={gen.mode === 'studio' || gen.mode === 'background'}>
                                                    <option value="day">Day</option><option value="night">Night</option></select></div>
                                        </div>
                                        {gen.mode === 'background' && (<>
                                            <div className="image-stage small">{backgroundImage
                                                ? <img src={backgroundImage.base64} alt="" className="image-stage-preview" />
                                                : <div className="image-stage-placeholder">Background photo</div>}</div>
                                            <div className="row-actions" style={{ marginTop: '0.5rem' }}>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => bgCamera.current?.click()}>BG Camera</button>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => bgGallery.current?.click()}>BG Gallery</button>
                                            </div>
                                            <input ref={bgGallery} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0], 'bg')} />
                                            <input ref={bgCamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFile(e.target.files?.[0], 'bg')} />
                                        </>)}
                                        <div className="row-actions" style={{ marginTop: '0.75rem' }}>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating}>
                                                {generating ? 'Generating…' : 'Generate AI image'}</button>
                                        </div>
                                        {genError && <div className="alert alert-error">{genError}</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving || generating}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== VARIANT PICKER MODAL ===== */}
            {pickOpen && (
                <div className="modal-overlay" style={{ zIndex: 1050 }}>
                    <div className="pick-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="pick-header">
                            <span>Select images</span>
                            <button className="modal-close" onClick={() => setPickOpen(false)}>×</button>
                        </div>
                        <div className="pick-row">
                            {pickImages.map((dataUrl, i) => (
                                <div key={i}
                                    className={`pick-thumb ${pickSelected.has(i) ? 'picked' : ''}`}
                                    onClick={() => togglePick(i)}>
                                    <img src={dataUrl} alt={`#${i + 1}`} />
                                    <div className="pick-check">{pickSelected.has(i) ? '✓' : i + 1}</div>
                                </div>
                            ))}
                        </div>
                        <div className="pick-footer">
                            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPickOpen(false)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" type="button" onClick={confirmPick} disabled={generating}>
                                {generating ? 'Wait…' : `Use ${pickSelected.size || 0} selected`}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== QR MODAL ===== */}
            {qrProduct && (
                <div className="modal-overlay" onClick={() => setQrProduct(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>QR · {qrProduct.modelName}</h2>
                            <button className="modal-close" onClick={() => setQrProduct(null)}>×</button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <img src={adminService.getQrCodeImageUrl(qrProduct.id)} alt="QR" style={{ width: 280, height: 280 }} />
                            <p className="muted" style={{ wordBreak: 'break-all' }}>{qrProduct.qrCodeValue}</p>
                        </div>
                        <div className="form-actions">
                            <button className="btn btn-secondary" onClick={() => printQr(qrProduct)}>Print</button>
                            <button className="btn btn-primary" onClick={() => setQrProduct(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
