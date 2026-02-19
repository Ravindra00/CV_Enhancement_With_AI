import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coverLetterAPI, cvAPI } from '../services/api';

const DEFAULT_CONTENT = {
    recipient_name: '', company: '', role: '', date: '',
    opening: '', body: '', closing: '', signature: '',
};

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300';
const TEXTAREA = `${INPUT} resize-none`;
const LABEL = 'block text-xs font-semibold text-gray-600 mb-1';

function useDebounce(v, d) {
    const [val, setVal] = useState(v);
    useEffect(() => { const t = setTimeout(() => setVal(v), d); return () => clearTimeout(t); }, [v, d]);
    return val;
}

const CoverLetterEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('My Cover Letter');
    const [content, setContent] = useState(DEFAULT_CONTENT);
    const [cvData, setCvData] = useState(null);
    const [cvId, setCvId] = useState(null);
    const [allCvs, setAllCvs] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load cover letter and CVs
    useEffect(() => {
        Promise.all([
            coverLetterAPI.getOne(id).then(r => {
                const cl = r.data;
                setTitle(cl.title || 'My Cover Letter');
                setContent({ ...DEFAULT_CONTENT, ...(cl.content || {}) });
                setCvId(cl.cv_id);
            }),
            cvAPI.getAll().then(r => setAllCvs(r.data)),
        ]).catch(console.error);
    }, [id]);

    // Load linked CV data for prefill
    useEffect(() => {
        if (!cvId) { setCvData(null); return; }
        cvAPI.getOne(cvId).then(r => setCvData(r.data.parsed_data)).catch(() => setCvData(null));
    }, [cvId]);

    // Auto-save
    const debouncedContent = useDebounce(content, 1000);
    useEffect(() => {
        if (!id) return;
        setSaving(true);
        coverLetterAPI.update(id, { title, cv_id: cvId, content: debouncedContent }).then(() => {
            setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
        }).catch(() => setSaving(false));
    }, [debouncedContent, id]);

    const set = (k, v) => setContent(prev => ({ ...prev, [k]: v }));

    // Prefill from CV
    const prefill = () => {
        if (!cvData) return;
        const pi = cvData.personalInfo || {};
        setContent(prev => ({
            ...prev,
            signature: pi.name || prev.signature,
            opening: prev.opening || `Dear ${prev.recipient_name || 'Hiring Manager'},\n\nI am writing to express my interest in the ${prev.role || 'position'} at ${prev.company || 'your company'}.`,
            closing: prev.closing || `I look forward to discussing how my ${cvData.skills?.slice(0, 3).join(', ')} skills can contribute to ${prev.company || 'your team'}.\n\nThank you for your consideration.`,
        }));
    };

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const pi = cvData?.personalInfo || {};

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/cover-letters')} className="text-gray-500 hover:text-gray-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="text-base font-bold border-0 focus:outline-none bg-transparent" />
                    <span className="text-xs text-gray-400">{saving ? '⏳ Saving…' : saved ? '✓ Saved' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                    {cvId && <button onClick={prefill} className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-200 transition">✨ Prefill from CV</button>}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Form */}
                <div className="w-[400px] flex-shrink-0 overflow-y-auto bg-white border-r border-gray-200 p-4 space-y-4">
                    {/* Link CV */}
                    <div>
                        <label className={LABEL}>Link to CV</label>
                        <select value={cvId || ''} onChange={e => setCvId(e.target.value ? +e.target.value : null)} className={INPUT}>
                            <option value="">None</option>
                            {allCvs.map(cv => <option key={cv.id} value={cv.id}>{cv.title || `CV #${cv.id}`}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={LABEL}>Recipient Name</label><input className={INPUT} value={content.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Hiring Manager" /></div>
                        <div><label className={LABEL}>Date</label><input type="date" className={INPUT} value={content.date || new Date().toISOString().slice(0, 10)} onChange={e => set('date', e.target.value)} /></div>
                        <div><label className={LABEL}>Company</label><input className={INPUT} value={content.company} onChange={e => set('company', e.target.value)} placeholder="Google" /></div>
                        <div><label className={LABEL}>Position / Role</label><input className={INPUT} value={content.role} onChange={e => set('role', e.target.value)} placeholder="Software Engineer" /></div>
                    </div>

                    <div><label className={LABEL}>Opening Paragraph</label><textarea className={TEXTAREA} rows={4} value={content.opening} onChange={e => set('opening', e.target.value)} placeholder="Dear Hiring Manager, I am writing to…" /></div>
                    <div><label className={LABEL}>Body</label><textarea className={TEXTAREA} rows={7} value={content.body} onChange={e => set('body', e.target.value)} placeholder="In my current role at…" /></div>
                    <div><label className={LABEL}>Closing Paragraph</label><textarea className={TEXTAREA} rows={3} value={content.closing} onChange={e => set('closing', e.target.value)} placeholder="I look forward to hearing from you…" /></div>
                    <div><label className={LABEL}>Your Name (Signature)</label><input className={INPUT} value={content.signature} onChange={e => set('signature', e.target.value)} placeholder={pi.name || 'Your Name'} /></div>
                </div>

                {/* Right: Letter preview */}
                <div className="flex-1 overflow-y-auto bg-gray-100 flex items-start justify-center py-10 px-6">
                    <div className="bg-white shadow-xl rounded-sm w-[620px] min-h-[877px] p-14 font-serif text-[13px] leading-relaxed text-gray-800">
                        {/* Sender info */}
                        {pi.name && (
                            <div className="mb-6 text-xs text-gray-500">
                                <div className="font-semibold text-gray-800">{pi.name}</div>
                                {pi.email && <div>{pi.email}</div>}
                                {pi.phone && <div>{pi.phone}</div>}
                                {pi.location && <div>{pi.location}</div>}
                            </div>
                        )}
                        <div className="text-xs text-gray-500 mb-6">{content.date ? new Date(content.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : today}</div>
                        {(content.company || content.recipient_name) && (
                            <div className="mb-6 text-sm">
                                {content.recipient_name && <div>{content.recipient_name}</div>}
                                {content.company && <div className="font-semibold">{content.company}</div>}
                            </div>
                        )}
                        {content.role && <div className="font-semibold text-sm mb-4">Re: Application for {content.role}</div>}
                        {content.opening && <p className="mb-4 whitespace-pre-line">{content.opening}</p>}
                        {content.body && <p className="mb-4 whitespace-pre-line">{content.body}</p>}
                        {content.closing && <p className="mb-6 whitespace-pre-line">{content.closing}</p>}
                        <div className="mt-8">
                            <div className="text-sm">{content.signature || pi.name || 'Your Name'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverLetterEditorPage;
