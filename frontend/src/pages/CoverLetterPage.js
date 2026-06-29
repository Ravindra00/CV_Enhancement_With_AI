import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coverLetterAPI, cvAPI } from '../services/api';
import { jsPDF } from 'jspdf';

const LS_KEY = 'ag_saved_cover_letters';

const formatDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const CoverLetterPage = () => {
    const navigate = useNavigate();
    const [letters, setLetters] = useState([]);
    const [localLetters, setLocalLetters] = useState([]);
    const [cvs, setCVs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [linkedCv, setLinkedCv] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState(null);
    const [editingLocal, setEditingLocal] = useState(null);
    const [localEditText, setLocalEditText] = useState('');

    // Load backend + localStorage entries
    useEffect(() => {
        Promise.all([
            coverLetterAPI.getAll().then(r => setLetters(r.data)),
            cvAPI.getAll().then(r => setCVs(r.data)),
        ]).finally(() => setLoading(false));

        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
            setLocalLetters(saved);
        } catch { setLocalLetters([]); }
    }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const create = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const res = await coverLetterAPI.create({ title: newTitle, cv_id: linkedCv ? +linkedCv : null });
            navigate(`/cover-letters/${res.data.id}`);
        } catch (e) { showToast('Failed to create cover letter', 'error'); }
        setCreating(false);
    };

    const del = async (id) => {
        if (!window.confirm('Delete this cover letter?')) return;
        await coverLetterAPI.delete(id);
        setLetters(prev => prev.filter(l => l.id !== id));
    };

    const delLocal = (id) => {
        if (!window.confirm('Delete this saved letter?')) return;
        const updated = localLetters.filter(l => l.id !== id);
        setLocalLetters(updated);
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
        showToast('Deleted');
    };

    const saveLocalEdit = () => {
        if (!editingLocal) return;
        const updated = localLetters.map(l => 
            l.id === editingLocal.id ? { ...l, body: localEditText } : l
        );
        setLocalLetters(updated);
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
        setEditingLocal(null);
        showToast('Saved successfully');
    };

    const exportLocalPDF = (entry) => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const margin = 22, pageW = 210, pageH = 297, usableW = pageW - margin * 2;
        let y = margin;
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10.5); pdf.setTextColor(30, 30, 30);
        for (const rawLine of (entry.body || '').split('\n')) {
            const trimmed = rawLine.trim();
            if (trimmed === '') { y += 4; continue; }
            if (trimmed.startsWith('Dear ') || trimmed.startsWith('Sincerely,')) pdf.setFont('helvetica', 'bold');
            else pdf.setFont('helvetica', 'normal');
            const wrapped = pdf.splitTextToSize(trimmed, usableW);
            for (const wl of wrapped) {
                if (y + 6 > pageH - margin) { pdf.addPage(); y = margin; }
                pdf.text(wl, margin, y); y += 5.5;
            }
            y += 1;
        }
        pdf.save(`${(entry.fileName || 'cover_letter').replace(/[^a-z0-9_]/gi, '_')}.pdf`);
    };

    // Text extractor
    const getLetterText = (content) => {
        if (typeof content === 'string') return content;
        if (content && typeof content === 'object') return content.text || '';
        return '';
    };
    const getPreview = (content) => {
        const text = getLetterText(content);
        return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    };

    const CARD = 'bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 hover:shadow-card-hover transition-shadow p-5 flex flex-col gap-3';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
                    {toast.msg}
                </div>
            )}
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Cover Letters</h1>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Create and manage your tailored cover letters</p>
                    </div>
                    <button
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 transition shadow-sm"
                    >
                        + New Cover Letter
                    </button>
                </div>

                {/* Modal */}
                {showNew && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">New Cover Letter</h2>
                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Title</label>
                                    <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && create()}
                                        placeholder="e.g. Application to Google"
                                        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Link to a CV (optional)</label>
                                    <select value={linkedCv} onChange={e => setLinkedCv(e.target.value)} className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                                        <option value="">None</option>
                                        {cvs.map(cv => <option key={cv.id} value={cv.id}>{cv.title || `CV #${cv.id}`}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
                                <button onClick={create} disabled={creating || !newTitle.trim()} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
                                    {creating ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Local Letter Modal */}
                {editingLocal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 h-[80vh] flex flex-col">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">Edit Local Cover Letter</h2>
                            <textarea
                                value={localEditText}
                                onChange={e => setLocalEditText(e.target.value)}
                                className="flex-1 w-full border border-gray-200 dark:border-slate-600 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 resize-none font-mono mb-4"
                            />
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingLocal(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
                                <button onClick={saveLocalEdit} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition">Save</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Locally Saved section ──────────────────────────────────── */}
                {localLetters.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Saved Locally</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {localLetters.map(entry => (
                                <div key={entry.id} className={CARD}>
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center text-xl flex-shrink-0">✉️</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => exportLocalPDF(entry)}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition text-xs font-medium"
                                                title="Export PDF">
                                                📄 PDF
                                            </button>
                                            <button onClick={() => {
                                                setEditingLocal(entry);
                                                setLocalEditText(entry.body || '');
                                            }}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition text-xs font-medium"
                                                title="Edit">
                                                ✏️ Edit
                                            </button>
                                            <button onClick={() => delLocal(entry.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-500 dark:text-slate-400 hover:text-red-500 transition"
                                                title="Delete">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate text-sm">{entry.fileName || 'cover_letter'}</h3>
                                        {entry.jdJobTitle && <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{entry.jdJobTitle}</p>}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-3 font-mono">{(entry.body || '').substring(0, 100)}…</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                                        <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(entry.savedAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Backend letters ──────────────────────────────────────── */}
                {(letters.length > 0 || localLetters.length === 0) && (
                    <div>
                        {localLetters.length > 0 && (
                            <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Created in Editor</h2>
                        )}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-slate-700 animate-pulse rounded-2xl" />)}
                            </div>
                        ) : letters.length === 0 && localLetters.length === 0 ? (
                            <div className="text-center py-24">
                                <div className="text-5xl mb-4">📝</div>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-1">No cover letters yet</h3>
                                <p className="text-gray-500 dark:text-slate-400 text-sm">Create your first cover letter to get started</p>
                                <button onClick={() => setShowNew(true)} className="mt-4 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">+ New Cover Letter</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {letters.map(letter => (
                                    <div key={letter.id} className={CARD}>
                                        <div className="flex items-start justify-between">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-xl">✉️</div>
                                            <div className="flex gap-1">
                                                <button onClick={() => navigate(`/cover-letters/${letter.id}/view`)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition text-xs">
                                                    👁️ View
                                                </button>
                                                <button onClick={() => navigate(`/cover-letters/${letter.id}/edit`)}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition text-xs">
                                                    ✏️ Edit
                                                </button>
                                                <button onClick={() => del(letter.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-500 dark:text-slate-400 hover:text-red-500 transition">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{letter.title}</h3>
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-3">
                                                {getPreview(letter.content) || '(Empty)'}
                                            </p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                            <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(letter.updated_at)}</span>
                                            <button onClick={() => navigate(`/cover-letters/${letter.id}`)} className="text-xs font-semibold text-primary hover:underline">
                                                View →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {/* New card */}
                                <button
                                    onClick={() => setShowNew(true)}
                                    className="h-40 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-slate-500 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition"
                                >
                                    <span className="text-3xl">+</span>
                                    <span className="text-sm font-medium">New Cover Letter</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoverLetterPage;