import React, { useState, useLayoutEffect, useRef } from 'react';


const Icons = {
  Email: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>,
  Location: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
  LinkedIn: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-1.85 0-2.59 1.05-2.92 1.62v-1.46h-2.77v8.4h2.77v-4.62c0-1.22.25-2.31 1.62-2.31 1.34 0 1.37 1.28 1.37 2.38v4.55h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.4H5.5v8.4h2.77z"/></svg>,
  Website: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>,
  Profile: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm3 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-3 6h6v2H6v-2zm8-6h4v2h-4V8zm0 4h4v2h-4v-2z"/></svg>,
  Experience: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>,
  Education: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm6.83 5.37L12 11.23l-6.83-2.86L12 5.5l6.83 2.87zM5 13.18v2.81c0 .73.5 1.41 1.25 1.63 1.69.5 3.52.88 5.75.88s4.06-.38 5.75-.88c.75-.22 1.25-.9 1.25-1.63v-2.81l-7 3.82-7-3.82z"/></svg>,
  Skills: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.1L7.5 4.7 9.8 7l-2.3 2.3-2.3-2.3L2.3 9.9C1 12.3 1.4 15.3 3.4 17.3c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l1.9-1.9c.4-.4.4-1 0-1.4z"/></svg>,
  Languages: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.09 13.36 4 12.69 4 12s.09-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.34.16-2h4.68c.09.66.16 1.32.16 2s-.07 1.34-.16 2zm1.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.24 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.17.64.26 1.31.26 2s-.09 1.36-.26 2h-3.38z"/></svg>,
  Projects: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  Certifications: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>,
  Interests: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
};

/* ───────────────────────────────────────────────────────────────
   CVPreview — A4 live preview with dynamic themes & paging
   Props:
     data             — parsed CV data
     theme            — full theme object
     scale            — canvas scale (default 1)
     highlightKeywords — string[] — words to highlight in preview
─────────────────────────────────────────────────────────────── */

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';

const DEFAULT_THEME = {
    primaryColor: '#2563eb',
    fontFamily: 'Georgia, "Times New Roman", serif',
    layout: 'clean',
    accentStyle: 'line',
    pageMargin: 56,
    sectionSpacing: 20,
    columnSplit: 32,
    sectionOrder: [],
    hiddenSections: [],
};

const DEFAULT_SECTION_ORDER = [
    'summary', 'experience', 'education', 'skills', 'languages', 'projects', 'certifications', 'interests', 'custom'
];

/* ─── Language detection ─── */
const GERMAN_MARKERS = [
    'erfahrung', 'kenntnisse', 'fähigkeiten', 'verantwortlich',
    'unternehmen', 'tätigkeiten', 'entwicklung', 'aufgaben',
    'bereich', 'mittels', 'wurden', 'wurde', 'haben',
    'leitung', 'planung', 'umsetzung', 'werkzeug', 'arbeit',
    'softwareentwickler', 'ingenieur', 'datenbankadministrator',
];

const detectGerman = (data) => {
    const pi = data.personal_info || {};
    let sample = '';
    sample += (pi.title || pi.jobTitle || '') + ' ';
    sample += (pi.summary || data.profile_summary || '').substring(0, 400) + ' ';
    const exps = data.experiences || data.experience || [];
    exps.slice(0, 2).forEach(e => { sample += (e.description || '').substring(0, 200) + ' '; });
    sample = sample.toLowerCase();
    const score = GERMAN_MARKERS.filter(w => sample.includes(w)).length;
    return score >= 2;
};

const LABELS_EN = {
    profile: 'Profile', experience: 'Professional Experience', education: 'Education',
    skills: 'Skills', languages: 'Languages', interests: 'Interests',
    projects: 'Projects', certifications: 'Certifications',
};
const LABELS_DE = {
    profile: 'Profil', experience: 'Berufserfahrung', education: 'Bildung',
    skills: 'Fähigkeiten', languages: 'Sprachen', interests: 'Interessen',
    projects: 'Projekte', certifications: 'Zertifikate',
};

/* ─── Photo size / shape helpers ─── */
const PHOTO_SIZE_MAP = { small: 60, medium: 80, large: 104 };

/* ─── helpers ─── */
const rgba = (hex, a) => {
    if (!hex || hex.length < 7) return `rgba(0,0,0,${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
};

/** Resolve photo URL */
const resolvePhoto = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('/uploads/') || photo.startsWith('uploads/')) {
        return `${API_BASE}/${photo.replace(/^\//, '')}`;
    }
    return photo;
};

/** Flatten skills to name array */
const flattenSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
        return skills.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean);
    }
    if (typeof skills === 'object') {
        return Object.entries(skills).flatMap(([, v]) =>
            Array.isArray(v) ? v.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean) : []
        );
    }
    return [];
};

/** Group skills by category → [{category, names[]}] */
const groupSkillsByCategory = (skills) => {
    if (!skills || !Array.isArray(skills)) return null;
    const groups = new Map();
    for (const s of skills) {
        const cat = (typeof s === 'string' ? '' : s?.category) || '';
        const name = typeof s === 'string' ? s : s?.name || '';
        if (!name) continue;
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(name);
    }
    return groups.size > 0 ? groups : null;
};

/* ─── Rich text renderer: **bold** _italic_ • bullet ─── */
function parseRichText(text, highlightWords = []) {
    if (!text) return null;
    const hlSet = new Set((highlightWords || []).map(w => w.toLowerCase()));

    const renderSpan = (chunk, key) => {
        if (chunk.type === 'bold') return <strong key={key}>{renderInline(chunk.content, key, hlSet)}</strong>;
        if (chunk.type === 'italic') return <em key={key}>{renderInline(chunk.content, key, hlSet)}</em>;
        return <span key={key}>{highlightText(chunk.content, hlSet)}</span>;
    };

    const renderInline = (str, key, hl) => {
        if (hl.size === 0) return str;
        return highlightText(str, hl);
    };

    return text.split('\n').map((line, li) => {
        const trimmed = line.trimStart();
        if (!trimmed) return null;
        const isBullet = /^[•\-*–]\s*/.test(trimmed);
        const content = trimmed.replace(/^[•\-*–]\s*/, '');
        if (!content.trim()) return null;
        const chunks = parseInline(content);

        return (
            <div key={li} style={{ display: 'flex', gap: 5, marginBottom: 2, alignItems: 'flex-start' }}>
                {isBullet && <span style={{ color: '#666', flexShrink: 0, marginTop: 1, lineHeight: '1.6' }}>•</span>}
                <span style={{ lineHeight: '1.6' }}>{chunks.map((c, ci) => renderSpan(c, `${li}-${ci}`))}</span>
            </div>
        );
    }).filter(Boolean);
}

function parseInline(text) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '*' && text[i + 1] === '*') {
            const end = text.indexOf('**', i + 2);
            if (end !== -1) { chunks.push({ type: 'bold', content: text.slice(i + 2, end) }); i = end + 2; continue; }
        }
        if (text[i] === '_') {
            const end = text.indexOf('_', i + 1);
            if (end !== -1) { chunks.push({ type: 'italic', content: text.slice(i + 1, end) }); i = end + 1; continue; }
        }
        let plain = '';
        while (i < text.length && !(text[i] === '*' && text[i + 1] === '*') && text[i] !== '_') {
            plain += text[i++];
        }
        if (plain) chunks.push({ type: 'plain', content: plain });
    }
    return chunks;
}

function highlightText(text, hlSet) {
    if (!hlSet || hlSet.size === 0) return text;
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
        const clean = word.replace(/[^a-z0-9]/gi, '').toLowerCase();
        if (clean && hlSet.has(clean)) {
            return <mark key={i} style={{ background: 'rgba(251,191,36,0.4)', borderRadius: 2, padding: '0 1px', color: 'inherit' }}>{word}</mark>;
        }
        return word;
    });
}

/* ═══════════════════════════════════════════════════════════════
   A4 Pagination Engine
═══════════════════════════════════════════════════════════════ */
const A4_HEIGHT = 1123;
const A4_WIDTH = 794;

const PagedLayout = ({ blocks, pageMargin, theme }) => {
    const [pages, setPages] = useState([]);
    const [measuredBlocks, setMeasuredBlocks] = useState([]);
    const measureRef = useRef(null);

    useLayoutEffect(() => {
        if (blocks !== measuredBlocks) {
            setPages([]);
            setMeasuredBlocks(blocks);
            return;
        }

        if (pages.length === 0 && measureRef.current) {
            const pageHeight = A4_HEIGHT - (pageMargin * 2) - 10;
            const newPages = [];
            let currentPage = [];
            let currentH = 0;

            const children = Array.from(measureRef.current.children);
            children.forEach((child, index) => {
                const h = child.getBoundingClientRect().height;
                const style = window.getComputedStyle(child);
                const mt = parseFloat(style.marginTop) || 0;
                const mb = parseFloat(style.marginBottom) || 0;
                const totalH = h + mt + mb;

                if (currentH + totalH > pageHeight && currentPage.length > 0) {
                    newPages.push(currentPage);
                    currentPage = [];
                    currentH = 0;
                }
                currentPage.push(blocks[index]);
                currentH += totalH;
            });

            if (currentPage.length > 0) {
                newPages.push(currentPage);
            }
            setPages(newPages);
        }
    }, [blocks, measuredBlocks, pages.length, pageMargin]);

    if (pages.length === 0) {
        return (
            <div style={{ position: 'absolute', top: -9999, left: -9999, width: A4_WIDTH, padding: `${pageMargin + 8}px ${pageMargin + 12}px ${pageMargin}px`, fontFamily: theme.fontFamily, fontSize: 14, lineHeight: '1.8' }}>
                <div ref={measureRef}>
                    {blocks.map((b, i) => React.isValidElement(b) ? React.cloneElement(b, { key: `measure-${i}` }) : b)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', width: '100%', background: 'transparent' }}>
            {pages.map((pageBlocks, i) => (
                <div key={i} style={{ 
                    width: A4_WIDTH, 
                    height: A4_HEIGHT, 
                    backgroundColor: 'white', 
                    padding: `${pageMargin + 8}px ${pageMargin + 12}px ${pageMargin}px`,
                    fontFamily: theme.fontFamily, 
                    fontSize: 14, 
                    lineHeight: '1.8', 
                    color: '#1a1a1a',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {pageBlocks}
                </div>
            ))}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Main CVPreview component
═══════════════════════════════════════════════════════════════ */
const CVPreview = ({ data = {}, theme: themeProp = {}, scale = 1, highlightKeywords = [] }) => {
    const theme = { ...DEFAULT_THEME, ...themeProp };
    const primary = theme.primaryColor;
    const primaryLight = rgba(primary, 0.1);
    const primaryBorder = rgba(primary, 0.25);
    const accentStyle = theme.accentStyle || 'line';
    const pageMargin = theme.pageMargin ?? 28;
    const sectionSpacing = theme.sectionSpacing ?? 14;
    const columnSplit = theme.columnSplit ?? 32;
    const hlWords = highlightKeywords || [];

    const pi = data.personal_info || {};
    const photo = resolvePhoto(pi.photo || data.photo_path);
    const experiences = data.experiences || [];
    const education = data.educations || [];
    const rawSkills = data.skills;
    const skills = flattenSkills(rawSkills);
    const skillGroups = groupSkillsByCategory(rawSkills);
    const certs = data.certifications || [];
    const langs = data.languages || [];
    const projects = data.projects || [];
    const interests = data.interests || [];
    const hobbies = data.hobbies || data.hobbies_text || '';
    const customSections = data.custom_sections || [];
    const summary = pi.summary || data.profile_summary || '';
    const name = pi.name || data.full_name || '';
    const jobTitle = pi.title || pi.jobTitle || data.title || '';
    const email = pi.email || data.email || '';
    const phone = pi.phone || data.phone || '';
    const location = pi.location || data.location || '';
    const linkedin = pi.linkedin || pi.linkedin_url || data.linkedin_url || '';
    const website = pi.website || '';

    const isGerman = detectGerman(data);
    const L = isGerman ? LABELS_DE : LABELS_EN;
    const currentLabel = isGerman ? 'Heute' : 'Present';

    const photoSizePx = typeof pi.photoSize === 'number'
        ? pi.photoSize
        : (PHOTO_SIZE_MAP[pi.photoSize] || 80);
    const photoRadius = pi.photoShape === 'square' ? '6px' : '50%';

    const rawOrder = theme.sectionOrder?.length ? theme.sectionOrder : DEFAULT_SECTION_ORDER;
    const hiddenSet = new Set(theme.hiddenSections || []);
    const sectionOrder = rawOrder.filter(k => !hiddenSet.has(k));

    /* ─── Shared section title component ─── */
    const SectionHeader = ({ label, forceStyle }) => {
        const style = forceStyle || accentStyle;
        if (style === 'badge') {
            return (
                <div style={{ marginBottom: 8, marginTop: 2 }}>
                    <span style={{ background: primary, color: '#fff', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 10px', borderRadius: 3 }}>{label}</span>
                </div>
            );
        }
        if (style === 'dot') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, marginTop: 2 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: primary, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: primary }}>{label}</span>
                    <div style={{ flex: 1, height: 1, background: rgba(primary, 0.25) }} />
                </div>
            );
        }
        if (style === 'clean') {
            // flowcv.com-style: bold uppercase + thin gray hairline, no color
            return (
                <div style={{ marginBottom: 7, marginTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#111' }}>{label}</span>
                    <div style={{ height: 1, background: '#d1d5db', marginTop: 4 }} />
                </div>
            );
        }
        // default: line — colored 2px bar
        return (
            <div style={{ marginBottom: 8, marginTop: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#111' }}>{label}</span>
                <div style={{ height: 2, background: primary, marginTop: 3, borderRadius: 1 }} />
            </div>
        );
    };

    /* ─── Skills renderer ─── */
    const renderSkills = ({ compact = false, inSidebar = false } = {}) => {
        if (skillGroups) {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: inSidebar ? '1fr' : '1fr 1fr', gap: '10px 24px' }}>
                    {Array.from(skillGroups.entries()).map(([cat, names], ci) => (
                        <div key={ci} style={{ marginBottom: 2 }}>
                            {cat && (
                                <div style={{ fontSize: 11.5, fontWeight: 800, color: inSidebar ? 'rgba(255,255,255,0.9)' : '#111', marginBottom: 2 }}>{cat}</div>
                            )}
                            <div style={{ fontSize: 11.5, color: inSidebar ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: '1.6' }}>
                                {names.join(', ')}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div style={{ fontSize: 11.5, color: inSidebar ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: '1.6' }}>
                {skills.join(', ')}
            </div>
        );
    };

    /* ─── Section renderer (reusable) ─── */
    const renderSection = (key, opts = {}) => {
        const { mar = sectionSpacing } = opts;

        if (key === 'summary' && summary) {
            return (
                <div key="summary" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.profile} />
                    <p style={{ margin: 0, color: '#374151', lineHeight: '1.75', fontSize: 12 }}>
                        {hlWords.length > 0 ? highlightText(summary, new Set(hlWords.map(w => w.toLowerCase()))) : summary}
                    </p>
                </div>
            );
        }

        if (key === 'experience' && experiences.length > 0) {
            return (
                <div key="experience" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.experience} />
                    {experiences.map((exp, i) => {
                        const dateStr = [exp.startDate, exp.current ? currentLabel : exp.endDate].filter(Boolean).join(' – ');
                        return (
                            <div key={i} style={{ marginBottom: 11 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', lineHeight: '1.45' }}>
                                            {exp.role || exp.position || exp.job_title || '—'}
                                            {exp.company && <span style={{ fontWeight: 600, color: '#374151' }}>, {exp.company}</span>}
                                        </div>
                                        {exp.location && (
                                            <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 1 }}>{exp.location}</div>
                                        )}
                                    </div>
                                    {dateStr && (
                                        <div style={{ fontSize: 10.5, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>{dateStr}</div>
                                    )}
                                </div>
                                {exp.description && (
                                    <div style={{ marginTop: 4, fontSize: 11.5, color: '#374151' }}>
                                        {parseRichText(exp.description, hlWords)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (key === 'education' && education.length > 0) {
            return (
                <div key="education" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.education} />
                    {education.map((edu, i) => {
                        const dateStr = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
                        return (
                            <div key={i} className="cv-breakable" style={{ marginBottom: 9 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', lineHeight: '1.45' }}>
                                            {edu.degree}
                                            {edu.field && <span style={{ fontWeight: 400 }}> – {edu.field}</span>}
                                        </div>
                                        {edu.institution && (
                                            <div style={{ fontSize: 11.5, color: '#374151', marginTop: 1 }}>{edu.institution}</div>
                                        )}
                                        {edu.grade && (
                                            <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 1 }}>GPA / Grade: {edu.grade}</div>
                                        )}
                                    </div>
                                    {dateStr && (
                                        <div style={{ fontSize: 10.5, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>{dateStr}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (key === 'skills' && (skills.length > 0 || skillGroups)) {
            return (
                <div key="skills" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.skills} />
                    {renderSkills()}
                </div>
            );
        }

        if (key === 'languages' && langs.length > 0) {
            return (
                <div key="languages"  style={{ marginBottom: mar }}>
                    <SectionHeader label={L.languages} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 8px' }}>
                        {langs.map((l, i) => (
                            <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{l.language}</span>
                                <span style={{ fontSize: 10.5, color: '#6b7280' }}>{l.proficiency}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (key === 'interests' && (interests.length > 0 || hobbies)) {
            return (
                <div key="interests" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.interests} />
                    {interests.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px' }}>
                            {interests.map((interest, i) => {
                                const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                return txt ? <span key={i} style={{ fontSize: 11.5, color: '#374151' }}>• {txt}</span> : null;
                            })}
                        </div>
                    ) : <p style={{ margin: 0, color: '#374151', fontSize: 11.5 }}>{hobbies}</p>}
                </div>
            );
        }

        if (key === 'projects' && projects.length > 0) {
            return (
                <div key="projects" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.projects} />
                    {projects.map((p, i) => (
                        <div key={i} className="cv-breakable" style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#111' }}>{p.name}</span>
                                {(p.link || p.url) && <span style={{ fontSize: 10, color: '#6b7280' }}>{p.link || p.url}</span>}
                            </div>
                            {p.description && <div style={{ fontSize: 11.5, color: '#374151', marginTop: 3 }}>{parseRichText(p.description, hlWords)}</div>}
                        </div>
                    ))}
                </div>
            );
        }

        if (key === 'certifications' && certs.length > 0) {
            return (
                <div key="certifications" style={{ marginBottom: mar }}>
                    <SectionHeader label={L.certifications} />
                    {certs.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, gap: 8 }}>
                            <div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{c.name}</span>
                                {c.issuer && <span style={{ fontSize: 11.5, color: '#6b7280' }}> — {c.issuer}</span>}
                            </div>
                            <span style={{ fontSize: 10.5, color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.issueDate || c.date || ''}</span>
                        </div>
                    ))}
                </div>
            );
        }

        if (key === 'custom') {
            const visible = customSections.filter(cs => cs.title && (cs.content || (Array.isArray(cs.items) && cs.items.length > 0)));
            if (!visible.length) return null;
            return (
                <React.Fragment key="custom">
                    {visible.map((cs, i) => {
                        const displayContent = cs.content ||
                            (Array.isArray(cs.items) ? cs.items.map(it => `• ${it}`).join('\n') : '');
                        return (
                            <div key={i} style={{ marginBottom: mar }}>
                                <SectionHeader label={cs.title} />
                                <div style={{ fontSize: 11.5, color: '#374151', lineHeight: '1.7' }}>
                                    {parseRichText(displayContent, hlWords)}
                                </div>
                            </div>
                        );
                    })}
                </React.Fragment>
            );
        }

        return null;
    };

    /* ═══════════════════════════════════════════════════════
       ATS-Safe layout — plain black & white, no visuals
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'ats') {
        const ATSSecHeader = ({ label }) => (
            <div style={{ marginBottom: 6, marginTop: 2, borderBottom: '1.5px solid #222', paddingBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000' }}>{label}</span>
            </div>
        );
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, lineHeight: '1.6', color: '#000', background: 'white', padding: `${pageMargin + 8}px ${pageMargin + 12}px` }}>
                {/* Header */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, margin: '0 0 2px' }}>{name || 'Your Name'}</div>
                    {jobTitle && <div style={{ fontSize: 13, margin: '0 0 5px', color: '#333' }}>{jobTitle}</div>}
                    <div style={{ fontSize: 10.5, color: '#333', lineHeight: '1.65' }}>
                        {[email, phone, location, linkedin, website].filter(Boolean).join('  |  ')}
                    </div>
                </div>
                <div style={{ height: 1.5, background: '#000', marginBottom: 12 }} />

                {sectionOrder.map(key => {
                    if (key === 'summary' && summary) return (
                        <div key="summary" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.profile} />
                            <p style={{ margin: 0, lineHeight: '1.65', fontSize: 12 }}>{summary}</p>
                        </div>
                    );
                    if (key === 'experience' && experiences.length > 0) return (
                        <div key="experience" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.experience} />
                            {experiences.map((exp, i) => (
                                <div key={i} className="cv-breakable" style={{ marginBottom: 9 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{exp.role || exp.position || '—'}{exp.company ? `, ${exp.company}` : ''}</span>
                                        <span style={{ fontSize: 10.5 }}>{exp.startDate}{exp.startDate && (exp.endDate || exp.current) ? ' – ' : ''}{exp.current ? currentLabel : exp.endDate}</span>
                                    </div>
                                    {exp.location && <div style={{ fontSize: 10.5, color: '#444' }}>{exp.location}</div>}
                                    {exp.description && (
                                        <div style={{ marginTop: 3, fontSize: 11.5 }}>
                                            {exp.description.split('\n').filter(Boolean).map((line, j) => (
                                                <div key={j}>- {line.replace(/^[•\-]\s*/, '')}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                    if (key === 'education' && education.length > 0) return (
                        <div key="education" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.education} />
                            {education.map((edu, i) => (
                                <div key={i} style={{ marginBottom: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{edu.degree}{edu.field ? `, ${edu.field}` : ''}</span>
                                        <span style={{ fontSize: 10.5 }}>{edu.startDate}{edu.startDate && edu.endDate ? ' – ' : ''}{edu.endDate}</span>
                                    </div>
                                    {edu.institution && <div style={{ fontSize: 11.5 }}>{edu.institution}</div>}
                                    {edu.grade && <div style={{ fontSize: 10.5 }}>Grade: {edu.grade}</div>}
                                </div>
                            ))}
                        </div>
                    );
                    if (key === 'skills' && skills.length > 0) return (
                        <div key="skills" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.skills} />
                            <div style={{ fontSize: 12 }}>{skills.join(', ')}</div>
                        </div>
                    );
                    if (key === 'languages' && langs.length > 0) return (
                        <div key="languages"  style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.languages} />
                            {langs.map((l, i) => <div key={i} style={{ fontSize: 12 }}>{l.language}: {l.proficiency}</div>)}
                        </div>
                    );
                    if (key === 'certifications' && certs.length > 0) return (
                        <div key="certifications" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.certifications} />
                            {certs.map((c, i) => <div key={i} style={{ fontSize: 12 }}>{c.name}{c.issuer ? ` - ${c.issuer}` : ''}{c.issueDate ? ` (${c.issueDate})` : ''}</div>)}
                        </div>
                    );
                    if (key === 'projects' && projects.length > 0) return (
                        <div key="projects" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.projects} />
                            {projects.map((p, i) => (
                                <div key={i} style={{ marginBottom: 5 }}>
                                    <span style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</span>
                                    {p.link && <span style={{ fontSize: 10.5 }}> ({p.link})</span>}
                                    {p.description && <div style={{ fontSize: 11.5 }}>{p.description}</div>}
                                </div>
                            ))}
                        </div>
                    );
                    if (key === 'interests' && (interests.length > 0 || hobbies)) return (
                        <div key="interests" style={{ marginBottom: sectionSpacing }}>
                            <ATSSecHeader label={L.interests} />
                            <div style={{ fontSize: 12 }}>{interests.map(i => typeof i === 'string' ? i : i?.name || '').filter(Boolean).join(', ') || hobbies}</div>
                        </div>
                    );
                    if (key === 'custom') {
                        const vis = customSections.filter(cs => cs.title && (cs.content || (Array.isArray(cs.items) && cs.items.length > 0)));
                        if (!vis.length) return null;
                        return <React.Fragment key="custom">{vis.map((cs, i) => {
                            const dc = cs.content || (Array.isArray(cs.items) ? cs.items.map(it => `• ${it}`).join('\n') : '');
                            return (
                                <div key={i} style={{ marginBottom: sectionSpacing }}>
                                    <ATSSecHeader label={cs.title} />
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>{dc}</p>
                                </div>
                            );
                        })}</React.Fragment>;
                    }
                    return null;
                })}
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       CLASSIC layout — matching the sample image:
       Header: photo left + name/headline/summary + contact row
       Body: thin left sidebar (contact chip strip) + wide right main
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'classic' || !['clean', 'twotone', 'elegant', 'tech', 'modern', 'executive', 'minimal', 'ats'].includes(theme.layout)) {
        const sideW = Math.round(794 * columnSplit / 100);
        const mainW = 794 - sideW;

        const contactItems = [
            location && { icon: '📍', val: location },
            phone && { icon: '✆', val: phone },
            email && { icon: '✉', val: email },
            linkedin && { icon: 'in', val: linkedin },
            website && { icon: '🔗', val: website },
        ].filter(Boolean);

        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 12, lineHeight: '1.6', color: '#1a1a1a', background: 'white' }}>
                {/* ── TOP HEADER BAND ── */}
                <div style={{ background: primary, padding: `${pageMargin}px ${pageMargin}px ${pageMargin - 8}px`, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {photo && (
                        <img src={photo} alt="Profile"
                            style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', flexShrink: 0, border: '3px solid rgba(255,255,255,0.5)', marginTop: 2 }} />
                    )}
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 4px', color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                            {name || 'Your Name'}
                        </h1>
                        {jobTitle && (
                            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 400, marginBottom: 8 }}>{jobTitle}</div>
                        )}
                        {summary && (
                            <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.82)', lineHeight: '1.7', maxWidth: 460 }}>{summary}</p>
                        )}
                    </div>
                </div>

                {/* ── CONTACT STRIP ── */}
                <div style={{ background: rgba(primary, 0.08), borderBottom: `1px solid ${rgba(primary, 0.18)}`, padding: `7px ${pageMargin}px`, display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                    {contactItems.map((c, i) => (
                        <span key={i} style={{ fontSize: 10.5, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12 }}>{c.icon}</span>{c.val}
                        </span>
                    ))}
                </div>

                {/* ── BODY: sidebar left + main right ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    {/* Sidebar */}
                    <div style={{ width: sideW, flexShrink: 0, padding: `${pageMargin}px ${pageMargin - 8}px ${pageMargin}px ${pageMargin}px`, borderRight: `1px solid #e5e7eb` }}>
                        {/* Skills in sidebar */}
                        {(skills.length > 0 || skillGroups) && (
                            <div style={{ marginBottom: sectionSpacing }}>
                                <SectionHeader label={L.skills} />
                                {renderSkills({ inSidebar: false })}
                            </div>
                        )}
                        {/* Languages in sidebar */}
                        {langs.length > 0 && (
                            <div style={{ marginBottom: sectionSpacing }}>
                                <SectionHeader label={L.languages} />
                                {langs.map((l, i) => (
                                    <div key={i} style={{ marginBottom: 3 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{l.language}</span>
                                        <div style={{ fontSize: 10.5, color: '#6b7280' }}>{l.proficiency}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Interests in sidebar */}
                        {(interests.length > 0 || hobbies) && (
                            <div style={{ marginBottom: sectionSpacing }}>
                                <SectionHeader label={L.interests} />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    {interests.map((interest, i) => {
                                        const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                        return txt ? (
                                            <span key={i} style={{ background: primaryLight, border: `1px solid ${primaryBorder}`, color: primary, borderRadius: 10, padding: '1px 8px', fontSize: 10.5, fontWeight: 500 }}>{txt}</span>
                                        ) : null;
                                    })}
                                    {hobbies && !interests.length && <span style={{ fontSize: 11.5, color: '#374151' }}>{hobbies}</span>}
                                </div>
                            </div>
                        )}
                        {/* Certifications in sidebar */}
                        {certs.length > 0 && (
                            <div style={{ marginBottom: sectionSpacing }}>
                                <SectionHeader label={L.certifications} />
                                {certs.map((c, i) => (
                                    <div key={i} style={{ marginBottom: 5 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#111', lineHeight: '1.45' }}>{c.name}</div>
                                        {c.issuer && <div style={{ fontSize: 10, color: '#6b7280' }}>{c.issuer}</div>}
                                        {(c.issueDate || c.date) && <div style={{ fontSize: 10, color: '#6b7280' }}>{c.issueDate || c.date}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Education in sidebar */}
                        {education.length > 0 && (
                            <div style={{ marginBottom: sectionSpacing }}>
                                <SectionHeader label={L.education} />
                                {education.map((edu, i) => (
                                    <div key={i} className="cv-breakable" style={{ marginBottom: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: '1.45' }}>
                                            {edu.degree}{edu.field ? ` – ${edu.field}` : ''}
                                        </div>
                                        {edu.institution && <div style={{ fontSize: 10.5, color: '#374151', marginTop: 1 }}>{edu.institution}</div>}
                                        {(edu.startDate || edu.endDate) && (
                                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                                                {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                                            </div>
                                        )}
                                        {edu.grade && <div style={{ fontSize: 10, color: '#6b7280' }}>GPA: {edu.grade}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, padding: `${pageMargin}px ${pageMargin}px ${pageMargin}px ${pageMargin - 4}px` }}>
                        {sectionOrder
                            .filter(k => !['skills', 'languages', 'interests', 'certifications', 'education'].includes(k))
                            .map(key => renderSection(key))}
                    </div>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       CLEAN layout — flowcv.com-style:
       Single column, name/title/contact header, thick black
       hairlines under section titles, highly professional typography.
    ═══════════════════════════════════════════════════════ */
    if (['clean', 'twotone', 'elegant', 'tech'].includes(theme.layout)) {
        const CleanSecHeader = ({ label }) => {
            return (
                <div style={{ marginBottom: 14, marginTop: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#111', marginBottom: 6 }}>
                        {label}
                    </div>
                    <div style={{ height: 2, background: '#111' }} />
                </div>
            );
        };

        const renderCleanSectionBlocks = (key) => {
            const mar = sectionSpacing + 4;
            if (key === 'summary' && summary) {
                return [
                    <div key="summary-hdr"><CleanSecHeader label={L.profile} /></div>,
                    <div key="summary-content" style={{ marginBottom: mar }}>
                        <p style={{ margin: 0, color: '#222', lineHeight: '1.8', fontSize: 14 }}>
                            {hlWords.length > 0 ? highlightText(summary, new Set(hlWords.map(w => w.toLowerCase()))) : summary}
                        </p>
                    </div>
                ];
            }
            if (key === 'experience' && experiences.length > 0) {
                return [
                    <div key="exp-hdr"><CleanSecHeader label={L.experience} /></div>,
                    ...experiences.map((exp, i) => {
                        const dateStr = [exp.startDate, exp.current ? currentLabel : exp.endDate].filter(Boolean).join(' – ');
                        return (
                            <div key={`exp-${i}`} className="cv-breakable" style={{ marginBottom: i === experiences.length - 1 ? mar : 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#111' }}>
                                            {exp.role || exp.position || exp.job_title || '—'}
                                        </span>
                                        {exp.company && <span style={{ fontSize: 14.5, fontWeight: 500, color: '#333' }}>, {exp.company}</span>}
                                        {exp.location && <span style={{ fontSize: 14.5, fontWeight: 400, color: '#444' }}>, {exp.location}</span>}
                                    </div>
                                    {dateStr && <span style={{ fontSize: 13.5, color: '#444', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateStr}</span>}
                                </div>
                                {exp.description && (
                                    <div style={{ marginTop: 6, fontSize: 14, color: '#222', lineHeight: '1.8' }}>
                                        {parseRichText(exp.description, hlWords)}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ];
            }
            if (key === 'education' && education.length > 0) {
                return [
                    <div key="edu-hdr"><CleanSecHeader label={L.education} /></div>,
                    ...education.map((edu, i) => {
                        const dateStr = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
                        return (
                            <div key={`edu-${i}`} className="cv-breakable" style={{ marginBottom: i === education.length - 1 ? mar : 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 14.5, fontWeight: 800, color: '#111' }}>{edu.degree}</span>
                                        {edu.field && <span style={{ fontSize: 14.5, fontWeight: 500, color: '#333' }}> – {edu.field}</span>}
                                        {edu.institution && <div style={{ fontSize: 14, color: '#444', marginTop: 2 }}>{edu.institution}</div>}
                                        {edu.grade && <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>GPA: {edu.grade}</div>}
                                    </div>
                                    {dateStr && <span style={{ fontSize: 13.5, color: '#444', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateStr}</span>}
                                </div>
                            </div>
                        );
                    })
                ];
            }
            if (key === 'skills' && (skills.length > 0 || skillGroups)) {
                return [
                    <div key="skills-hdr"><CleanSecHeader label={L.skills} /></div>,
                    <div key="skills-content" style={{ marginBottom: mar }}>{renderSkills()}</div>
                ];
            }
            if (key === 'languages' && langs.length > 0) {
                return [
                    <div key="lang-hdr"><CleanSecHeader label={L.languages} /></div>,
                    <div key="lang-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 12px', marginBottom: mar }}>
                        {langs.map((l, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{l.language}</span>
                                <span style={{ fontSize: 13.5, color: '#444' }}>{l.proficiency}</span>
                            </div>
                        ))}
                    </div>
                ];
            }
            if (key === 'interests' && (interests.length > 0 || hobbies)) {
                return [
                    <div key="int-hdr"><CleanSecHeader label={L.interests} /></div>,
                    <div key="int-content" style={{ marginBottom: mar }}>
                        {interests.length > 0
                            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
                                {interests.map((it, i) => { const t = typeof it === 'string' ? it : it?.name || ''; return t ? <span key={i} style={{ fontSize: 14, color: '#333' }}>• {t}</span> : null; })}
                            </div>
                            : <p style={{ margin: 0, fontSize: 14, color: '#333' }}>{hobbies}</p>}
                    </div>
                ];
            }
            if (key === 'projects' && projects.length > 0) {
                return [
                    <div key="proj-hdr"><CleanSecHeader label={L.projects} /></div>,
                    ...projects.map((p, i) => (
                        <div key={`proj-${i}`} className="cv-breakable" style={{ marginBottom: i === projects.length - 1 ? mar : 12 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontSize: 14.5, fontWeight: 800, color: '#111' }}>{p.name}</span>
                                {(p.link || p.url) && <span style={{ fontSize: 13, color: '#555' }}>{p.link || p.url}</span>}
                            </div>
                            {p.description && <div style={{ fontSize: 14, color: '#222', marginTop: 4, lineHeight: '1.8' }}>{parseRichText(p.description, hlWords)}</div>}
                        </div>
                    ))
                ];
            }
            if (key === 'certifications' && certs.length > 0) {
                return [
                    <div key="cert-hdr"><CleanSecHeader label={L.certifications} /></div>,
                    ...certs.map((c, i) => (
                        <div key={`cert-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: i === certs.length - 1 ? mar : 8, gap: 8 }}>
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{c.name}</span>
                                {c.issuer && <span style={{ fontSize: 14, color: '#444' }}> — {c.issuer}</span>}
                            </div>
                            <span style={{ fontSize: 13.5, color: '#444', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.issueDate || c.date || ''}</span>
                        </div>
                    ))
                ];
            }
            if (key === 'custom') {
                const vis = customSections.filter(cs => cs.title && (cs.content || (Array.isArray(cs.items) && cs.items.length > 0)));
                if (!vis.length) return [];
                return vis.flatMap((cs, i) => {
                    const dc = cs.content || (Array.isArray(cs.items) ? cs.items.map(it => `• ${it}`).join('\n') : '');
                    return [
                        <div key={`cust-hdr-${i}`}><CleanSecHeader label={cs.title} /></div>,
                        <div key={`cust-content-${i}`} style={{ fontSize: 14, color: '#222', lineHeight: '1.8', marginBottom: mar }}>
                            {parseRichText(dc, hlWords)}
                        </div>
                    ];
                });
            }
            return [];
        };

        const topHeaderBlock = (
            <div key="top-header" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 24, paddingTop: 6 }}>
                        <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.01em', color: '#111', lineHeight: 1.15 }}>{name || 'Your Name'}</h1>
                        {jobTitle && <p style={{ fontSize: 18, color: '#222', fontWeight: 600, fontStyle: 'italic', margin: '0 0 20px' }}>{jobTitle}</p>}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '10px 28px', fontSize: 13.5, color: '#111', fontWeight: 500, maxWidth: '90%' }}>
                            {email && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Email /> {email}</span>}
                            {phone && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Phone /> {phone}</span>}
                            {location && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Location /> {location}</span>}
                            {linkedin && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.LinkedIn /> {linkedin}</span>}
                            {website && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Website /> {website}</span>}
                        </div>
                    </div>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx * 1.5, height: photoSizePx * 1.5, borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid transparent' }} />}
                </div>
            </div>
        );

        const allBlocks = [topHeaderBlock, ...sectionOrder.flatMap(key => renderCleanSectionBlocks(key))].filter(Boolean);

        return <PagedLayout blocks={allBlocks} pageMargin={pageMargin} theme={theme} />;
    }

    /* ═══════════════════════════════════════════════════════
       MODERN layout: colored sidebar
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'modern') {
        const sidebarW = Math.round(794 * columnSplit / 100);
        const SideSecHeader = ({ label }) => (
            <div style={{ marginBottom: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', marginTop: 3 }} />
            </div>
        );
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 12, lineHeight: '1.6', color: '#1a1a1a', display: 'flex', background: 'white' }}>
                {/* Sidebar */}
                <div style={{ width: sidebarW, background: primary, color: 'white', padding: `${pageMargin + 4}px 16px`, flexShrink: 0 }}>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', display: 'block', margin: `0 auto ${14}px`, border: '3px solid rgba(255,255,255,0.4)' }} />}
                    <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 3px', lineHeight: 1.35, textAlign: 'center', color: '#fff' }}>{name || 'Your Name'}</h1>
                    {jobTitle && <p style={{ fontSize: 10.5, opacity: 0.8, margin: '0 0 14px', textAlign: 'center' }}>{jobTitle}</p>}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12, marginBottom: 14 }}>
                        {[email && `✉ ${email}`, phone && `✆ ${phone}`, location && `📍 ${location}`, linkedin && `in ${linkedin}`].filter(Boolean).map((c, i) => (
                            <div key={i} style={{ fontSize: 10, opacity: 0.88, marginBottom: 4, wordBreak: 'break-word' }}>{c}</div>
                        ))}
                    </div>
                    {(skills.length > 0 || skillGroups) && (
                        <div style={{ marginBottom: 14 }}>
                            <SideSecHeader label={L.skills} />
                            {renderSkills({ inSidebar: true })}
                        </div>
                    )}
                    {langs.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <SideSecHeader label={L.languages} />
                            {langs.map((l, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                    <span>{l.language}</span><span style={{ opacity: 0.7 }}>{l.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {(interests.length > 0 || hobbies) && (
                        <div style={{ marginBottom: 14 }}>
                            <SideSecHeader label={L.interests} />
                            {interests.length > 0 ? interests.map((interest, i) => {
                                const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                return txt ? <div key={i} style={{ fontSize: 10, opacity: 0.85, marginBottom: 2 }}>• {txt}</div> : null;
                            }) : <div style={{ fontSize: 10, opacity: 0.85 }}>{hobbies}</div>}
                        </div>
                    )}
                </div>
                {/* Main */}
                <div style={{ flex: 1, padding: `${pageMargin + 4}px ${pageMargin - 4}px ${pageMargin}px ${pageMargin - 8}px` }}>
                    {sectionOrder.filter(k => !['skills', 'languages', 'interests'].includes(k)).map(key => renderSection(key))}
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       EXECUTIVE layout: colored header + two-column body
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'executive') {
        const leftW = Math.round((794 - pageMargin * 2) * columnSplit / 100);
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 12, lineHeight: '1.6', color: '#1a1a1a', background: 'white' }}>
                <div style={{ background: primary, padding: '24px 32px 18px', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{name || 'Your Name'}</h1>
                            {jobTitle && <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>{jobTitle}</p>}
                        </div>
                        {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', marginTop: 10, opacity: 0.9, fontSize: 10 }}>
                        {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', padding: `${pageMargin}px ${pageMargin + 4}px ${pageMargin}px`, gap: 20 }}>
                    <div style={{ width: leftW, flexShrink: 0 }}>
                        {(skills.length > 0 || skillGroups) && <div style={{ marginBottom: sectionSpacing }}><SectionHeader label={L.skills} />{renderSkills({ compact: true })}</div>}
                        {langs.length > 0 && <div style={{ marginBottom: sectionSpacing }}><SectionHeader label={L.languages} />{langs.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 11.5 }}><span style={{ fontWeight: 600 }}>{l.language}</span><span style={{ color: '#6b7280' }}>{l.proficiency}</span></div>)}</div>}
                        {(interests.length > 0 || hobbies) && (
                            <div style={{ marginTop: sectionSpacing }}>
                                <SectionHeader label={L.interests} />
                                {interests.length > 0 ? interests.map((interest, i) => { const txt = typeof interest === 'string' ? interest : interest?.name || ''; return txt ? <div key={i} style={{ marginBottom: 2, fontSize: 11.5 }}>• {txt}</div> : null; }) : <div style={{ fontSize: 11.5 }}>{hobbies}</div>}
                            </div>
                        )}
                        {certs.length > 0 && <div style={{ marginTop: sectionSpacing }}><SectionHeader label={L.certifications} />{certs.map((c, i) => <div key={i} style={{ marginBottom: 5 }}><div style={{ fontWeight: 600, fontSize: 11.5 }}>{c.name}</div>{c.issuer && <div style={{ color: '#888', fontSize: 10.5 }}>{c.issuer}</div>}</div>)}</div>}
                    </div>
                    <div style={{ flex: 1, borderLeft: `2px solid ${rgba(primary, 0.25)}`, paddingLeft: 18 }}>
                        {sectionOrder.filter(k => !['skills', 'languages', 'interests', 'certifications'].includes(k)).map(key => renderSection(key))}
                    </div>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       MINIMAL layout
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'minimal') {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 12, lineHeight: '1.6', color: '#1a1a1a', background: 'white', padding: `${pageMargin}px ${pageMargin + 8}px ${pageMargin}px` }}>
                <div style={{ borderBottom: `2.5px solid ${primary}`, paddingBottom: 14, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, color: '#111', letterSpacing: '-0.01em' }}>{name || 'Your Name'}</h1>
                            {jobTitle && <p style={{ fontSize: 13, color: primary, fontWeight: 600, margin: '3px 0 8px' }}>{jobTitle}</p>}
                            <div style={{ display: 'flex', gap: '3px 14px', fontSize: 10.5, color: '#6b7280', flexWrap: 'wrap' }}>
                                {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}
                            </div>
                        </div>
                        {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover' }} />}
                    </div>
                </div>
                {sectionOrder.map(key => renderSection(key))}
            </div>
        );
    }

    // Fallback — render classic
    return null;
};

export default CVPreview;
