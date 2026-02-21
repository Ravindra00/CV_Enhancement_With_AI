import React from 'react';

/* ───────────────────────────────────────────────────────────────
   CVPreview — A4 live preview with dynamic themes & paging
   Props:
     data   — parsed CV data (personalInfo, experience, etc.)
     theme  — { primaryColor, fontFamily, layout }
     scale  — canvas scale (default 1)
─────────────────────────────────────────────────────────────── */

const DEFAULT_THEME = {
    primaryColor: '#be123c',
    fontFamily: 'Inter, system-ui, sans-serif',
    layout: 'classic', // classic | modern | minimal
};

const DEFAULT_LABELS = {
    summary: 'Profile',
    experience: 'Professional Experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
    languages: 'Languages',
    projects: 'Projects',
};

/* ─── helpers ─── */
const rgba = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
};

const SectionTitle = ({ label, color, border }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 2 }}>
        <h2 style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, margin: 0, whiteSpace: 'nowrap' }}>
            {label}
        </h2>
        <div style={{ flex: 1, height: 1, background: border }} />
    </div>
);

const CVPreview = ({ data = {}, theme: themeProp = {}, scale = 1 }) => {
    const theme = { ...DEFAULT_THEME, ...themeProp };
    const primary = theme.primaryColor;
    const primaryLight = rgba(primary, 0.15);
    const primaryBorder = rgba(primary, 0.25);
    const labels = { ...DEFAULT_LABELS };
    const pi = data.personal_info || {};
    const experiences = data.experiences || [];
    const education = data.educations || [];
    const skills = Array.isArray(data.skills) ? data.skills.filter(Boolean) : [];
    const certs = data.certifications || [];
    const langs = data.languages || [];
    const projects = data.projects || [];
    const summary = pi.summary || '';
    const isModern = theme.layout === 'modern';
    const isMinimal = theme.layout === 'minimal';

    const hasContent = (section) => {
        switch (section) {
            case 'summary': return !!summary;
            case 'experience': return experiences.length > 0;
            case 'education': return education.length > 0;
            case 'skills': return skills.length > 0;
            case 'certifications': return certs.length > 0;
            case 'languages': return langs.length > 0;
            case 'projects': return projects.length > 0;
            default: return false;
        }
    };

    /* ─── Modern layout: left sidebar + main ─── */
    if (isModern) {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', display: 'flex', background: 'white' }}>
                {/* Sidebar */}
                <div style={{ width: 220, background: primary, color: 'white', padding: '20px 14px', flexShrink: 0 }}>
                    {pi.photo && <img src={pi.photo} alt="Profile" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 12px', border: '2px solid rgba(255,255,255,0.4)' }} />}
                    <h1 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 3px', lineHeight: 1.2 }}>{pi.name || 'Your Name'}</h1>
                    {pi.title && <p style={{ fontSize: 8.5, opacity: 0.8, margin: '0 0 12px' }}>{pi.title}</p>}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 10, marginBottom: 10 }}>
                        {[pi.email && `✉ ${pi.email}`, pi.phone && `✆ ${pi.phone}`, pi.location && `⌖ ${pi.location}`, pi.linkedin && `in ${pi.linkedin}`].filter(Boolean).map((c, i) => (
                            <div key={i} style={{ fontSize: 7.5, opacity: 0.88, marginBottom: 3 }}>{c}</div>
                        ))}
                    </div>
                    {hasContent('skills') && (
                        <>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, marginBottom: 6 }}>{labels.skills}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {skills.map((s, i) => {
                                  const skillName = typeof s === 'string' ? s : s.name;
                                  return <span key={i} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '1px 6px', fontSize: 7.5 }}>{skillName}</span>;
                                })}
                            </div>
                        </>
                    )}
                    {hasContent('languages') && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 5 }}>{labels.languages}</div>
                            {langs.map((l, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
                                    <span>{l.language}</span><span style={{ opacity: 0.75 }}>{l.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Main */}
                <div style={{ flex: 1, padding: '18px 18px 16px 16px' }}>
                    {hasContent('summary') && (
                        <>
                            <SectionTitle label={labels.summary} color={primary} border={primaryBorder} />
                            <p style={{ margin: '0 0 10px', color: '#374151', lineHeight: '15px' }}>{summary}</p>
                        </>
                    )}
                    {_renderExperience(experiences, labels, primary, primaryBorder)}
                    {_renderEducation(education, labels, primary, primaryBorder)}
                    {_renderCertifications(certs, labels, primary, primaryBorder)}
                    {_renderProjects(projects, labels, primary, primaryBorder)}
                </div>
            </div>
        );
    }

    /* ─── Minimal layout: no header color block ─── */
    if (isMinimal) {
        return (
            <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white', padding: '24px 28px 20px' }}>
                {/* Header */}
                <div style={{ borderBottom: `2px solid ${primary}`, paddingBottom: 10, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#111' }}>{pi.name || 'Your Name'}</h1>
                            {pi.title && <p style={{ fontSize: 10, color: primary, fontWeight: 600, margin: '2px 0 0' }}>{pi.title}</p>}
                            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 7.5, color: '#6b7280', flexWrap: 'wrap' }}>
                                {pi.email && <span>✉ {pi.email}</span>}
                                {pi.phone && <span>✆ {pi.phone}</span>}
                                {pi.location && <span>⌖ {pi.location}</span>}
                                {pi.linkedin && <span>in {pi.linkedin}</span>}
                            </div>
                        </div>
                        {pi.photo && <img src={pi.photo} alt="Profile" style={{ width: 52, height: 52, borderRadius: 4, objectFit: 'cover' }} />}
                    </div>
                </div>
                {hasContent('summary') && <><SectionTitle label={labels.summary} color={primary} border={primaryBorder} /><p style={{ margin: '0 0 10px', color: '#374151' }}>{summary}</p></>}
                {_renderExperience(experiences, labels, primary, primaryBorder)}
                {_renderEducation(education, labels, primary, primaryBorder)}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {hasContent('skills') && <div><SectionTitle label={labels.skills} color={primary} border={primaryBorder} /><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{skills.map((s, i) => {
                      const skillName = typeof s === 'string' ? s : s.name;
                      return <span key={i} style={{ background: primaryLight, color: primary, border: `1px solid ${primaryBorder}`, borderRadius: 10, padding: '1px 7px', fontSize: 7.5, fontWeight: 500 }}>{skillName}</span>;
                    })}</div></div>}
                    {hasContent('languages') && <div><SectionTitle label={labels.languages} color={primary} border={primaryBorder} />{langs.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ fontWeight: 500 }}>{l.language}</span><span style={{ color: '#6b7280' }}>{l.proficiency}</span></div>)}</div>}
                </div>
                {_renderCertifications(certs, labels, primary, primaryBorder)}
                {_renderProjects(projects, labels, primary, primaryBorder)}
            </div>
        );
    }

    /* ─── Classic layout (default) ─── */
    return (
        <div style={{ width: 794, minHeight: 1123, fontFamily: theme.fontFamily, fontSize: 9, lineHeight: '14px', color: '#1a1a1a', background: 'white' }}>
            {/* Header */}
            <div style={{ background: primary, padding: '18px 24px 14px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{pi.name || 'Your Name'}</h1>
                        {pi.title && <p style={{ fontSize: 10, fontWeight: 400, margin: '3px 0 0', opacity: 0.85 }}>{pi.title}</p>}
                    </div>
                    {pi.photo && <img src={pi.photo} alt="Profile" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8, opacity: 0.9, fontSize: 7.5 }}>
                    {pi.email && <span>✉ {pi.email}</span>}
                    {pi.phone && <span>✆ {pi.phone}</span>}
                    {pi.location && <span>⌖ {pi.location}</span>}
                    {pi.linkedin && <span>in {pi.linkedin}</span>}
                    {pi.website && <span>🔗 {pi.website}</span>}
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 24px 20px' }}>
                {hasContent('summary') && (
                    <div style={{ marginBottom: 10, pageBreakInside: 'avoid' }}>
                        <SectionTitle label={labels.summary} color={primary} border={primaryBorder} />
                        <p style={{ margin: 0, color: '#374151', lineHeight: '16px' }}>{summary}</p>
                    </div>
                )}
                {_renderExperience(experiences, labels, primary, primaryBorder)}
                {_renderEducation(education, labels, primary, primaryBorder)}

                {/* Two-col: Skills + Languages */}
                {(hasContent('skills') || hasContent('languages')) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
                        {hasContent('skills') && (
                            <div>
                                <SectionTitle label={labels.skills} color={primary} border={primaryBorder} />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {skills.map((s, i) => {
                                      const skillName = typeof s === 'string' ? s : s.name;
                                      return <span key={i} style={{ background: primaryLight, color: primary, border: `1px solid ${primaryBorder}`, borderRadius: 10, padding: '1px 7px', fontSize: 7.5, fontWeight: 500 }}>{skillName}</span>;
                                    })}
                                </div>
                            </div>
                        )}
                        {hasContent('languages') && (
                            <div>
                                <SectionTitle label={labels.languages} color={primary} border={primaryBorder} />
                                {langs.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ fontWeight: 500 }}>{l.language}</span>
                                        <span style={{ color: '#6b7280' }}>{l.proficiency}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {_renderCertifications(certs, labels, primary, primaryBorder)}
                {_renderProjects(projects, labels, primary, primaryBorder)}
            </div>
        </div>
    );
};

/* ─── Shared section renderers ─── */
function _renderExperience(experiences, labels, primary, border) {
    if (!experiences.length) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <SectionTitle label={labels.experience} color={primary} border={border} />
            {experiences.map((exp, i) => (
                <div key={i} style={{ marginBottom: 7, pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                            <span style={{ fontWeight: 700, fontSize: 9 }}>{exp.role || exp.position || exp.job_title || 'Role'}</span>
                            {exp.company && <span style={{ color: primary, fontWeight: 600 }}> · {exp.company}</span>}
                            {exp.location && <span style={{ color: '#6b7280' }}> — {exp.location}</span>}
                        </div>
                        <span style={{ color: '#6b7280', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {exp.startDate}{(exp.startDate && (exp.endDate || exp.current)) ? ' – ' : ''}{exp.current ? 'Present' : exp.endDate}
                        </span>
                    </div>
                    {exp.description && (
                        <div style={{ marginTop: 2, color: '#374151' }}>
                            {exp.description.split('\n').filter(Boolean).map((line, j) => (
                                <div key={j} style={{ paddingLeft: 10, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 2 }}>•</span>
                                    {line.replace(/^[•\-]\s*/, '')}
                                </div>
                            ))}
                        </div>
                    )}
                    {i < experiences.length - 1 && <div style={{ marginTop: 4, borderTop: '1px dashed #f3f4f6' }} />}
                </div>
            ))}
        </div>
    );
}

function _renderEducation(education, labels, primary, border) {
    if (!education.length) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <SectionTitle label={labels.education} color={primary} border={border} />
            {education.map((edu, i) => (
                <div key={i} style={{ marginBottom: 5, pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                            <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                            {edu.institution && <span style={{ color: primary, fontWeight: 600 }}> · {edu.institution}</span>}
                        </div>
                        <span style={{ color: '#6b7280', fontSize: 7.5, whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {edu.startDate}{edu.startDate && edu.endDate ? ' – ' : ''}{edu.endDate}
                        </span>
                    </div>
                    {edu.grade && <div style={{ color: '#6b7280', marginTop: 1 }}>Grade: {edu.grade}</div>}
                </div>
            ))}
        </div>
    );
}

function _renderCertifications(certs, labels, primary, border) {
    if (!certs.length) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <SectionTitle label={labels.certifications} color={primary} border={border} />
            {certs.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, pageBreakInside: 'avoid' }}>
                    <div><span style={{ fontWeight: 600 }}>{c.name}</span>{c.issuer && <span style={{ color: '#6b7280' }}> — {c.issuer}</span>}</div>
                    <span style={{ color: '#6b7280', fontSize: 7.5 }}>{c.issueDate || c.date}</span>
                </div>
            ))}
        </div>
    );
}

function _renderProjects(projects, labels, primary, border) {
    if (!projects.length) return null;
    return (
        <div style={{ marginBottom: 10 }}>
            <SectionTitle label={labels.projects} color={primary} border={border} />
            {projects.map((p, i) => (
                <div key={i} style={{ marginBottom: 5, pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                        {(p.link || p.url) && <span style={{ color: primary, fontSize: 7.5 }}>{p.link || p.url}</span>}
                    </div>
                    {p.description && <div style={{ color: '#374151', marginTop: 1 }}>{p.description}</div>}
                </div>
            ))}
        </div>
    );
}

export default CVPreview;
