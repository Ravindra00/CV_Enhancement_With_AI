import React from 'react';

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
    primaryColor: '#1a1a1a',
    fontFamily: 'Inter, system-ui, sans-serif',
    layout: 'clean',
    accentStyle: 'line',
    pageMargin: 32,
    sectionSpacing: 12,
    columnSplit: 35,
    sectionOrder: [],
    hiddenSections: [],
};

const DEFAULT_SECTION_ORDER = [
    'summary','experience','education','skills','languages','projects','certifications','interests','custom'
];

/* ─── Language detection ─── */
const GERMAN_MARKERS = [
    'erfahrung','kenntnisse','fähigkeiten','verantwortlich',
    'unternehmen','tätigkeiten','entwicklung','aufgaben',
    'bereich','mittels','wurden','wurde','haben',
    'leitung','planung','umsetzung','werkzeug','arbeit',
    'softwareentwickler','ingenieur','datenbankadministrator',
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
    profile: 'Profile', experience: 'Experience', education: 'Education',
    skills: 'Skills', languages: 'Languages', interests: 'Interests',
    projects: 'Projects', certifications: 'Certifications',
};
const LABELS_DE = {
    profile: 'Profil', experience: 'Berufserfahrung', education: 'Bildung',
    skills: 'Fähigkeiten', languages: 'Sprachen', interests: 'Interessen',
    projects: 'Projekte', certifications: 'Zertifikate',
};

/* ─── Photo size / shape helpers ─── */
const PHOTO_SIZE_MAP = { small: 56, medium: 76, large: 100 };

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

/** Flatten skills */
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

const getSkillCategories = (skills) => {
    if (!skills || Array.isArray(skills)) return null;
    if (typeof skills === 'object' && !Array.isArray(skills)) return skills;
    return null;
};

/* ─── Rich text renderer: **bold** _italic_ • bullet ─── */
function parseRichText(text, highlightWords = []) {
    if (!text) return null;
    const hlSet = new Set((highlightWords || []).map(w => w.toLowerCase()));

    const renderSpan = (chunk, key) => {
        // Bold
        if (chunk.type === 'bold') return <strong key={key}>{renderInline(chunk.content, key, hlSet)}</strong>;
        // Italic
        if (chunk.type === 'italic') return <em key={key}>{renderInline(chunk.content, key, hlSet)}</em>;
        // Plain
        return <span key={key}>{highlightText(chunk.content, hlSet)}</span>;
    };

    const renderInline = (str, key, hl) => {
        if (hl.size === 0) return str;
        return highlightText(str, hl);
    };

    return text.split('\n').filter(line => line.trim()).map((line, li) => {
        const isBullet = /^[•\-*]\s*/.test(line.trimStart());
        const content = line.trimStart().replace(/^[•\-*]\s*/, '');
        const chunks = parseInline(content);

        return (
            <div key={li} style={{ display: 'flex', gap: 5, marginBottom: 1 }}>
                {isBullet && <span style={{ color: '#888', flexShrink: 0 }}>•</span>}
                <span>{chunks.map((c, ci) => renderSpan(c, `${li}-${ci}`))}</span>
            </div>
        );
    });
}

function parseInline(text) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '*' && text[i+1] === '*') {
            const end = text.indexOf('**', i + 2);
            if (end !== -1) {
                chunks.push({ type: 'bold', content: text.slice(i + 2, end) });
                i = end + 2;
                continue;
            }
        }
        if (text[i] === '_') {
            const end = text.indexOf('_', i + 1);
            if (end !== -1) {
                chunks.push({ type: 'italic', content: text.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
        }
        // Accumulate plain text
        let plain = '';
    while (i < text.length && !(text[i] === '*' && text[i+1] === '*') && text[i] !== '_') {
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
            return (
                <mark key={i} style={{
                    background: 'rgba(251,191,36,0.35)',
                    borderRadius: 2,
                    padding: '0 1px',
                    color: 'inherit',
                }}>
                    {word}
                </mark>
            );
        }
        return word;
    });
}

/* ─── Section title variants ─── */
const SectionTitle = ({ label, color, border, style = 'line', icon }) => {
    if (style === 'badge') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 3 }}>
                {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
                <span style={{ background: color, color: 'white', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 3 }}>{label}</span>
            </div>
        );
    }
    if (style === 'dot') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <h2 style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, margin: 0 }}>{label}</h2>
                <div style={{ flex: 1, height: 1, background: rgba(color, 0.3) }} />
            </div>
        );
    }
    // default: line
    return (
        <div style={{ marginBottom: 7, marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon && <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>}
                <h2 style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1a1a', margin: 0, whiteSpace: 'nowrap' }}>{label}</h2>
            </div>
            <div style={{ height: 1.5, background: '#1a1a1a', marginTop: 3, borderRadius: 1 }} />
        </div>
    );
};

/* ─── ATS-Safe section title (no color, no borders) ─── */
const ATSSectionTitle = ({ label }) => (
    <div style={{ marginBottom: 6, marginTop: 2, borderBottom: '1px solid #333', paddingBottom: 2 }}>
        <h2 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', margin: 0 }}>{label}</h2>
    </div>
);

/* ═══════════════════════════════════════════════════════════════
   Main CVPreview component
═══════════════════════════════════════════════════════════════ */
const CVPreview = ({ data = {}, theme: themeProp = {}, scale = 1, highlightKeywords = [] }) => {
    const theme = { ...DEFAULT_THEME, ...themeProp };
    const primary = theme.primaryColor;
    const primaryLight = rgba(primary, 0.12);
    const primaryBorder = rgba(primary, 0.3);
    const accentStyle = theme.accentStyle || 'line';
    const pageMargin = theme.pageMargin ?? 32;
    const sectionSpacing = theme.sectionSpacing ?? 12;
    const columnSplit = theme.columnSplit ?? 35; // sidebar width %
    const hlWords = highlightKeywords || [];

    const pi = data.personal_info || {};
    const photo = resolvePhoto(pi.photo || data.photo_path);
    const experiences = data.experiences || [];
    const education = data.educations || [];
    const rawSkills = data.skills;
    const skills = flattenSkills(rawSkills);
    const skillCategories = getSkillCategories(rawSkills);
    const certs = data.certifications || [];
    const langs = data.languages || [];
    const projects = data.projects || [];
    const interests = data.interests || [];
    const hobbies = data.hobbies || data.hobbies_text || '';
    const customSections = data.custom_sections || [];
    const summary = pi.summary || data.profile_summary || '';
    const name = pi.name || data.full_name || '';
    const title = pi.title || pi.jobTitle || data.title || '';
    const email = pi.email || data.email || '';
    const phone = pi.phone || data.phone || '';
    const location = pi.location || data.location || '';
    const linkedin = pi.linkedin || pi.linkedin_url || data.linkedin_url || '';
    const website = pi.website || '';

    const isGerman = detectGerman(data);
    const L = isGerman ? LABELS_DE : LABELS_EN;

    const photoSizePx = typeof pi.photoSize === 'number'
        ? pi.photoSize
        : (PHOTO_SIZE_MAP[pi.photoSize] || 76);
    const photoRadius = pi.photoShape === 'square' ? '6px' : '50%';

    // Section order & visibility
    const rawOrder = theme.sectionOrder?.length ? theme.sectionOrder : DEFAULT_SECTION_ORDER;
    const hiddenSet = new Set(theme.hiddenSections || []);
    const sectionOrder = rawOrder.filter(k => !hiddenSet.has(k));

    const sTitle = (label, icon) => <SectionTitle label={label} color={primary} border={primaryBorder} style={accentStyle} icon={icon} />;
    const SS = sectionSpacing; // shorthand

    /* ─── Skills renderer ─── */
    const renderSkills = (compact = false, inSidebar = false) => {
        const textColor = inSidebar ? 'rgba(255,255,255,0.9)' : '#374151';
        if (skillCategories) {
            return (
                <div>
                    {Object.entries(skillCategories).map(([cat, items], ci) => (
                        <div key={ci} style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 7.5, fontWeight: 700, color: inSidebar ? 'rgba(255,255,255,0.7)' : '#4b5563', marginRight: 6 }}>{cat}:</span>
                            <span style={{ fontSize: 7.5, color: textColor }}>
                                {(Array.isArray(items) ? items : []).map(s => typeof s === 'string' ? s : s?.name || '').filter(Boolean).join(' · ')}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        if (compact) {
            return <div style={{ fontSize: 8, color: textColor, lineHeight: '16px' }}>{skills.join(' · ')}</div>;
        }
        if (inSidebar) {
            return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {skills.map((s, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '1px 6px', fontSize: 7.5 }}>{s}</span>
                    ))}
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {skills.map((s, i) => (
                    <span key={i} style={{ background: primaryLight, color: primary, border: `1px solid ${primaryBorder}`, borderRadius: 10, padding: '1px 8px', fontSize: 7.5, fontWeight: 500 }}>{s}</span>
                ))}
            </div>
        );
    };

    /* ─── Section renderer (ordered) ─── */
    const renderSection = (key, opts = {}) => {
        const { isGerman: de = isGerman, mar = SS } = opts;
        const currentLabel = de ? 'Heute' : 'Present';

        if (key === 'summary' && summary) {
            return (
                <div key="summary" style={{ marginBottom: mar }}>
                    {sTitle(L.profile, '👤')}
                    <p style={{ margin: 0, color: '#374151', lineHeight: '16px', textAlign: 'justify' }}>
                        {hlWords.length > 0 ? highlightText(summary, new Set(hlWords.map(w => w.toLowerCase()))) : summary}
                    </p>
                </div>
            );
        }

        if (key === 'experience' && experiences.length > 0) {
            return (
                <div key="experience" style={{ marginBottom: mar }}>
                    {sTitle(L.experience, '💼')}
                    {experiences.map((exp, i) => (
                        <div key={i} style={{ marginBottom: 9 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: 9 }}>{exp.role || exp.position || exp.job_title || '—'}</span>
                                    {exp.company && <span style={{ color: '#555', fontWeight: 400 }}>, {exp.company}</span>}
                                    {exp.location && <span style={{ color: '#888' }}> — {exp.location}</span>}
                                </div>
                                <span style={{ color: '#888', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 10 }}>
                                    {exp.startDate}{(exp.startDate && (exp.endDate || exp.current)) ? ' – ' : ''}{exp.current ? currentLabel : exp.endDate}
                                </span>
                            </div>
                            {exp.description && (
                                <div style={{ marginTop: 3 }}>
                                    {parseRichText(exp.description, hlWords)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        if (key === 'education' && education.length > 0) {
            return (
                <div key="education" style={{ marginBottom: mar }}>
                    {sTitle(L.education, '🎓')}
                    {education.map((edu, i) => (
                        <div key={i} style={{ marginBottom: 7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div>
                                    <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` – ${edu.field}` : ''}</span>
                                    {edu.institution && <span style={{ color: '#555' }}>, {edu.institution}</span>}
                                </div>
                                <span style={{ color: '#888', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 10 }}>
                                    {edu.startDate}{edu.startDate && edu.endDate ? ' – ' : ''}{edu.endDate}
                                </span>
                            </div>
                            {edu.grade && <div style={{ color: '#888', marginTop: 2, fontSize: 8 }}>{de ? 'Note' : 'Grade'}: {edu.grade}</div>}
                        </div>
                    ))}
                </div>
            );
        }

        if (key === 'skills' && (skills.length > 0 || skillCategories)) {
            return <div key="skills" style={{ marginBottom: mar }}>{sTitle(L.skills, '⚡')}{renderSkills()}</div>;
        }

        if (key === 'languages' && langs.length > 0) {
            return (
                <div key="languages" style={{ marginBottom: mar }}>
                    {sTitle(L.languages, '🌐')}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px 0' }}>
                        {langs.map((l, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6 }}>
                                <span style={{ fontWeight: 600 }}>{l.language}</span>
                                <span style={{ color: '#888' }}>{l.proficiency}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (key === 'interests' && (interests.length > 0 || hobbies)) {
            return (
                <div key="interests" style={{ marginBottom: mar }}>
                    {sTitle(L.interests, '🎯')}
                    {interests.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px' }}>
                            {interests.map((interest, i) => {
                                const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                return txt ? <span key={i} style={{ fontSize: 8.5, color: '#374151' }}>• {txt}</span> : null;
                            })}
                        </div>
                    ) : <p style={{ margin: 0, color: '#374151' }}>{hobbies}</p>}
                </div>
            );
        }

        if (key === 'projects' && projects.length > 0) {
            return (
                <div key="projects" style={{ marginBottom: mar }}>
                    {sTitle(L.projects, '🚀')}
                    {projects.map((p, i) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontWeight: 700 }}>{p.name}</span>
                                {(p.link || p.url) && <span style={{ color: '#888', fontSize: 7.5 }}>{p.link || p.url}</span>}
                            </div>
                            {p.description && <div style={{ color: '#555', marginTop: 2 }}>{parseRichText(p.description, hlWords)}</div>}
                        </div>
                    ))}
                </div>
            );
        }

        if (key === 'certifications' && certs.length > 0) {
            return (
                <div key="certifications" style={{ marginBottom: mar }}>
                    {sTitle(L.certifications, '🏅')}
                    {certs.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div>
                                <span style={{ fontWeight: 600 }}>{c.name}</span>
                                {c.issuer && <span style={{ color: '#888' }}> — {c.issuer}</span>}
                            </div>
                            <span style={{ color: '#888', fontSize: 7.5 }}>{c.issueDate || c.date}</span>
                        </div>
                    ))}
                </div>
            );
        }

        if (key === 'custom') {
            const visible = customSections.filter(cs => cs.title && cs.content);
            if (!visible.length) return null;
            return (
                <React.Fragment key="custom">
                    {visible.map((cs, i) => (
                        <div key={i} style={{ marginBottom: mar }}>
                            {sTitle(cs.title, '📌')}
                            <p style={{ margin: 0, color: '#374151', lineHeight: '16px', whiteSpace: 'pre-wrap' }}>
                                {parseRichText(cs.content, hlWords)}
                            </p>
                        </div>
                    ))}
                </React.Fragment>
            );
        }

        return null;
    };

    /* ═══════════════════════════════════════════════════════
       ATS-Safe layout — plain black & white, no visuals
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'ats') {
        const currentLabel = isGerman ? 'Heute' : 'Present';
        const atsSTitle = (label) => <ATSSectionTitle label={label} />;
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9, lineHeight: '14px', color: '#000', background: 'white', padding: `${pageMargin}px ${pageMargin + 8}px` }}>
                {/* Header — plain text only */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px' }}>{name || 'Your Name'}</div>
                    {title && <div style={{ fontSize: 10, margin: '0 0 5px', color: '#333' }}>{title}</div>}
                    <div style={{ fontSize: 8, color: '#333', lineHeight: '13px' }}>
                        {[email, phone, location, linkedin, website].filter(Boolean).join('  |  ')}
                    </div>
                </div>
                <div style={{ height: 1, background: '#000', marginBottom: 10 }} />

                {/* Sections — ordered, ATS plain style */}
                {sectionOrder.map(key => {
                    if (key === 'summary' && summary) return (
                        <div key="summary" style={{ marginBottom: SS }}>
                            {atsSTitle(L.profile)}
                            <p style={{ margin: 0, lineHeight: '15px' }}>{summary}</p>
                        </div>
                    );
                    if (key === 'experience' && experiences.length > 0) return (
                        <div key="experience" style={{ marginBottom: SS }}>
                            {atsSTitle(L.experience)}
                            {experiences.map((exp, i) => (
                                <div key={i} style={{ marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700 }}>{exp.role || exp.position || '—'}</span>
                                        <span>{exp.startDate}{exp.startDate && (exp.endDate || exp.current) ? ' – ' : ''}{exp.current ? currentLabel : exp.endDate}</span>
                                    </div>
                                    {exp.company && <div>{exp.company}{exp.location ? ', ' + exp.location : ''}</div>}
                                    {exp.description && (
                                        <div style={{ marginTop: 2 }}>
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
                        <div key="education" style={{ marginBottom: SS }}>
                            {atsSTitle(L.education)}
                            {education.map((edu, i) => (
                                <div key={i} style={{ marginBottom: 5 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? `, ${edu.field}` : ''}</span>
                                        <span>{edu.startDate}{edu.startDate && edu.endDate ? ' – ' : ''}{edu.endDate}</span>
                                    </div>
                                    {edu.institution && <div>{edu.institution}</div>}
                                    {edu.grade && <div>Grade: {edu.grade}</div>}
                                </div>
                            ))}
                        </div>
                    );
                    if (key === 'skills' && skills.length > 0) return (
                        <div key="skills" style={{ marginBottom: SS }}>
                            {atsSTitle(L.skills)}
                            <div>{skills.join(', ')}</div>
                        </div>
                    );
                    if (key === 'languages' && langs.length > 0) return (
                        <div key="languages" style={{ marginBottom: SS }}>
                            {atsSTitle(L.languages)}
                            {langs.map((l, i) => <div key={i}>{l.language}: {l.proficiency}</div>)}
                        </div>
                    );
                    if (key === 'certifications' && certs.length > 0) return (
                        <div key="certifications" style={{ marginBottom: SS }}>
                            {atsSTitle(L.certifications)}
                            {certs.map((c, i) => <div key={i}>{c.name}{c.issuer ? ` - ${c.issuer}` : ''}{c.issueDate ? ` (${c.issueDate})` : ''}</div>)}
                        </div>
                    );
                    if (key === 'projects' && projects.length > 0) return (
                        <div key="projects" style={{ marginBottom: SS }}>
                            {atsSTitle(L.projects)}
                            {projects.map((p, i) => (
                                <div key={i} style={{ marginBottom: 4 }}>
                                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                                    {p.link && <span> ({p.link})</span>}
                                    {p.description && <div>{p.description}</div>}
                                </div>
                            ))}
                        </div>
                    );
                    if (key === 'interests' && (interests.length > 0 || hobbies)) return (
                        <div key="interests" style={{ marginBottom: SS }}>
                            {atsSTitle(L.interests)}
                            <div>{interests.map(i => typeof i === 'string' ? i : i?.name || '').filter(Boolean).join(', ') || hobbies}</div>
                        </div>
                    );
                    if (key === 'custom') {
                        const vis = customSections.filter(cs => cs.title && cs.content);
                        if (!vis.length) return null;
                        return <React.Fragment key="custom">{vis.map((cs, i) => (
                            <div key={i} style={{ marginBottom: SS }}>{atsSTitle(cs.title)}<p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{cs.content}</p></div>
                        ))}</React.Fragment>;
                    }
                    return null;
                })}
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       CLEAN layout
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'clean') {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white', padding: `${pageMargin}px ${pageMargin + 4}px ${pageMargin - 8}px` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1, paddingRight: 20 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.02em', color: '#111' }}>{name || 'Your Name'}</h1>
                        {title && <p style={{ fontSize: 11, color: '#555', fontWeight: 500, margin: '0 0 10px' }}>{title}</p>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', fontSize: 8, color: '#444' }}>
                            {email && <span>✉ {email}</span>}
                            {phone && <span>✆ {phone}</span>}
                            {location && <span>📍 {location}</span>}
                            {linkedin && <span>in {linkedin}</span>}
                            {website && <span>🔗 {website}</span>}
                        </div>
                    </div>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', flexShrink: 0, border: '2px solid #e5e7eb' }} />}
                </div>
                <div style={{ height: 1, background: '#e5e7eb', marginBottom: sectionSpacing }} />
                {sectionOrder.map(key => renderSection(key))}
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       MODERN layout: colored sidebar
    ═══════════════════════════════════════════════════════ */
    if (theme.layout === 'modern') {
        const sidebarW = Math.round(794 * columnSplit / 100);
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', display: 'flex', background: 'white' }}>
                {/* Sidebar */}
                <div style={{ width: sidebarW, background: primary, color: 'white', padding: '20px 14px', flexShrink: 0 }}>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', display: 'block', margin: '0 auto 12px', border: '3px solid rgba(255,255,255,0.4)' }} />}
                    <h1 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1.2, textAlign: 'center' }}>{name || 'Your Name'}</h1>
                    {title && <p style={{ fontSize: 8.5, opacity: 0.8, margin: '0 0 12px', textAlign: 'center' }}>{title}</p>}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 10, marginBottom: 12 }}>
                        {[email && `✉ ${email}`, phone && `✆ ${phone}`, location && `📍 ${location}`, linkedin && `in ${linkedin}`].filter(Boolean).map((c, i) => (
                            <div key={i} style={{ fontSize: 7.5, opacity: 0.88, marginBottom: 3, wordBreak: 'break-word' }}>{c}</div>
                        ))}
                    </div>
                    {/* Sidebar sections: skills, languages, interests */}
                    {skills.length > 0 && (
                        <>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, marginBottom: 6 }}>Skills</div>
                            {renderSkills(false, true)}
                        </>
                    )}
                    {langs.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 5 }}>Languages</div>
                            {langs.map((l, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                                    <span>{l.language}</span><span style={{ opacity: 0.75 }}>{l.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {(interests.length > 0 || hobbies) && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 5 }}>Interests</div>
                            {interests.length > 0 ? interests.map((interest, i) => {
                                const txt = typeof interest === 'string' ? interest : interest?.name || interest?.interest || '';
                                return txt ? <div key={i} style={{ fontSize: 7.5, opacity: 0.85, marginBottom: 2 }}>• {txt}</div> : null;
                            }) : <div style={{ fontSize: 7.5, opacity: 0.85 }}>{hobbies}</div>}
                        </div>
                    )}
                </div>
                {/* Main */}
                <div style={{ flex: 1, padding: `${pageMargin}px ${pageMargin - 8}px ${pageMargin}px ${pageMargin - 12}px` }}>
                    {sectionOrder.filter(k => !['skills','languages','interests'].includes(k)).map(key => renderSection(key))}
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
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white' }}>
                <div style={{ background: primary, padding: '22px 28px 16px', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 3px' }}>{name || 'Your Name'}</h1>
                            {title && <p style={{ fontSize: 10, opacity: 0.85, margin: 0 }}>{title}</p>}
                        </div>
                        {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', marginTop: 8, opacity: 0.9, fontSize: 7.5 }}>
                        {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', padding: `${pageMargin - 18}px ${pageMargin}px ${pageMargin}px`, gap: 18 }}>
                    <div style={{ width: leftW, flexShrink: 0 }}>
                        {(skills.length > 0 || skillCategories) && <><SectionTitle label="Skills" color={primary} border={primaryBorder} style={accentStyle} /><div style={{ marginBottom: SS }}>{renderSkills(true)}</div></>}
                        {langs.length > 0 && <><SectionTitle label="Languages" color={primary} border={primaryBorder} style={accentStyle} />{langs.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontWeight: 500 }}>{l.language}</span><span style={{ color: '#6b7280' }}>{l.proficiency}</span></div>)}</>}
                        {(interests.length > 0 || hobbies) && (
                            <div style={{ marginTop: SS }}>
                                <SectionTitle label="Interests" color={primary} border={primaryBorder} style={accentStyle} />
                                {interests.length > 0 ? interests.map((interest, i) => { const txt = typeof interest === 'string' ? interest : interest?.name || ''; return txt ? <div key={i} style={{ marginBottom: 2, fontSize: 8.5 }}>• {txt}</div> : null; }) : <div style={{ fontSize: 8.5 }}>{hobbies}</div>}
                            </div>
                        )}
                        {certs.length > 0 && <div style={{ marginTop: SS }}><SectionTitle label="Certifications" color={primary} border={primaryBorder} style={accentStyle} />{certs.map((c, i) => <div key={i} style={{ marginBottom: 4 }}><div style={{ fontWeight: 600, fontSize: 8 }}>{c.name}</div>{c.issuer && <div style={{ color: '#888', fontSize: 7.5 }}>{c.issuer}</div>}</div>)}</div>}
                    </div>
                    <div style={{ flex: 1, borderLeft: `2px solid ${primary}`, paddingLeft: 16 }}>
                        {sectionOrder.filter(k => !['skills','languages','interests','certifications'].includes(k)).map(key => renderSection(key))}
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
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white', padding: `${pageMargin - 4}px ${pageMargin}px ${pageMargin}px` }}>
                <div style={{ borderBottom: `2px solid ${primary}`, paddingBottom: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111' }}>{name || 'Your Name'}</h1>
                            {title && <p style={{ fontSize: 10, color: primary, fontWeight: 600, margin: '2px 0 6px' }}>{title}</p>}
                            <div style={{ display: 'flex', gap: 12, fontSize: 7.5, color: '#6b7280', flexWrap: 'wrap' }}>
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

    /* ═══════════════════════════════════════════════════════
       CLASSIC layout (default) — colored header banner
    ═══════════════════════════════════════════════════════ */
    return (
        <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white' }}>
            <div style={{ background: primary, padding: '18px 24px 14px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{name || 'Your Name'}</h1>
                        {title && <p style={{ fontSize: 10, fontWeight: 400, margin: '3px 0 0', opacity: 0.85 }}>{title}</p>}
                    </div>
                    {photo && <img src={photo} alt="Profile" style={{ width: photoSizePx, height: photoSizePx, borderRadius: photoRadius, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8, opacity: 0.9, fontSize: 7.5 }}>
                    {email && <span>✉ {email}</span>}{phone && <span>✆ {phone}</span>}{location && <span>📍 {location}</span>}{linkedin && <span>in {linkedin}</span>}{website && <span>🔗 {website}</span>}
                </div>
            </div>
            <div style={{ padding: `${pageMargin - 18}px ${pageMargin}px ${pageMargin}px` }}>
                {sectionOrder.map(key => renderSection(key))}
            </div>
        </div>
    );
};

export default CVPreview;
