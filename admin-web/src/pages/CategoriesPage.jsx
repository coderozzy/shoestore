import { useEffect, useState } from 'react';
import adminService from '../services/adminService.js';

/**
 * Admin-side CRUD for the shoe-style category catalog. Keeps the surface
 * deliberately small: list + create + delete. Renames intentionally
 * not exposed in v1 — a rename is just a delete + create followed by
 * reassigning products, and admins almost never need it in practice.
 *
 * The backend refuses to delete a category that still owns products
 * (409 Conflict), so the UI mirrors that rule by disabling the delete
 * button when productCount > 0 — fewer round-trips, clearer intent.
 */
export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState('');

    const reload = () => {
        setLoading(true);
        return adminService.getCategories()
            .then((data) => setCategories(data || []))
            .catch(() => setCategories([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        let cancelled = false;
        adminService.getCategories()
            .then((data) => { if (!cancelled) setCategories(data || []); })
            .catch(() => { if (!cancelled) setCategories([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        const trimmed = form.name.trim();
        if (trimmed.length < 2) {
            setFormError('Name must be at least 2 characters');
            return;
        }
        // Mirror the backend Pattern so users get instant feedback rather
        // than a 400 round-trip when they type an invalid character.
        if (!/^[A-Za-z0-9 &/_-]+$/.test(trimmed)) {
            setFormError('Name may contain letters, digits, spaces, and & / _ -');
            return;
        }
        setSubmitting(true);
        try {
            const created = await adminService.createCategory({ name: trimmed });
            setCategories((prev) => [created, ...prev]);
            setForm({ name: '' });
            setShowForm(false);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (category) => {
        setActionError('');
        const ok = window.confirm(
            `Delete category "${category.name}"? This cannot be undone.`
        );
        if (!ok) return;
        try {
            await adminService.deleteCategory(category.id);
            setCategories((prev) => prev.filter((c) => c.id !== category.id));
        } catch (err) {
            // 409 specifically means "still has products" — surface a useful
            // hint rather than the generic message, and refresh counts in case
            // the local view has drifted.
            if (err.response?.status === 409) {
                setActionError(
                    err.response?.data?.message
                    || 'This category still has products. Reassign or delete them first.'
                );
                reload();
                return;
            }
            setActionError(err.response?.data?.message || 'Failed to delete category');
        }
    };

    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    const emptyCategoryCount = categories.filter((c) => (c.productCount || 0) === 0).length;

    return (
        <div className="admin-page-section">
            <div className="section-header">
                <h2>🏷️ Categories</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ New Category'}
                </button>
            </div>

            {actionError && <div className="alert alert-error">{actionError}</div>}

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon blue">🏷️</div>
                    <div className="stat-content">
                        <span className="stat-value">{categories.length}</span>
                        <span className="stat-label">Total Categories</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">👟</div>
                    <div className="stat-content">
                        <span className="stat-value">{totalProducts}</span>
                        <span className="stat-label">Products Across All</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">⭕</div>
                    <div className="stat-content">
                        <span className="stat-value">{emptyCategoryCount}</span>
                        <span className="stat-label">Empty Categories</span>
                    </div>
                </div>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="chart-card">
                    <h3>Create New Category</h3>
                    {formError && <div className="alert alert-error">{formError}</div>}
                    <form className="product-form" onSubmit={handleCreate}>
                        <div className="form-group">
                            <label className="label">Name</label>
                            <input
                                className="input"
                                value={form.name}
                                onChange={(e) => setForm({ name: e.target.value })}
                                required
                                autoFocus
                                maxLength={50}
                                placeholder="e.g. Boots, Loafers, Wedges"
                                autoComplete="off"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Create Category'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Category table */}
            {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading categories…</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Products</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No categories yet. Click "+ New Category" to create one.
                                    </td>
                                </tr>
                            ) : categories.map((cat) => {
                                const count = cat.productCount || 0;
                                const canDelete = count === 0;
                                return (
                                    <tr key={cat.id}>
                                        <td>#{cat.id}</td>
                                        <td className="model-name">{cat.name}</td>
                                        <td>
                                            <span className={`badge badge-${count === 0 ? 'inactive' : 'active'}`}>
                                                {count} product{count === 1 ? '' : 's'}
                                            </span>
                                        </td>
                                        <td>
                                            {cat.createdAt
                                                ? new Date(cat.createdAt).toLocaleDateString('tr-TR')
                                                : '—'}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(cat)}
                                                disabled={!canDelete}
                                                title={canDelete
                                                    ? 'Delete category'
                                                    : 'Reassign products before deleting'}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
