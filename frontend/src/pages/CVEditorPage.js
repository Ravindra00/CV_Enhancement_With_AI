import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CVPreview from '../components/CVPreview';
import ThemePanel from '../components/ThemePanel';
import { cvAPI } from '../services/api';

const DEFAULT_CV = {
  personal_info: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', website: '', summary: '' },
  experiences: [],
  educations: [],
  skills: [],
  certifications: [],
  languages: [],
  projects: [],
  theme: { primaryColor: '#be123c', fontFamily: 'Inter, system-ui, sans-serif', layout: 'classic' },
};

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary transition';
const TEXTAREA = `${INPUT} resize-none`;
const LABEL = 'block text-xs font-semibold text-gray-600 mb-1';
const SECTION_BTN = 'flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-800 transition';
const ADD_BTN = 'flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-700 mt-2 transition';

/* Debounce helper */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

/* ─── Sub-components ─── */
const SkillsInput = ({ skills, onChange }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const s = input.trim();
    if (s) {
      const skillObj = { name: s, level: '', category: '' };
      const skillNames = skills.map(sk => typeof sk === 'string' ? sk : sk.name);
      if (!skillNames.includes(s)) onChange([...skills, skillObj]);
      setInput('');
    }
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className={INPUT} placeholder="Add skill…" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button onClick={add} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">+</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s, i) => {
          const skillName = typeof s === 'string' ? s : s.name;
          return (
            <span key={i} className="flex items-center gap-1 bg-primary-50 text-primary border border-primary-200 rounded-full px-3 py-0.5 text-xs font-medium">
              {skillName}<button onClick={() => onChange(skills.filter((_, j) => j !== i))} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Main Editor ─── */
const CVEditorPage = () => {
  const params = useParams();
  const id = params.id || params.cvId;   // support /cv/:id AND /cv-editor/:cvId
  const navigate = useNavigate();
  const [cvData, setCvData] = useState(DEFAULT_CV);
  const [title, setTitle] = useState('My CV');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState({ personal: true, summary: false, experience: false, education: false, skills: false, certs: false, languages: false, projects: false });
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef();

  /* Load CV */
  useEffect(() => {
    if (!id) return;
    cvAPI.getOne(id).then(res => {
      const d = res.data;
      setTitle(d.title || 'My CV');
      setCvData({
        ...DEFAULT_CV,
        personal_info: d.personal_info || {},
        experiences: d.experiences || [],
        educations: d.educations || [],
        skills: d.skills || [],
        certifications: d.certifications || [],
        languages: d.languages || [],
        projects: d.projects || [],
      });
    }).catch(console.error);
  }, [id]);

  /* Auto-save */
  const debouncedData = useDebounce(cvData, 1200);
  useEffect(() => {
    if (!id) return;
    setSaving(true);
    cvAPI.update(id, {
      title,
      personal_info: debouncedData.personal_info,
      experiences: debouncedData.experiences,
      educations: debouncedData.educations,
      skills: debouncedData.skills,
      certifications: debouncedData.certifications,
      languages: debouncedData.languages,
      projects: debouncedData.projects,
    }).then(() => {
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }).catch(() => setSaving(false));
  }, [debouncedData, id]);

  const update = useCallback((path, value) => {
    setCvData(prev => {
      const next = { ...prev };
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) { obj[parts[i]] = { ...(obj[parts[i]] || {}) }; obj = obj[parts[i]]; }
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  }, []);

  const updatePI = (field, val) => update('personal_info.' + field, val);
  const piInput = (label, field, placeholder = '') => (
    <div><label className={LABEL}>{label}</label><input className={INPUT} placeholder={placeholder} value={cvData.personal_info?.[field] || ''} onChange={e => updatePI(field, e.target.value)} /></div>
  );

  /* Photo upload */
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await cvAPI.uploadPhoto(id, file);
      // Note: Photo is now handled separately, update personal_info if needed
      setCvData(prev => ({ ...prev, personal_info: { ...prev.personal_info, photo: res.data.photo_path || '' } }));
    } catch (err) { alert('Photo upload failed'); }
    setPhotoUploading(false);
  };

  /* Theme */
  const theme = cvData.theme || DEFAULT_CV.theme;
  const setTheme = useCallback(t => setCvData(prev => ({ ...prev, theme: t })), []);

  /* Section toggle */
  const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }));

  /* Experience helpers */
  const addExp = () => setCvData(prev => ({ ...prev, experiences: [...prev.experiences, { company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '', skills: [] }] }));
  const removeExp = i => setCvData(prev => ({ ...prev, experiences: prev.experiences.filter((_, j) => j !== i) }));
  const updateExp = (i, field, val) => setCvData(prev => { const e = [...prev.experiences]; e[i] = { ...e[i], [field]: val }; return { ...prev, experiences: e }; });

  /* Education helpers */
  const addEdu = () => setCvData(prev => ({ ...prev, educations: [...prev.educations, { institution: '', degree: '', field: '', location: '', startDate: '', endDate: '', grade: '', description: '' }] }));
  const removeEdu = i => setCvData(prev => ({ ...prev, educations: prev.educations.filter((_, j) => j !== i) }));
  const updateEdu = (i, field, val) => setCvData(prev => { const e = [...prev.educations]; e[i] = { ...e[i], [field]: val }; return { ...prev, educations: e }; });

  /* Language helpers */
  const addLang = () => setCvData(prev => ({ ...prev, languages: [...prev.languages, { language: '', proficiency: 'Fluent' }] }));
  const removeLang = i => setCvData(prev => ({ ...prev, languages: prev.languages.filter((_, j) => j !== i) }));
  const updateLang = (i, field, val) => setCvData(prev => { const l = [...prev.languages]; l[i] = { ...l[i], [field]: val }; return { ...prev, languages: l }; });

  /* Project helpers */
  const addProject = () => setCvData(prev => ({ ...prev, projects: [...prev.projects, { name: '', description: '', link: '', startDate: '', endDate: '', technologies: [] }] }));
  const removeProject = i => setCvData(prev => ({ ...prev, projects: prev.projects.filter((_, j) => j !== i) }));
  const updateProject = (i, field, val) => setCvData(prev => { const p = [...prev.projects]; p[i] = { ...p[i], [field]: val }; return { ...prev, projects: p }; });

  /* Certification helpers */
  const addCert = () => setCvData(prev => ({ ...prev, certifications: [...prev.certifications, { name: '', issuer: '', issueDate: '', expiryDate: '', credentialUrl: '' }] }));
  const removeCert = i => setCvData(prev => ({ ...prev, certifications: prev.certifications.filter((_, j) => j !== i) }));
  const updateCert = (i, field, val) => setCvData(prev => { const c = [...prev.certifications]; c[i] = { ...c[i], [field]: val }; return { ...prev, certifications: c }; });

  const SectionHeader = ({ k, label }) => (
    <button className={SECTION_BTN} onClick={() => toggle(k)}>
      <span className="font-semibold text-sm">{label}</span>
      <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open[k] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-800 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input value={title} onChange={e => setTitle(e.target.value)} className="text-base font-bold border-0 focus:outline-none focus:border-b-2 focus:border-primary bg-transparent" />
          <span className="text-xs text-gray-400">{saving ? '⏳ Saving…' : saved ? '✓ Saved' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/cv/${id}/customize`)} className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-200 transition">✨ AI Enhance</button>
          <button onClick={() => cvAPI.exportPDF(id, title)} className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition">↓ PDF</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-white border-r border-gray-200 p-4 space-y-3">

          {/* Photo + Personal Info */}
          <SectionHeader k="personal" label="Personal Information" def="Personal Information" />
          {open.personal && (
            <div className="space-y-3 pt-1">
              {/* Photo upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {cvData.personalInfo?.photo
                    ? <img src={cvData.personalInfo.photo} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-primary-200" />
                    : <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl border-2 border-dashed border-gray-300">👤</div>
                  }
                  <button onClick={() => photoRef.current?.click()} className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-primary-700 shadow">+</button>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Profile Photo</p>
                  <button onClick={() => photoRef.current?.click()} disabled={photoUploading} className="text-xs text-primary hover:underline disabled:opacity-50">
                    {photoUploading ? 'Uploading…' : 'Upload photo'}
                  </button>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP</p>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {piInput('Full Name', 'name', 'Rabindra Pandey')}
                {piInput('Job Title', 'jobTitle', 'Software Engineer')}
                {piInput('Email', 'email', 'email@example.com')}
                {piInput('Phone', 'phone', '+49 123 456789')}
                {piInput('Location', 'location', 'Munich, Germany')}
                {piInput('LinkedIn', 'linkedin', 'linkedin.com/in/you')}
                {piInput('Website', 'website', 'yourwebsite.com')}
              </div>
            </div>
          )}

          {/* Theme Panel */}
          <ThemePanel theme={theme} onThemeChange={setTheme} />

          {/* Summary */}
          <SectionHeader k="summary" label="Profile Summary" def="Profile Summary" />
          {open.summary && (
            <div className="pt-1">
              <textarea className={TEXTAREA} rows={4} placeholder="Write a compelling 2-3 sentence summary…"
                value={cvData.summary || ''} onChange={e => update('summary', e.target.value)} />
            </div>
          )}

          {/* Experience */}
          <SectionHeader k="experience" label="Experience" />
          {open.experience && (
            <div className="space-y-4 pt-1">
              {cvData.experiences.map((exp, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 relative">
                  <button onClick={() => removeExp(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs">✕</button>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={LABEL}>Job Title</label><input className={INPUT} value={exp.position} onChange={e => updateExp(i, 'position', e.target.value)} placeholder="Software Engineer" /></div>
                    <div><label className={LABEL}>Company</label><input className={INPUT} value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} placeholder="Company Name" /></div>
                    <div><label className={LABEL}>Location</label><input className={INPUT} value={exp.location} onChange={e => updateExp(i, 'location', e.target.value)} placeholder="Munich, Germany" /></div>
                    <div><label className={LABEL}>Start Date</label><input className={INPUT} value={exp.startDate} onChange={e => updateExp(i, 'startDate', e.target.value)} placeholder="2022-06" /></div>
                    <div><label className={LABEL}>End Date</label><input className={INPUT} value={exp.endDate} onChange={e => updateExp(i, 'endDate', e.target.value)} placeholder="2025-01" disabled={exp.current} /></div>
                    <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={!!exp.current} onChange={e => updateExp(i, 'current', e.target.checked)} className="accent-primary" /> Currently here</label></div>
                  </div>
                  <div><label className={LABEL}>Responsibilities & Achievements</label><textarea className={TEXTAREA} rows={4} value={exp.description} onChange={e => updateExp(i, 'description', e.target.value)} placeholder="• Built scalable APIs…&#10;• Reduced load time by 40%…" /></div>
                </div>
              ))}
              <button onClick={addExp} className={ADD_BTN}><span className="text-lg">+</span> Add Position</button>
            </div>
          )}

          {/* Education */}
          <SectionHeader k="education" label="Education" />
          {open.education && (
            <div className="space-y-3 pt-1">
              {cvData.educations.map((edu, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 relative">
                  <button onClick={() => removeEdu(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs">✕</button>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={LABEL}>Degree</label><input className={INPUT} value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} placeholder="B.Sc. Computer Science" /></div>
                    <div><label className={LABEL}>Institution</label><input className={INPUT} value={edu.institution} onChange={e => updateEdu(i, 'institution', e.target.value)} placeholder="TU Munich" /></div>
                    <div><label className={LABEL}>Field of Study</label><input className={INPUT} value={edu.field} onChange={e => updateEdu(i, 'field', e.target.value)} placeholder="Computer Science" /></div>
                    <div><label className={LABEL}>Grade/GPA</label><input className={INPUT} value={edu.grade} onChange={e => updateEdu(i, 'grade', e.target.value)} placeholder="1.8 / GPA 3.7" /></div>
                    <div><label className={LABEL}>Start</label><input className={INPUT} value={edu.startDate} onChange={e => updateEdu(i, 'startDate', e.target.value)} placeholder="2015" /></div>
                    <div><label className={LABEL}>End</label><input className={INPUT} value={edu.endDate} onChange={e => updateEdu(i, 'endDate', e.target.value)} placeholder="2019" /></div>
                  </div>
                </div>
              ))}
              <button onClick={addEdu} className={ADD_BTN}><span className="text-lg">+</span> Add Education</button>
            </div>
          )}

          {/* Skills */}
          <SectionHeader k="skills" label="Skills" />
          {open.skills && (
            <div className="pt-1">
              <SkillsInput skills={cvData.skills || []} onChange={v => update('skills', v)} />
            </div>
          )}

          {/* Certifications */}
          <SectionHeader k="certs" label="Certifications" />
          {open.certs && (
            <div className="space-y-2 pt-1">
              {(cvData.certifications || []).map((cert, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-3 gap-2 relative">
                  <button onClick={() => removeCert(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs">✕</button>
                  <div className="col-span-2"><label className={LABEL}>Certification Name</label><input className={INPUT} value={cert.name} onChange={e => updateCert(i, 'name', e.target.value)} /></div>
                  <div><label className={LABEL}>Issue Date</label><input className={INPUT} value={cert.issueDate} onChange={e => updateCert(i, 'issueDate', e.target.value)} /></div>
                  <div className="col-span-3"><label className={LABEL}>Issuing Body</label><input className={INPUT} value={cert.issuer} onChange={e => updateCert(i, 'issuer', e.target.value)} /></div>
                </div>
              ))}
              <button onClick={addCert} className={ADD_BTN}><span className="text-lg">+</span> Add Certification</button>
            </div>
          )}

          {/* Languages */}
          <SectionHeader k="languages" label="Languages" />
          {open.languages && (
            <div className="space-y-2 pt-1">
              {(cvData.languages || []).map((lang, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className={INPUT} placeholder="Language" value={lang.language} onChange={e => updateLang(i, 'language', e.target.value)} />
                  <select className={INPUT} value={lang.proficiency} onChange={e => updateLang(i, 'proficiency', e.target.value)}>
                    {['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'].map(l => <option key={l}>{l}</option>)}
                  </select>
                  <button onClick={() => removeLang(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>
                </div>
              ))}
              <button onClick={addLang} className={ADD_BTN}><span className="text-lg">+</span> Add Language</button>
            </div>
          )}

          {/* Projects */}
          <SectionHeader k="projects" label="Projects" />
          {open.projects && (
            <div className="space-y-3 pt-1">
              {(cvData.projects || []).map((proj, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 relative">
                  <button onClick={() => removeProject(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs">✕</button>
                  <div><label className={LABEL}>Project Name</label><input className={INPUT} value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} /></div>
                  <div><label className={LABEL}>URL / GitHub</label><input className={INPUT} value={proj.link} onChange={e => updateProject(i, 'link', e.target.value)} placeholder="github.com/…" /></div>
                  <div><label className={LABEL}>Description</label><textarea className={TEXTAREA} rows={2} value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} /></div>
                </div>
              ))}
              <button onClick={addProject} className={ADD_BTN}><span className="text-lg">+</span> Add Project</button>
            </div>
          )}
        </div>

        {/* Right: A4 preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 flex flex-col items-center py-8 px-4">
          <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center', width: 794, marginBottom: -180 }}>
            <div className="shadow-2xl rounded-sm overflow-hidden">
              <CVPreview data={cvData} theme={theme} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVEditorPage;
