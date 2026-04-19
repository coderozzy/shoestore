import { useEffect, useState } from 'react';
import adminService from '../services/adminService.js';

export default function StaffPage() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', email: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        let cancelled = false;
        adminService.getStaffList()
            .then((data) => { if (!cancelled) setStaff(data || []); })
            .catch(() => { if (!cancelled) setStaff([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!form.username.trim()) { setFormError('Username is required'); return; }
        // Mirror the server-side policy so failed submits are quick feedback.
        const password = form.password;
        if (password.length < 12) {
            setFormError('Password must be at least 12 characters');
            return;
        }
        const complexity = /[a-z]/.test(password) && /[A-Z]/.test(password)
            && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
        if (!complexity) {
            setFormError('Password must contain lower case, upper case, digit and symbol');
            return;
        }
        setSubmitting(true);
        try {
            const created = await adminService.createStaff({
                username: form.username.trim(),
                password: form.password,
                email: form.email.trim() || null
            });
            setStaff((prev) => [created, ...prev]);
            setForm({ username: '', password: '', email: '' });
            setShowForm(false);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create staff user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (user) => {
        setActionError('');
        try {
            const updated = await adminService.toggleStaff(user.id, !user.enabled);
            setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to update staff status');
        }
    };

    const activeCount = staff.filter((s) => s.enabled).length;
    const disabledCount = staff.filter((s) => !s.enabled).length;

    return (
        <div className="admin-page-section">
            <div className="section-header">
                <h2>🧑‍💼 Staff Management</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ New Staff'}
                </button>
            </div>

            {actionError && <div className="alert alert-error">{actionError}</div>}

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-content">
                        <span className="stat-value">{staff.length}</span>
                        <span className="stat-label">Total Staff</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-content">
                        <span className="stat-value">{activeCount}</span>
                        <span className="stat-label">Active</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">🚫</div>
                    <div className="stat-content">
                        <span className="stat-value">{disabledCount}</span>
                        <span className="stat-label">Disabled</span>
                    </div>
                </div>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="chart-card">
                    <h3>Create New Staff User</h3>
                    {formError && <div className="alert alert-error">{formError}</div>}
                    <form className="product-form" onSubmit={handleCreate}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Username</label>
                                <input
                                    className="input"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    required
                                    placeholder="staffname"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Password</label>
                                <input
                                    className="input"
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Email (optional)</label>
                            <input
                                className="input"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="staff@example.com"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Create Staff User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Staff table */}
            {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading staff…</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No staff users yet. Click "+ New Staff" to create one.
                                    </td>
                                </tr>
                            ) : staff.map((user) => (
                                <tr key={user.id}>
                                    <td>#{user.id}</td>
                                    <td className="model-name">{user.username}</td>
                                    <td>{user.email || '—'}</td>
                                    <td>
                                        <span className={`badge badge-${user.enabled ? 'active' : 'inactive'}`}>
                                            {user.enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>
                                        {user.createdAt
                                            ? new Date(user.createdAt).toLocaleDateString('tr-TR')
                                            : '—'}
                                    </td>
                                    <td>
                                        <button
                                            className={`btn btn-sm ${user.enabled ? 'btn-danger' : 'btn-primary'}`}
                                            onClick={() => handleToggle(user)}
                                        >
                                            {user.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
