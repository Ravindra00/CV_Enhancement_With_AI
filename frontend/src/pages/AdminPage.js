import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const fmtDateShort = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ACTION_LABELS = {
    user_created: { label: 'User Created', color: '#10b981' },
    user_updated: { label: 'User Updated', color: '#6366f1' },
    user_deleted: { label: 'User Deleted', color: '#ef4444' },
    user_unlocked: { label: 'User Unlocked', color: '#f59e0b' },
    password_reset: { label: 'Password Reset', color: '#8b5cf6' },
};

// ── Sub-components ───────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled, color = '#10b981' }) => (
    <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        title={disabled ? 'Cannot change your own flag' : (checked ? 'Enabled — click to disable' : 'Disabled — click to enable')}
        style={{
            width: 40, height: 22, borderRadius: 11, border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: checked ? color : '#374151',
            position: 'relative', transition: 'background 0.2s',
            opacity: disabled ? 0.4 : 1, flexShrink: 0,
        }}
    >
        <span style={{
            position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18,
            borderRadius: '50%', background: 'white', transition: 'left 0.2s', display: 'block',
        }} />
    </button>
);

const Badge = ({ label, color, bg }) => (
    <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
        background: bg || `${color}22`, color: color || '#9ca3af',
        border: `1px solid ${color || '#374151'}44`, whiteSpace: 'nowrap',
    }}>
        {label}
    </span>
);

const StatCard = ({ icon, label, value, color, sub }) => (
    <div style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${color}`,
    }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? '—'}</div>
        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
);

const Modal = ({ onClose, children }) => (
    <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
    >
        <div style={{ background: '#1e2035', borderRadius: 18, padding: 32, maxWidth: 480, width: '100%', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            {children}
        </div>
    </div>
);

// ── Toast ─────────────────────────────────────────────────────────────────────

const useToast = () => {
    const [toast, setToast] = useState(null);
    const show = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);
    const Toast = toast ? (
        <div style={{
            position: 'fixed', top: 24, right: 24, zIndex: 10000, padding: '12px 22px',
            borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 6px 30px rgba(0,0,0,0.5)',
            background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white',
            animation: 'slideIn 0.2s ease',
        }}>
            {toast.type === 'error' ? '⚠️ ' : '✅ '}{toast.msg}
        </div>
    ) : null;
    return { show, Toast };
};

// ── Dashboard Tab ─────────────────────────────────────────────────────────────

const DashboardTab = ({ stats, auditLogs, loadingStats }) => {
    if (loadingStats) return (
        <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af', fontSize: 16 }}>Loading stats…</div>
    );
    const cards = [
        { icon: '👥', label: 'Total Users', value: stats?.total_users, color: '#6366f1' },
        { icon: '✅', label: 'Active', value: stats?.active_users, color: '#10b981', sub: `${stats?.inactive_users ?? 0} inactive` },
        { icon: '🔴', label: 'Locked Out', value: stats?.locked_out_users, color: '#ef4444' },
        { icon: '🤖', label: 'AI Restricted', value: stats?.ai_restricted_users, color: '#f59e0b' },
        { icon: '📄', label: 'Total CVs', value: stats?.total_cvs, color: '#8b5cf6' },
        { icon: '🆕', label: 'New (30d)', value: stats?.new_users_this_month, color: '#06b6d4' },
    ];

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
                {cards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            {/* Recent activity */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, fontSize: 15 }}>
                    🕐 Recent Activity
                </div>
                {auditLogs.length === 0
                    ? <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>No activity recorded yet.</div>
                    : auditLogs.slice(0, 10).map((log) => {
                        const meta = ACTION_LABELS[log.action] || { label: log.action, color: '#9ca3af' };
                        return (
                            <div key={log.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Badge label={meta.label} color={meta.color} />
                                <span style={{ color: '#d1d5db', fontSize: 13, flex: 1 }}>
                                    {log.entity_type} #{log.entity_id}
                                </span>
                                <span style={{ color: '#6b7280', fontSize: 11 }}>by <strong style={{ color: '#9ca3af' }}>{log.admin_name}</strong></span>
                                <span style={{ color: '#4b5563', fontSize: 11 }}>{fmtDate(log.created_at)}</span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

// ── Users Tab ─────────────────────────────────────────────────────────────────

const UsersTab = ({ currentUser, show }) => {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [resetResult, setResetResult] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getUsers({ page, limit: 50, search: search || undefined, status: statusFilter || undefined });
            setUsers(res.data.users);
            setTotal(res.data.total);
            setPages(res.data.pages);
        } catch {
            show('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, show]);

    useEffect(() => { load(); }, [load]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const toggle = async (uid, field, val) => {
        try {
            const res = await adminAPI.updateUser(uid, { [field]: val });
            setUsers(prev => prev.map(u => u.id === uid ? { ...u, ...res.data } : u));
            if (selectedUser?.id === uid) setSelectedUser(prev => ({ ...prev, ...res.data }));
            show(`Updated ${field.replace('_', ' ')}`);
        } catch (err) {
            show(err.response?.data?.detail || 'Update failed', 'error');
        }
    };

    const handleUnlock = async (uid) => {
        try {
            await adminAPI.unlockUser(uid);
            setUsers(prev => prev.map(u => u.id === uid ? { ...u, locked_until: null, failed_login_attempts: 0 } : u));
            if (selectedUser?.id === uid) setSelectedUser(prev => ({ ...prev, locked_until: null, failed_login_attempts: 0 }));
            show('Account unlocked');
        } catch (err) { show(err.response?.data?.detail || 'Unlock failed', 'error'); }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(confirmDelete.id);
        try {
            await adminAPI.deleteUser(confirmDelete.id);
            setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
            setTotal(t => t - 1);
            setConfirmDelete(null);
            if (selectedUser?.id === confirmDelete.id) setSelectedUser(null);
            show('User deleted');
        } catch (err) { show(err.response?.data?.detail || 'Delete failed', 'error'); }
        finally { setDeleting(null); }
    };

    const handleResetPassword = async (uid) => {
        try {
            const res = await adminAPI.resetPassword(uid);
            setResetResult(res.data);
        } catch (err) { show(err.response?.data?.detail || 'Reset failed', 'error'); }
    };

    const isLocked = (u) => u.locked_until && new Date(u.locked_until) > new Date();

    return (
        <div style={{ display: 'flex', gap: 24, minHeight: 500 }}>
            {/* Main panel */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input
                        placeholder="🔍 Search name or email…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        style={{ flex: 1, minWidth: 200, padding: '9px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'white', fontSize: 13, outline: 'none' }}
                    />
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        style={{ padding: '9px 14px', background: '#1e2035', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#d1d5db', fontSize: 13, outline: 'none' }}
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="locked">Locked out</option>
                    </select>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        + Create User
                    </button>
                </div>

                {/* Table */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Users <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 13 }}>({total})</span></span>
                        <button onClick={load} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#9ca3af', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>↻</button>
                    </div>

                    {loading ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        {['Name', 'Email', 'CVs', 'Last Login', 'Status', 'AI', 'Admin', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr
                                            key={u.id}
                                            onClick={() => setSelectedUser(u)}
                                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s', background: selectedUser?.id === u.id ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                                            onMouseEnter={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            onMouseLeave={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <td style={{ padding: '11px 14px', fontWeight: 600 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        {u.name}
                                                        {u.id === currentUser.id && <Badge label="You" color="#6366f1" />}
                                                        {isLocked(u) && <Badge label="🔒 Locked" color="#ef4444" />}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 14px', color: '#9ca3af' }}>{u.email}</td>
                                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                                                <Badge label={u.cv_count} color="#8b5cf6" />
                                            </td>
                                            <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 11 }}>{fmtDateShort(u.last_login)}</td>
                                            <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                                                <Toggle checked={u.is_active} disabled={u.id === currentUser.id} onChange={v => toggle(u.id, 'is_active', v)} color="#10b981" />
                                            </td>
                                            <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                                                <Toggle checked={u.ai_access} onChange={v => toggle(u.id, 'ai_access', v)} color="#f59e0b" />
                                            </td>
                                            <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                                                <Toggle checked={u.is_superuser} disabled={u.id === currentUser.id} onChange={v => toggle(u.id, 'is_superuser', v)} color="#6366f1" />
                                            </td>
                                            <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {isLocked(u) && (
                                                        <button onClick={() => handleUnlock(u.id)} style={{ padding: '4px 9px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#fbbf24', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Unlock</button>
                                                    )}
                                                    {u.id !== currentUser.id && (
                                                        <button onClick={() => setConfirmDelete(u)} style={{ padding: '4px 9px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pages > 1 && (
                        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6b7280', fontSize: 12 }}>Page {page} of {pages}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>←</button>
                                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>→</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Side panel: user detail */}
            {selectedUser && (
                <div style={{ width: 300, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 20, height: 'fit-content', position: 'sticky', top: 80 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>User Detail</span>
                        <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    </div>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, margin: '0 auto 14px' }}>
                        {selectedUser.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedUser.name}</div>
                        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{selectedUser.email}</div>
                    </div>

                    {[
                        { label: 'Member Since', value: fmtDateShort(selectedUser.created_at) },
                        { label: 'Last Login', value: fmtDateShort(selectedUser.last_login) },
                        { label: 'Total CVs', value: selectedUser.cv_count },
                        { label: 'Login Failures', value: selectedUser.failed_login_attempts ?? 0 },
                        { label: 'Locked Until', value: selectedUser.locked_until ? fmtDate(selectedUser.locked_until) : 'Not locked' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
                            <span style={{ color: '#6b7280' }}>{label}</span>
                            <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{value}</span>
                        </div>
                    ))}

                    <div style={{ marginTop: 16, display: 'flex', gap: 8, flexDirection: 'column' }}>
                        {isLocked(selectedUser) && (
                            <button onClick={() => handleUnlock(selectedUser.id)} style={{ padding: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#fbbf24', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                                🔓 Unlock Account
                            </button>
                        )}
                        {selectedUser.id !== currentUser.id && (
                            <>
                                <button onClick={() => handleResetPassword(selectedUser.id)} style={{ padding: '8px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#c4b5fd', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                                    🔑 Reset Password
                                </button>
                                <button onClick={() => setConfirmDelete(selectedUser)} style={{ padding: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                                    🗑️ Delete User
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(u) => { setUsers(p => [u, ...p]); setTotal(t => t + 1); setShowCreateModal(false); show('User created successfully'); }}
                    show={show}
                />
            )}

            {/* Delete confirm */}
            {confirmDelete && (
                <Modal onClose={() => setConfirmDelete(null)}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Delete User?</h3>
                        <p style={{ color: '#9ca3af', margin: 0, fontSize: 14 }}>
                            This will permanently delete <strong style={{ color: 'white' }}>{confirmDelete.name}</strong> and ALL their CVs, cover letters, and data.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 10, background: '#374151', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                        <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: 10, background: '#ef4444', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Password reset result */}
            {resetResult && (
                <Modal onClose={() => setResetResult(null)}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Temporary Password</h3>
                        <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>Share this securely with <strong style={{ color: 'white' }}>{resetResult.user_email}</strong></p>
                        <div style={{ background: '#0f1629', border: '2px solid #6366f1', borderRadius: 10, padding: '14px 20px', fontSize: 18, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#a5b4fc', wordBreak: 'break-all' }}>
                            {resetResult.temporary_password}
                        </div>
                        <button
                            onClick={() => { navigator.clipboard?.writeText(resetResult.temporary_password); show('Copied!'); }}
                            style={{ marginTop: 10, padding: '6px 16px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                            📋 Copy to clipboard
                        </button>
                    </div>
                    <button onClick={() => setResetResult(null)} style={{ width: '100%', padding: 10, background: '#374151', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                </Modal>
            )}
        </div>
    );
};

// ── Create User Modal ─────────────────────────────────────────────────────────

const CreateUserModal = ({ onClose, onCreated, show }) => {
    const [form, setForm] = useState({ name: '', email: '', password: '', is_superuser: false, ai_access: true });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
        if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
        return e;
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setSaving(true);
        try {
            const res = await adminAPI.createUser(form);
            onCreated(res.data);
        } catch (err) {
            show(err.response?.data?.detail || 'Create failed', 'error');
        } finally { setSaving(false); }
    };

    const field = (key, label, type = 'text', placeholder = '') => (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 5 }}>{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => { setForm(p => ({ ...p, [key]: e.target.value })); setErrors(p => ({ ...p, [key]: undefined })); }}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${errors[key] ? '#ef4444' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {errors[key] && <div style={{ color: '#f87171', fontSize: 11, marginTop: 3 }}>{errors[key]}</div>}
        </div>
    );

    return (
        <Modal onClose={onClose}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>➕ Create New User</h3>
            {field('name', 'Full Name', 'text', 'Jane Smith')}
            {field('email', 'Email Address', 'email', 'jane@example.com')}
            {field('password', 'Initial Password', 'password', 'Min. 6 characters')}
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <Toggle checked={form.ai_access} onChange={v => setForm(p => ({ ...p, ai_access: v }))} color="#f59e0b" />
                    AI Access
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <Toggle checked={form.is_superuser} onChange={v => setForm(p => ({ ...p, is_superuser: v }))} color="#6366f1" />
                    Superuser
                </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 10, background: '#374151', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                    {saving ? 'Creating…' : 'Create User'}
                </button>
            </div>
        </Modal>
    );
};

// ── Audit Logs Tab ────────────────────────────────────────────────────────────

const AuditLogsTab = ({ show }) => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [expanded, setExpanded] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getAuditLogs({ page, limit: 50, action: actionFilter || undefined });
            setLogs(res.data.logs);
            setTotal(res.data.total);
        } catch { show('Failed to load audit logs', 'error'); }
        finally { setLoading(false); }
    }, [page, actionFilter, show]);

    useEffect(() => { load(); }, [load]);

    const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select
                    value={actionFilter}
                    onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                    style={{ padding: '9px 14px', background: '#1e2035', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#d1d5db', fontSize: 13, outline: 'none' }}
                >
                    <option value="">All actions</option>
                    {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={load} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
                <span style={{ marginLeft: 'auto', alignSelf: 'center', color: '#6b7280', fontSize: 12 }}>{total} total entries</span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                {['Time', 'Admin', 'Action', 'Entity', 'ID', 'IP', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Loading…</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>No audit logs yet.</td></tr>
                            ) : logs.map(log => {
                                const meta = ACTION_LABELS[log.action] || { label: log.action, color: '#9ca3af' };
                                const hasDiff = log.old_values || log.new_values;
                                return (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', cursor: hasDiff ? 'pointer' : 'default' }}
                                            onClick={() => hasDiff && toggleExpand(log.id)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                                            <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{log.admin_name || `#${log.admin_id}`}</td>
                                            <td style={{ padding: '10px 14px' }}><Badge label={meta.label} color={meta.color} /></td>
                                            <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{log.entity_type}</td>
                                            <td style={{ padding: '10px 14px', color: '#6b7280' }}>#{log.entity_id}</td>
                                            <td style={{ padding: '10px 14px', color: '#4b5563', fontSize: 11 }}>{log.ip_address || '—'}</td>
                                            <td style={{ padding: '10px 14px', color: '#4b5563' }}>{hasDiff && (expanded[log.id] ? '▲' : '▼')}</td>
                                        </tr>
                                        {expanded[log.id] && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '0 14px 14px 14px', borderTop: 'none' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                        {log.old_values && (
                                                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12 }}>
                                                                <div style={{ color: '#f87171', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Before</div>
                                                                <pre style={{ margin: 0, color: '#d1d5db', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.old_values, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                        {log.new_values && (
                                                            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 12 }}>
                                                                <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>After</div>
                                                                <pre style={{ margin: 0, color: '#d1d5db', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.new_values, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {log.notes && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 8 }}>📝 {log.notes}</div>}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>Page {page}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>←</button>
                        <button onClick={() => setPage(p => p + 1)} style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>→</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Main AdminPage ────────────────────────────────────────────────────────────

const AdminPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const { show, Toast } = useToast();

    useEffect(() => {
        if (!user?.is_superuser) { navigate('/dashboard'); return; }
        (async () => {
            try {
                const [statsRes, logsRes] = await Promise.all([
                    adminAPI.getStats(),
                    adminAPI.getAuditLogs({ page: 1, limit: 20 }),
                ]);
                setStats(statsRes.data);
                setAuditLogs(logsRes.data.logs || []);
            } catch { show('Failed to load admin data', 'error'); }
            finally { setLoadingStats(false); }
        })();
    }, [user, navigate, show]);

    if (!user?.is_superuser) return null;

    const tabs = [
        { key: 'dashboard', label: '📊 Dashboard' },
        { key: 'users', label: '👥 Users' },
        { key: 'audit', label: '📋 Audit Logs' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f1629 100%)', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
            {Toast}

            <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            ⚙️ Admin Panel
                        </h1>
                        <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>Manage users, access control, and system audit logs</p>
                    </div>
                    <button onClick={() => navigate('/dashboard')} style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#d1d5db', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ← Dashboard
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            style={{
                                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                                background: activeTab === t.key ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : 'transparent',
                                color: activeTab === t.key ? 'white' : '#9ca3af',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === 'dashboard' && <DashboardTab stats={stats} auditLogs={auditLogs} loadingStats={loadingStats} />}
                {activeTab === 'users' && <UsersTab currentUser={user} show={show} />}
                {activeTab === 'audit' && <AuditLogsTab show={show} />}
            </div>
        </div>
    );
};

export default AdminPage;
