import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cvAPI, customizeAPI, jobApplicationAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import CVPreview from '../components/CVPreview';
import ThemePanel from '../components/ThemePanel';
import ATSScorePanel from '../components/ATSScorePanel';
import SectionReorder, { DEFAULT_SECTION_ORDER } from '../components/SectionReorder';
import RichTextInput from '../components/RichTextInput';
import CoverLetterPanel from '../components/CoverLetterPanel';
import { scoreResume } from '../utils/atsEngine';
import { generateCoverLetter } from '../utils/coverLetterEngine';
import { exportCVAsPDF } from '../utils/printCV';

// ─── Style constants ──────────────────────────────────────────────────────────
const INPUT = 'w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary transition bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500';
const LABEL = 'block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1 uppercase tracking-wide';
const ADD_BTN = 'flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-700 mt-3 transition';

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

// ─── Skills tag input ─────────────────────────────────────────────────────────
const SkillsInput = ({ skills, onChange, onSuggestSkills, suggestedSkills, onAddSuggested, suggestingSkills }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const s = input.trim();
    if (!s) return;
    const names = skills.map(sk => typeof sk === 'string' ? sk : sk.name);
    if (!names.includes(s)) onChange([...skills, { name: s, level: '', category: '' }]);
    setInput('');
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className={INPUT} placeholder="Add skill…" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button onClick={add} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition">+</button>
        <button onClick={onSuggestSkills} disabled={suggestingSkills} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1">
          {suggestingSkills ? <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>...</> : <>✦ Suggest from JD</>}
        </button>
      </div>
      {suggestedSkills && suggestedSkills.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">💡 Suggested Skills (click to add):</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedSkills.map((skill, i) => (
              <button key={i} onClick={() => onAddSuggested(skill)}
                className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 px-2.5 py-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition cursor-pointer">
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s, i) => {
          const name = typeof s === 'string' ? s : s.name;
          return (
            <span key={i} className="flex items-center gap-1 bg-primary-50 text-primary border border-primary-200 rounded-full px-3 py-0.5 text-xs font-medium">
              {name}
              <button onClick={() => onChange(skills.filter((_, j) => j !== i))} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Section accordion wrapper ────────────────────────────────────────────────
const Accordion = ({ icon, label, badge, children, defaultOpen = false, warn = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden ${warn ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-slate-700'}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition text-left">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{label}</span>
          {badge > 0 && (
            <span className="text-[10px] font-bold bg-primary text-white rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
          )}
          {warn && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-700 rounded-full px-1.5 py-0.5">⚠️ Weak</span>}
        </div>
        <svg className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-slate-700">{children}</div>}
    </div>
  );
};

// ─── Score ring (small, for AI tab) ──────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width={72} height={72} viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="text-center -mt-14"><span className="text-xl font-bold text-gray-900">{score}%</span></div>
      <p className="text-xs text-gray-500 mt-8 font-medium">Match Score</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════
const CVCustomizePage = () => {
  const { id: paramId, cvId: paramCvId } = useParams();
  const cvId = paramId || paramCvId;
  const navigate = useNavigate();
  const photoRef = useRef();
  const interestRef = useRef();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const canUseAI = user?.ai_access === true || user?.is_superuser === true;

  // ── core state ────────────────────────────────────────────────────────────
  const [cv, setCV] = useState(null);
  const [cvData, setCVData] = useState({});
  const [originalCVData, setOriginalCVData] = useState({});
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [toast, setToast] = useState(null);
  // previewScale is maintained by the resize handler below
  const [activeTab, setActiveTab] = useState('customize'); // 'customize' | 'ats' | 'ai'
  const [autoSaveState, setAutoSaveState] = useState('idle');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── Cover letter state
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterGenerating, setCoverLetterGenerating] = useState(false);

  // ── ATS state ─────────────────────────────────────────────────────────────
  const [atsJD, setAtsJD] = useState('');
  const [atsResult, setAtsResult] = useState(null);
  const [atsRunning, setAtsRunning] = useState(false);
  const [highlightKeywords, setHighlightKeywords] = useState([]);
  const [highlightOn, setHighlightOn] = useState(false);

  // ── AI enhance state ──────────────────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [matchScore, setMatchScore] = useState(null);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [missingKeywords, setMissingKeywords] = useState([]);
  const [enhancedCV, setEnhancedCV] = useState(null);
  const [enhanceMsg, setEnhanceMsg] = useState('');
  const [enhanceStatus, setEnhanceStatus] = useState('');
  const [showSaveJobForm, setShowSaveJobForm] = useState(false);
  const [saveJobCompany, setSaveJobCompany] = useState('');
  const [saveJobRole, setSaveJobRole] = useState('');
  const [saveJobStatus, setSaveJobStatus] = useState('saved');
  const [savingJob, setSavingJob] = useState(false);
  // AI Feature 2 — Summary writer
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  // AI Feature 3 — Bullet improver {[expIndex]: { originals, suggestions, accepted: Set<number>, loading }}
  const [bulletState, setBulletState] = useState({});
  // AI Feature 4 — Skill suggester
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [suggestingSkills, setSuggestingSkills] = useState(false);

  // ── helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const buildPreviewData = (raw) => ({
    personal_info: raw.personal_info || {},
    experiences: raw.experiences || [],
    projects: raw.projects || [],
    skills: raw.skills || [],
    educations: raw.educations || [],
    languages: raw.languages || [],
    certifications: raw.certifications || [],
    interests: raw.interests || [],
    custom_sections: raw.custom_sections || [],
    full_name: raw.full_name || '',
    title: raw.title || '',
    email: raw.email || '',
    phone: raw.phone || '',
    location: raw.location || '',
    linkedin_url: raw.linkedin_url || '',
    profile_summary: raw.profile_summary || '',
    photo_path: raw.photo_path || '',
    theme: raw.theme || {},
  });

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCV();
    const handleResize = () => {}; // scale handled by inline ref
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cvId]); // eslint-disable-line

  const fetchCV = async () => {
    try {
      const r = await cvAPI.getOne(cvId);
      const raw = r.data;
      setCV(raw);

      const exps = (raw.experiences || []).map(exp => {
        const n = { ...exp };
        if (n.role && !n.position) n.position = n.role;
        if (n.position && !n.role) n.role = n.position;
        if (!n.startDate && n.start_date) n.startDate = n.start_date;
        if (!n.endDate && n.end_date) n.endDate = n.end_date;
        return n;
      });

      const edus = (raw.educations || []).map(edu => {
        const n = { ...edu };
        if (!n.institution && n.institution_name) n.institution = n.institution_name;
        if (!n.field && n.field_of_study) n.field = n.field_of_study;
        if (!n.startDate) n.startDate = n.start_date || n.start_year || '';
        if (!n.endDate) n.endDate = n.end_date || n.end_year || '';
        return n;
      });

      let skills = raw.skills || [];
      if (!Array.isArray(skills) && typeof skills === 'object') {
        const out = [];
        for (const [cat, items] of Object.entries(skills)) {
          if (Array.isArray(items)) items.forEach(item =>
            typeof item === 'string' ? out.push({ name: item, category: cat }) : out.push({ ...item, category: cat })
          );
        }
        skills = out;
      }

      const preview = buildPreviewData({ ...raw, experiences: exps, educations: edus, skills });
      setOriginalCVData(JSON.parse(JSON.stringify(preview)));
      setCVData(JSON.parse(JSON.stringify(preview)));
      setTimeout(() => setIsInitialLoad(false), 600);
    } catch {
      showToast('Failed to load CV', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── auto-save ─────────────────────────────────────────────────────────────
  const debouncedData = useDebounce(cvData, 1500);
  useEffect(() => {
    if (!cvId || isInitialLoad) return;
    setAutoSaveState('saving');
    cvAPI.update(cvId, {
      title: cv?.title || 'My CV',
      personal_info: debouncedData.personal_info,
      experiences: debouncedData.experiences,
      educations: debouncedData.educations,
      skills: debouncedData.skills,
      certifications: debouncedData.certifications,
      languages: debouncedData.languages,
      projects: debouncedData.projects,
      interests: debouncedData.interests,
      custom_sections: debouncedData.custom_sections,
      theme: debouncedData.theme || {},
    })
      .then(() => { setAutoSaveState('saved'); setTimeout(() => setAutoSaveState('idle'), 2500); })
      .catch(() => setAutoSaveState('idle'));
  }, [debouncedData]); // eslint-disable-line

  // ── updaters ──────────────────────────────────────────────────────────────
  const setSection = useCallback((key, val) => setCVData(prev => ({ ...prev, [key]: val })), []);
  const updatePI = useCallback((field, val) => setCVData(prev => ({ ...prev, personal_info: { ...prev.personal_info, [field]: val } })), []);

  const setTheme = useCallback(t => setCVData(prev => ({ ...prev, theme: t })), []);
  const theme = cvData.theme || { primaryColor: '#1a1a1a', fontFamily: 'Inter, system-ui, sans-serif', layout: 'clean', accentStyle: 'line', pageMargin: 32, sectionSpacing: 12, columnSplit: 35 };

  // ── Section order & visibility ────────────────────────────────────────────
  const sectionOrder = theme.sectionOrder?.length ? theme.sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSections = new Set(theme.hiddenSections || []);

  const handleReorder = useCallback((newOrder) => {
    setTheme({ ...theme, sectionOrder: newOrder });
  }, [theme, setTheme]);

  const handleToggleVisible = useCallback((key) => {
    const hs = new Set(theme.hiddenSections || []);
    if (hs.has(key)) hs.delete(key);
    else hs.add(key);
    setTheme({ ...theme, hiddenSections: [...hs] });
  }, [theme, setTheme]);

  // experiences
  const addExp = () => setSection('experiences', [...(cvData.experiences || []), { company: '', position: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' }]);
  const removeExp = i => setSection('experiences', (cvData.experiences || []).filter((_, j) => j !== i));
  const updateExp = (i, f, v) => {
    const e = [...(cvData.experiences || [])];
    e[i] = { ...e[i], [f]: v };
    if (f === 'position') e[i].role = v;
    if (f === 'role') e[i].position = v;
    setSection('experiences', e);
  };

  // educations
  const addEdu = () => setSection('educations', [...(cvData.educations || []), { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '' }]);
  const removeEdu = i => setSection('educations', (cvData.educations || []).filter((_, j) => j !== i));
  const updateEdu = (i, f, v) => { const e = [...(cvData.educations || [])]; e[i] = { ...e[i], [f]: v }; setSection('educations', e); };

  // languages
  const addLang = () => setSection('languages', [...(cvData.languages || []), { language: '', proficiency: 'Fluent' }]);
  const removeLang = i => setSection('languages', (cvData.languages || []).filter((_, j) => j !== i));
  const updateLang = (i, f, v) => { const l = [...(cvData.languages || [])]; l[i] = { ...l[i], [f]: v }; setSection('languages', l); };

  // certifications
  const addCert = () => setSection('certifications', [...(cvData.certifications || []), { name: '', issuer: '', issueDate: '' }]);
  const removeCert = i => setSection('certifications', (cvData.certifications || []).filter((_, j) => j !== i));
  const updateCert = (i, f, v) => { const c = [...(cvData.certifications || [])]; c[i] = { ...c[i], [f]: v }; setSection('certifications', c); };

  // projects
  const addProject = () => setSection('projects', [...(cvData.projects || []), { name: '', description: '', link: '' }]);
  const removeProject = i => setSection('projects', (cvData.projects || []).filter((_, j) => j !== i));
  const updateProject = (i, f, v) => { const p = [...(cvData.projects || [])]; p[i] = { ...p[i], [f]: v }; setSection('projects', p); };

  // interests
  const addInterest = name => {
    const t = name.trim(); if (!t) return;
    const existing = (cvData.interests || []).map(x => typeof x === 'string' ? x : x.name || '');
    if (!existing.includes(t)) setSection('interests', [...(cvData.interests || []), t]);
  };
  const removeInterest = i => setSection('interests', (cvData.interests || []).filter((_, j) => j !== i));

  // custom sections
  const addCustom = () => setSection('custom_sections', [...(cvData.custom_sections || []), { title: '', content: '' }]);
  const removeCustom = i => setSection('custom_sections', (cvData.custom_sections || []).filter((_, j) => j !== i));
  const updateCustom = (i, f, v) => { const c = [...(cvData.custom_sections || [])]; c[i] = { ...c[i], [f]: v }; setSection('custom_sections', c); };

  // photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await cvAPI.uploadPhoto(cvId, file);
      updatePI('photo', res.data.photo_path || '');
      showToast('📸 Photo updated!');
    } catch { showToast('Photo upload failed', 'error'); }
    setPhotoUploading(false);
  };

  // PDF export
  const handleDownloadPDF = async () => {
    setExporting(true);
    try { await exportCVAsPDF(cv?.title || 'CV'); } catch (e) { console.error(e); }
    setExporting(false);
  };

  // ── AI: Feature 2 — Generate Summary ───────────────────────────────────────────────
  const handleGenerateSummary = useCallback(async () => {
    if (!canUseAI) return;
    setSummaryGenerating(true);
    try {
      const jd = jobDescription || atsJD || '';
      const res = await cvAPI.generateSummary(cvId, jd);
      if (res.data?.summary) {
        updatePI('summary', res.data.summary);
        showToast('✨ Summary written by AI!');
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Summary generation failed', 'error');
    } finally { setSummaryGenerating(false); }
  }, [cvId, canUseAI, jobDescription, atsJD]); // eslint-disable-line

  // ── AI: Feature 3 — Improve Bullets ───────────────────────────────────────────────
  const handleImproveBullets = useCallback(async (expIdx) => {
    if (!canUseAI) return;
    // Read exp at call time — not from closure
    const exp = (cvData.experiences || [])[expIdx];
    if (!exp) return;
    const rawDesc = exp.description || '';
    const bullets = rawDesc.split('\n').map(l => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
    // Use per-entry JD if available, fall back to global JD keywords
    const jdSnippet = (exp.jobDescription || '').trim();
    setBulletState(prev => ({ ...prev, [expIdx]: { loading: true, originals: bullets, suggestions: [], accepted: new Set() } }));
    try {
      const res = await cvAPI.improveBullets(cvId, {
        job_title: exp.position || exp.role || '',
        company: exp.company || '',
        bullets,
        jd_keywords: missingKeywords.slice(0, 10),
        jd_snippet: jdSnippet,
      });
      setBulletState(prev => ({ ...prev, [expIdx]: { loading: false, originals: bullets, suggestions: res.data.bullets || [], accepted: new Set() } }));
    } catch (err) {
      showToast(err.response?.data?.detail || 'Bullet improvement failed', 'error');
      setBulletState(prev => { const n = { ...prev }; delete n[expIdx]; return n; });
    }
  }, [cvId, cvData.experiences, missingKeywords, canUseAI]); // eslint-disable-line

  const handleAcceptBullet = (expIdx, bulletIdx) => {
    setBulletState(prev => {
      const st = { ...prev[expIdx], accepted: new Set(prev[expIdx].accepted) };
      if (st.accepted.has(bulletIdx)) st.accepted.delete(bulletIdx);
      else st.accepted.add(bulletIdx);
      return { ...prev, [expIdx]: st };
    });
  };

  const handleApplyBullets = (expIdx) => {
    const st = bulletState[expIdx];
    if (!st) return;
    const chosen = st.suggestions.filter((_, i) => st.accepted.has(i));
    if (!chosen.length) { showToast('Select at least one bullet to apply', 'error'); return; }
    const newDesc = chosen.map(b => `• ${b.replace(/^[•\-*]\s*/, '')}`).join('\n');
    updateExp(expIdx, 'description', newDesc);
    setBulletState(prev => { const n = { ...prev }; delete n[expIdx]; return n; });
    showToast('✅ Bullets applied!');
  };

  // ── AI: Feature 4 — Suggest Skills from JD ────────────────────────────────
  const handleSuggestSkills = useCallback(async () => {
    if (!canUseAI) return;
    if (!jobDescription.trim()) { showToast('Enter a job description first', 'error'); return; }
    setSuggestingSkills(true);
    try {
      const currentSkillNames = (cvData.skills || []).map(s => typeof s === 'string' ? s : s.name);
      const res = await cvAPI.suggestSkills(cvId, jobDescription, currentSkillNames);
      setSuggestedSkills(res.data?.suggested_skills || []);
      if (res.data?.suggested_skills?.length === 0) {
        showToast('No new skills to suggest', 'info');
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Skill suggestion failed', 'error');
      setSuggestedSkills([]);
    } finally { setSuggestingSkills(false); }
  }, [cvId, jobDescription, cvData.skills, canUseAI]); // eslint-disable-line

  const handleAddSuggestedSkill = (skill) => {
    const currentNames = (cvData.skills || []).map(s => typeof s === 'string' ? s : s.name);
    if (!currentNames.includes(skill)) {
      setSection('skills', [...(cvData.skills || []), { name: skill, level: '', category: '' }]);
      showToast(`✅ Added "${skill}" to skills`);
    }
  };

  // Cover letter generation (client-side)
  const handleGenerateCoverLetter = useCallback(() => {
    const jd = atsJD || jobDescription || '';
    setCoverLetterGenerating(true);
    setCoverLetterOpen(true);
    // Run in next tick so panel slides open before generation
    setTimeout(() => {
      const letter = generateCoverLetter(cvData, jd);
      setCoverLetter(letter);
      setCoverLetterGenerating(false);
    }, 80);
  }, [cvData, atsJD, jobDescription]);

  // ── ATS Score (client-side) ───────────────────────────────────────────────
  const handleRunATS = () => {
    if (!atsJD.trim()) { showToast('Paste a job description first', 'error'); return; }
    setAtsRunning(true);
    // Run in next tick so UI can update
    setTimeout(() => {
      const result = scoreResume(atsJD, cvData, theme);
      setAtsResult(result);
      setAtsRunning(false);
    }, 50);
  };

  const handleHighlightToggle = (keywords) => {
    if (keywords && keywords.length > 0) {
      setHighlightKeywords(keywords);
      setHighlightOn(true);
    } else {
      setHighlightKeywords([]);
      setHighlightOn(false);
    }
  };

  // ── AI: analyze keywords ─────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) { showToast('Please enter a job description', 'error'); return; }
    setAnalyzing(true); setSuggestions([]); setMatchScore(null); setEnhancedCV(null); setEnhanceMsg(''); setEnhanceStatus('');
    try {
      const res = await customizeAPI.analyzeCVWithJobDescription(cvId, jobDescription);
      const d = res.data;
      setSuggestions(d.suggestions || []); setMatchScore(d.score ?? null);
      setMatchedKeywords(d.matched_keywords || []); setMissingKeywords(d.missing_keywords || []);
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || err.message || 'Analysis failed'}`, 'error');
    } finally { setAnalyzing(false); }
  };

  const handleApplySuggestion = async (s, i) => {
    try {
      const res = await customizeAPI.applySuggestion(cvId, s.id);
      setAppliedIds(prev => new Set([...prev, i]));
      if (res.data?.updated_cv) setCVData(buildPreviewData(res.data.updated_cv));
      else { const r = await cvAPI.getOne(cvId); setCVData(buildPreviewData(r.data)); }
      showToast('✅ Suggestion applied!');
    } catch (err) { showToast(`❌ ${err.response?.data?.detail || err.message}`, 'error'); }
  };

  // ── AI: enhance ──────────────────────────────────────────────────────────
  const handleEnhanceWithAI = async () => {
    if (!jobDescription.trim()) { showToast('Please enter a job description', 'error'); return; }
    setEnhancing(true); setEnhancedCV(null); setEnhanceMsg(''); setEnhanceStatus('');
    try {
      const res = await cvAPI.enhanceForJob(cvId, jobDescription);
      const d = res.data;
      if (d.status === 'success' && d.enhanced_cv) {
        setCVData(buildPreviewData(d.enhanced_cv));
        setEnhancedCV(d.enhanced_cv);
        setEnhanceStatus('success');
        setEnhanceMsg('✅ AI rewrote Experiences, Projects & Skills. Review preview, then click Apply.');
      } else {
        setEnhanceStatus('error');
        setEnhanceMsg(d.message || 'AI enhancement failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Enhancement failed';
      setEnhanceStatus('error'); setEnhanceMsg(`❌ ${msg}`);
      showToast(`❌ ${msg}`, 'error');
    } finally { setEnhancing(false); }
  };

  const handleApplyAIChanges = async () => {
    if (!enhancedCV) return;
    setApplying(true);
    try {
      const res = await cvAPI.applyAIChanges(cvId, enhancedCV);
      const preview = buildPreviewData(res.data);
      setCVData(preview); setOriginalCVData(JSON.parse(JSON.stringify(preview)));
      setEnhancedCV(null); setEnhanceMsg(''); setEnhanceStatus('');
      showToast('🎉 AI changes saved!');
      try {
        const jd = jobDescription.trim();
        const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
        const role = lines[0]?.substring(0, 120) || 'Applied Role';
        const companyLine = lines.find(l => /\b(bei|at|for|@|company|firma)\b/i.test(l));
        const company = companyLine ? companyLine.replace(/^.*?[:\-@]\s*/, '').substring(0, 80) : 'Unknown Company';
        await jobApplicationAPI.create({ company, role, notes: `AI Enhancement. JD:\n${jd.substring(0, 500)}`, status: 'applied', applied_date: new Date().toISOString().slice(0, 10), cv_id: parseInt(cvId) });
        showToast('📌 Added to Job Tracker!');
      } catch { /* silent */ }
    } catch (err) { showToast(`❌ ${err.response?.data?.detail || err.message || 'Apply failed'}`, 'error'); }
    finally { setApplying(false); }
  };

  const handleDiscardEnhancement = () => {
    setCVData(JSON.parse(JSON.stringify(originalCVData)));
    setEnhancedCV(null); setEnhanceMsg(''); setEnhanceStatus('');
  };

  const openSaveJobForm = () => {
    const jd = jobDescription.trim();
    const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
    setSaveJobRole(lines[0]?.substring(0, 120) || '');
    setSaveJobCompany(''); setSaveJobStatus('saved'); setShowSaveJobForm(true);
  };

  const handleSaveToJobTracker = async (e) => {
    e.preventDefault();
    if (!saveJobCompany.trim() && !saveJobRole.trim()) { showToast('Fill in company or role', 'error'); return; }
    setSavingJob(true);
    try {
      await jobApplicationAPI.create({ company: saveJobCompany.trim() || 'Unknown', role: saveJobRole.trim() || 'Unknown', status: saveJobStatus, notes: `Saved from CV Customize. JD:\n${jobDescription.substring(0, 500)}`, applied_date: new Date().toISOString().slice(0, 10), cv_id: parseInt(cvId) });
      showToast('📌 Saved to Job Tracker!'); setShowSaveJobForm(false);
    } catch (err) { showToast(err.response?.data?.detail || 'Could not save', 'error'); }
    finally { setSavingJob(false); }
  };

  // ── Determine weak sections for accordion badges ───────────────────────────
  const weakSectionSet = new Set((atsResult?.weakSections || []).map(s => s.toLowerCase()));

  // ── Build the correct ordered list of section accordions ──────────────────
  const renderSectionAccordion = (key) => {
    const isWeak = weakSectionSet.has(key.toLowerCase());

    if (key === 'summary') return (
      <Accordion key="summary" icon="📝" label={t("Profile Summary")} warn={isWeak}>
        <div className="mt-2">
          {/* AI Summary Writer */}
          {canUseAI ? (
            <div className="flex items-center justify-end mb-1.5">
              <button
                onClick={handleGenerateSummary}
                disabled={summaryGenerating}
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition"
              >
                {summaryGenerating
                  ? <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Writing…</>
                  : <>✨ Write with AI</>}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 mb-1.5">
              🔒 AI writing requires Pro
            </div>
          )}
          <RichTextInput
            value={cvData.personal_info?.summary || ''}
            onChange={v => updatePI('summary', v)}
            placeholder="Write a compelling 2–3 sentence summary…"
            rows={4}
          />
        </div>
      </Accordion>
    );

    if (key === 'experience') return (
      <Accordion key="experience" icon="💼" label={t("Experience")} badge={(cvData.experiences || []).length} warn={isWeak}>
        <div className="space-y-3 mt-2">
          {(cvData.experiences || []).map((exp, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 space-y-2 relative">
              <button onClick={() => removeExp(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={LABEL}>Job Title</label><input className={INPUT} value={exp.position || exp.role || ''} onChange={e => updateExp(i, 'position', e.target.value)} placeholder="Software Engineer" /></div>
                <div><label className={LABEL}>Company</label><input className={INPUT} value={exp.company || ''} onChange={e => updateExp(i, 'company', e.target.value)} placeholder="Company Name" /></div>
                <div><label className={LABEL}>Location</label><input className={INPUT} value={exp.location || ''} onChange={e => updateExp(i, 'location', e.target.value)} placeholder="Munich, Germany" /></div>
                <div><label className={LABEL}>Start Date</label><input className={INPUT} value={exp.startDate || ''} onChange={e => updateExp(i, 'startDate', e.target.value)} placeholder="2022-06" /></div>
                <div><label className={LABEL}>End Date</label><input className={INPUT} value={exp.endDate || ''} onChange={e => updateExp(i, 'endDate', e.target.value)} placeholder="2025-01" disabled={exp.current} /></div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-gray-600 dark:text-slate-400"><input type="checkbox" className="accent-primary" checked={!!exp.current} onChange={e => updateExp(i, 'current', e.target.checked)} /> Currently here</label></div>
              </div>
              {/* Description + bullet improver */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={LABEL}>Responsibilities &amp; Achievements</label>
                  {canUseAI && (
                    <button
                      onClick={() => handleImproveBullets(i)}
                      disabled={bulletState[i]?.loading}
                      className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-50 transition"
                    >
                      {bulletState[i]?.loading
                        ? <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Improving…</>
                        : <>✨ Improve with AI</>}
                    </button>
                  )}
                </div>
                <RichTextInput value={exp.description || ''} onChange={v => updateExp(i, 'description', v)} rows={4} placeholder="• Led development of…&#10;• Reduced load time by 40%…" />
              </div>
              {/* Bullet diff view */}
              {bulletState[i] && !bulletState[i].loading && bulletState[i].suggestions.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">AI Suggested Bullets — select to apply</p>
                  <div className="space-y-1.5">
                    {bulletState[i].suggestions.map((bullet, bi) => (
                      <label key={bi} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-purple-600 mt-0.5 flex-shrink-0"
                          checked={bulletState[i].accepted.has(bi)}
                          onChange={() => handleAcceptBullet(i, bi)} />
                        <span className={`text-xs leading-relaxed ${bulletState[i].accepted.has(bi) ? 'text-purple-900 dark:text-purple-200 font-medium' : 'text-gray-600 dark:text-slate-400'}`}>{bullet}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleApplyBullets(i)} className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition">✓ Apply Selected</button>
                    <button onClick={() => setBulletState(prev => { const n = {...prev}; delete n[i]; return n; })} className="flex-1 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-xs rounded-lg transition">Discard</button>
                  </div>
                </div>
              )}
              {/* Per-job JD for AI targeting */}
              <details className="group">
                <summary className="text-[10px] text-gray-400 dark:text-slate-500 cursor-pointer select-none hover:text-gray-600 dark:hover:text-slate-300 transition list-none flex items-center gap-1">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  Job Description (for AI targeting)
                </summary>
                <textarea className={`${INPUT} mt-1.5 resize-none`} rows={3}
                  placeholder="Paste the JD for this specific role to help AI tailor bullets…"
                  value={exp.jobDescription || ''}
                  onChange={e => updateExp(i, 'jobDescription', e.target.value)} />
              </details>
            </div>
          ))}
          <button onClick={addExp} className={ADD_BTN}><span className="text-base">+</span> Add Position</button>
        </div>
      </Accordion>
    );

    if (key === 'education') return (
      <Accordion key="education" icon="🎓" label={t("Education")} badge={(cvData.educations || []).length} warn={isWeak}>
        <div className="space-y-3 mt-2">
          {(cvData.educations || []).map((edu, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 space-y-2 relative">
              <button onClick={() => removeEdu(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={LABEL}>Degree</label><input className={INPUT} value={edu.degree || ''} onChange={e => updateEdu(i, 'degree', e.target.value)} placeholder="B.Sc. Computer Science" /></div>
                <div><label className={LABEL}>Institution</label><input className={INPUT} value={edu.institution || ''} onChange={e => updateEdu(i, 'institution', e.target.value)} placeholder="TU Munich" /></div>
                <div><label className={LABEL}>Field of Study</label><input className={INPUT} value={edu.field || ''} onChange={e => updateEdu(i, 'field', e.target.value)} placeholder="Computer Science" /></div>
                <div><label className={LABEL}>Grade / GPA</label><input className={INPUT} value={edu.grade || ''} onChange={e => updateEdu(i, 'grade', e.target.value)} placeholder="1.8 / 3.7" /></div>
                <div><label className={LABEL}>Start</label><input className={INPUT} value={edu.startDate || ''} onChange={e => updateEdu(i, 'startDate', e.target.value)} placeholder="2015" /></div>
                <div><label className={LABEL}>End</label><input className={INPUT} value={edu.endDate || ''} onChange={e => updateEdu(i, 'endDate', e.target.value)} placeholder="2019" /></div>
              </div>
            </div>
          ))}
          <button onClick={addEdu} className={ADD_BTN}><span className="text-lg">+</span> Add Education</button>
        </div>
      </Accordion>
    );

    if (key === 'skills') return (
      <Accordion key="skills" icon="⚡" label={t("Skills")} badge={(cvData.skills || []).length} warn={isWeak}>
        <div className="mt-2"><SkillsInput skills={cvData.skills || []} onChange={v => setSection('skills', v)} onSuggestSkills={handleSuggestSkills} suggestedSkills={suggestedSkills} onAddSuggested={handleAddSuggestedSkill} suggestingSkills={suggestingSkills} /></div>
      </Accordion>
    );

    if (key === 'languages') return (
      <Accordion key="languages" icon="🌐" label={t("Languages")} badge={(cvData.languages || []).length}>
        <div className="space-y-2 mt-2">
          {(cvData.languages || []).map((lang, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={INPUT} placeholder="Language" value={lang.language || ''} onChange={e => updateLang(i, 'language', e.target.value)} />
              <select className={INPUT} value={lang.proficiency || 'Fluent'} onChange={e => updateLang(i, 'proficiency', e.target.value)}>
                {['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'].map(l => <option key={l}>{l}</option>)}
              </select>
              <button onClick={() => removeLang(i)} className="text-red-400 hover:text-red-600 px-1 flex-shrink-0">✕</button>
            </div>
          ))}
          <button onClick={addLang} className={ADD_BTN}><span className="text-lg">+</span> Add Language</button>
        </div>
      </Accordion>
    );

    if (key === 'projects') return (
      <Accordion key="projects" icon="🚀" label={t("Projects")} badge={(cvData.projects || []).length}>
        <div className="space-y-3 mt-2">
          {(cvData.projects || []).map((proj, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 space-y-2 relative">
              <button onClick={() => removeProject(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              <div><label className={LABEL}>Project Name</label><input className={INPUT} value={proj.name || ''} onChange={e => updateProject(i, 'name', e.target.value)} placeholder="My Awesome Project" /></div>
              <div><label className={LABEL}>URL / GitHub</label><input className={INPUT} value={proj.link || ''} onChange={e => updateProject(i, 'link', e.target.value)} placeholder="github.com/user/repo" /></div>
              <div>
                <label className={LABEL}>Description</label>
                <RichTextInput value={proj.description || ''} onChange={v => updateProject(i, 'description', v)} rows={3} />
              </div>
            </div>
          ))}
          <button onClick={addProject} className={ADD_BTN}><span className="text-lg">+</span> Add Project</button>
        </div>
      </Accordion>
    );

    if (key === 'certifications') return (
      <Accordion key="certifications" icon="🏅" label={t("Certifications")} badge={(cvData.certifications || []).length}>
        <div className="space-y-2 mt-2">
          {(cvData.certifications || []).map((cert, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 grid grid-cols-3 gap-2 relative">
              <button onClick={() => removeCert(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              <div className="col-span-2"><label className={LABEL}>Certification Name</label><input className={INPUT} value={cert.name || ''} onChange={e => updateCert(i, 'name', e.target.value)} /></div>
              <div><label className={LABEL}>Issue Date</label><input className={INPUT} value={cert.issueDate || ''} onChange={e => updateCert(i, 'issueDate', e.target.value)} /></div>
              <div className="col-span-3"><label className={LABEL}>Issuing Body</label><input className={INPUT} value={cert.issuer || ''} onChange={e => updateCert(i, 'issuer', e.target.value)} /></div>
            </div>
          ))}
          <button onClick={addCert} className={ADD_BTN}><span className="text-lg">+</span> Add Certification</button>
        </div>
      </Accordion>
    );

    if (key === 'interests') return (
      <Accordion key="interests" icon="🎯" label="Interests & Hobbies" badge={(cvData.interests || []).length}>
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(cvData.interests || []).map((interest, i) => {
              const txt = typeof interest === 'string' ? interest : interest?.name || '';
              return txt ? (
                <span key={i} className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-0.5 text-xs font-medium">
                  {txt}<button onClick={() => removeInterest(i)} className="hover:text-red-500 ml-0.5">×</button>
                </span>
              ) : null;
            })}
          </div>
          <div className="flex gap-2">
            <input ref={interestRef} className={INPUT} placeholder="e.g. Photography, Hiking…"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterest(e.target.value); e.target.value = ''; } }} />
            <button onClick={() => { if (interestRef.current) { addInterest(interestRef.current.value); interestRef.current.value = ''; } }}
              className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition">+</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Press Enter or + to add</p>
        </div>
      </Accordion>
    );

    if (key === 'custom') return (
      <Accordion key="custom" icon="📌" label="Custom Sections" badge={(cvData.custom_sections || []).length}>
        <div className="space-y-3 mt-2">
          {(cvData.custom_sections || []).map((cs, i) => (
            <div key={i} className="p-3 bg-purple-50 dark:bg-purple-950 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2 relative">
              <button onClick={() => removeCustom(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
              <div><label className={LABEL}>Section Title</label><input className={INPUT} placeholder="e.g. Publications, Awards…" value={cs.title || ''} onChange={e => updateCustom(i, 'title', e.target.value)} /></div>
              <div>
                <label className={LABEL}>Content</label>
                <RichTextInput value={cs.content || ''} onChange={v => updateCustom(i, 'content', v)} placeholder="Write content…" rows={4} />
              </div>
            </div>
          ))}
          <button onClick={addCustom} className={ADD_BTN}><span className="text-lg">+</span> Add Custom Section</button>
        </div>
      </Accordion>
    );

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
      <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--app-bg)' }}
      // intentionally using CSS var so dark: and light: both work
    >
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="app-nav border-b app-border px-6 py-3 flex items-center justify-between sticky top-14 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/cv-editor/${cvId}`)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">CV Studio</h1>
            <p className="text-xs app-text-secondary">{cv?.title}</p>
          </div>
          {autoSaveState === 'saving' && <span className="text-xs text-gray-400 animate-pulse">⟳ Saving…</span>}
          {autoSaveState === 'saved' && <span className="text-xs text-green-600">✓ Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          {highlightOn && (
            <button onClick={() => { setHighlightKeywords([]); setHighlightOn(false); }}
              className="text-xs px-3 py-1.5 font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition flex items-center gap-1">
              🔦 Highlighting — Click to clear
            </button>
          )}
          <button onClick={() => navigate(`/cv-editor/${cvId}`)} className="text-xs px-3 py-1.5 font-medium app-text-secondary rounded-lg transition" style={{ background: 'var(--app-sidebar)', border: '1px solid var(--app-border)' }}>
            Full Editor
          </button>
          {canUseAI ? (
            <button
              onClick={handleGenerateCoverLetter}
              className="text-xs px-3 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Cover Letter
            </button>
          ) : (
            <span className="text-xs px-3 py-1.5 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-600 rounded-lg flex items-center gap-1">
              🔒 Cover Letter (Pro)
            </span>
          )}
          <button onClick={handleDownloadPDF} disabled={exporting} className="text-xs px-4 py-1.5 font-semibold text-white bg-primary hover:bg-primary-700 disabled:opacity-60 rounded-lg transition flex items-center gap-1.5">
            {exporting ? (
              <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Exporting…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>

        {/* ── Left panel ── */}
        <div className="w-[480px] flex-none border-r app-border flex flex-col overflow-hidden" style={{ background: 'var(--app-sidebar)' }}>

          {/* Scrollable content - tab switcher */}
          <div className="flex app-panel border-b app-border p-2 gap-1.5 flex-shrink-0">
            <button onClick={() => setActiveTab('customize')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === 'customize' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
              ✏️ Customize
            </button>
            <button onClick={() => setActiveTab('ats')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === 'ats' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
              🎯 ATS Score
            </button>
            <button onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${activeTab === 'ai' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
              ✨ AI Enhance
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--app-sidebar)' }}>

            {/* ══ CUSTOMIZE TAB ══════════════════════════════════════════════ */}
            {activeTab === 'customize' && (
              <>
                {/* Section Order & Visibility */}
                <SectionReorder
                  sections={sectionOrder}
                  hiddenSections={hiddenSections}
                  onReorder={handleReorder}
                  onToggleVisible={handleToggleVisible}
                />

                {/* Theme & Design */}
                <ThemePanel theme={theme} onThemeChange={setTheme} />

                {/* Personal Information */}
                <Accordion icon="👤" label="Personal Information" defaultOpen>
                  <div className="space-y-3 mt-2">
                    {/* Photo row */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600">
                      {cvData.personal_info?.photo ? (() => {
                        const src = cvData.personal_info.photo.startsWith('/uploads/')
                          ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}${cvData.personal_info.photo}`
                          : cvData.personal_info.photo;
                        return <img src={src} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-primary-200" />;
                      })()
                        : <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl border-2 border-dashed border-gray-300 flex-shrink-0">👤</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Profile Photo</p>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => photoRef.current?.click()} disabled={photoUploading}
                            className="text-xs px-2.5 py-1 bg-primary text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50">
                            {photoUploading ? 'Uploading…' : '📷 Upload'}
                          </button>
                          {cvData.personal_info?.photo && (
                            <button onClick={() => updatePI('photo', '')}
                              className="text-xs px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition">
                              Remove
                            </button>
                          )}
                        </div>
                        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-8">Shape</span>
                          {[{ k: 'round', l: '⬤' }, { k: 'square', l: '⬛' }].map(({ k, l }) => (
                            <button key={k} onClick={() => updatePI('photoShape', k)}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium border transition ${(cvData.personal_info?.photoShape || 'round') === k ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary'}`}>
                              {l}
                            </button>
                          ))}
                          <input type="range" min="40" max="140" step="4" value={cvData.personal_info?.photoSize || 76}
                            onChange={e => updatePI('photoSize', parseInt(e.target.value))}
                            className="flex-1 h-1.5 accent-primary ml-1" />
                          <span className="text-[10px] text-gray-500 w-8 text-right">{cvData.personal_info?.photoSize || 76}px</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[['Full Name', 'name', 'Your Name'], ['Job Title', 'jobTitle', 'Software Engineer'], ['Email', 'email', 'email@example.com'], ['Phone', 'phone', '+49 123 456789'], ['Location', 'location', 'Munich, Germany'], ['LinkedIn', 'linkedin', 'linkedin.com/in/you'], ['Website', 'website', 'yoursite.com']].map(([lbl, field, ph]) => (
                        <div key={field}>
                          <label className={LABEL}>{lbl}</label>
                          <input className={INPUT} placeholder={ph} value={cvData.personal_info?.[field] || ''}
                            onChange={e => updatePI(field, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </Accordion>

                {/* Ordered section accordions */}
                {sectionOrder.map(key => renderSectionAccordion(key))}
              </>
            )}

            {/* ══ ATS SCORE TAB ════════════════════════════════════════════ */}
            {activeTab === 'ats' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">🎯 Client-Side ATS Scoring</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Instant analysis — no API calls. Scores keyword match (40), skills (25), section completeness (20), and formatting safety (15).</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">Job Description</label>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Paste the full job posting to analyze your CV match</p>
                  <textarea value={atsJD} onChange={e => setAtsJD(e.target.value)}
                    placeholder="Paste the full job description here…" rows={7}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />

                  <button onClick={handleRunATS} disabled={atsRunning || !atsJD.trim()}
                    className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2">
                    {atsRunning
                      ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Analyzing…</>
                      : '🎯 Run ATS Score'
                    }
                  </button>
                </div>

                {atsResult && (
                  <ATSScorePanel
                    result={atsResult}
                    onHighlight={handleHighlightToggle}
                    highlightOn={highlightOn}
                    cvData={cvData}
                  />
                )}
              </div>
            )}

            {/* ══ AI ENHANCE TAB ════════════════════════════════════════════ */}
            {activeTab === 'ai' && (
              <div className="space-y-5">
                {!canUseAI ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Access Disabled</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      The AI features have been disabled for your account. Please contact the administrator for access.
                    </p>
                  </div>
                ) : (
                  <>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200 mb-1">Job Description</label>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Paste the job posting. Choose keyword analysis or full AI rewrite.</p>
                  <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here…" rows={7}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 transition resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />

                  <div className="flex gap-2 mt-3">
                    {canUseAI ? (
                      <>
                        <button onClick={handleAnalyze} disabled={analyzing || enhancing || !jobDescription.trim()}
                          className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 text-gray-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5">
                          {analyzing ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Analyzing…</> : <>🔍 Analyze Keywords</>}
                        </button>
                        <button onClick={handleEnhanceWithAI} disabled={analyzing || enhancing || !jobDescription.trim()}
                          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5">
                          {enhancing ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Enhancing…</> : <>⚡ Enhance with AI</>}
                        </button>
                      </>
                    ) : (
                      <div className="w-full py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                        🔒 AI features require Pro access. Contact your admin.
                      </div>
                    )}
                  </div>

                  {jobDescription.trim() && (
                    <div className="mt-2">
                      {!showSaveJobForm ? (
                        <button onClick={openSaveJobForm} className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5">
                          💾 Save to Job Tracker
                        </button>
                      ) : (
                        <form onSubmit={handleSaveToJobTracker} className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-semibold text-amber-800">📌 Save Job Opportunity</p>
                          <div><label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Company</label><input value={saveJobCompany} onChange={e => setSaveJobCompany(e.target.value)} placeholder="e.g. Google" className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400" /></div>
                          <div><label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Role</label><input value={saveJobRole} onChange={e => setSaveJobRole(e.target.value)} placeholder="e.g. Software Engineer" className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400" /></div>
                          <div><label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Status</label>
                            <select value={saveJobStatus} onChange={e => setSaveJobStatus(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none">
                              <option value="saved">💾 Saved</option><option value="applied">📤 Applied</option><option value="interview">🎯 Interview</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={savingJob} className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg">{savingJob ? 'Saving…' : '✓ Save'}</button>
                            <button type="button" onClick={() => setShowSaveJobForm(false)} className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg">Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Result banner */}
                {enhanceMsg && (
                  <div className={`rounded-xl p-4 border text-sm ${enhanceStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <p className="font-medium mb-1">{enhanceStatus === 'success' ? '✨ Enhancement Ready' : '⚠️ Failed'}</p>
                    <p className="text-xs leading-relaxed">{enhanceMsg}</p>
                    {enhanceStatus === 'success' && enhancedCV && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleApplyAIChanges} disabled={applying} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-lg transition">
                          {applying ? 'Saving…' : '✓ Apply Changes'}
                        </button>
                        <button onClick={handleDiscardEnhancement} className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 font-semibold text-xs rounded-lg transition">Discard</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Match score */}
                {matchScore !== null && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-5">
                      <ScoreRing score={matchScore} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">
                          {matchScore >= 70 ? '🎉 Strong match!' : matchScore >= 40 ? '⚡ Good potential' : '⚠️ Needs work'}
                        </p>
                        {matchedKeywords.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-green-700 mb-1">✓ Matched</p>
                            <div className="flex flex-wrap gap-1">
                              {matchedKeywords.slice(0, 8).map((k, i) => <span key={i} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{k}</span>)}
                            </div>
                          </div>
                        )}
                        {missingKeywords.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 mb-1">✕ Missing</p>
                            <div className="flex flex-wrap gap-1">
                              {missingKeywords.slice(0, 8).map((k, i) => <span key={i} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{k}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">AI Keyword Suggestions</h3>
                      <span className="text-xs text-gray-500 dark:text-slate-400">{suggestions.length} suggestions</span>
                    </div>
                    <div className="space-y-3">
                      {suggestions.map((s, i) => (
                        <div key={i} className={`rounded-xl border p-4 ${appliedIds.has(i) ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{s.section}</span>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{s.title}</h4>
                            </div>
                            {appliedIds.has(i)
                              ? <span className="text-xs text-green-700 font-medium">✓ Applied</span>
                              : s.id && <button onClick={() => handleApplySuggestion(s, i)} className="text-xs px-3 py-1 bg-primary hover:bg-primary-700 text-white font-semibold rounded-lg">Apply</button>
                            }
                          </div>
                          <p className="text-xs text-gray-600">{s.current}</p>
                          {s.suggested && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-[10px] text-amber-700 font-semibold mb-0.5">Suggested:</p>
                              <p className="text-xs text-amber-900">{s.suggested}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Live Preview ── */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center py-6 px-2 min-w-0" style={{ background: 'var(--app-bg)' }}>
          {highlightOn && (
            <div className="w-full max-w-2xl mb-3 px-4 py-2 bg-amber-100 border border-amber-300 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
              🔦 Highlighting {highlightKeywords.length} missing keywords in preview
              <button onClick={() => { setHighlightKeywords([]); setHighlightOn(false); }} className="ml-auto text-amber-600 hover:text-amber-800 underline">Clear</button>
            </div>
          )}
          <div style={{ width: '100%', maxWidth: 794, position: 'relative' }}>
            <div style={{ width: 794, transform: 'scale(var(--s,1))', transformOrigin: 'top left' }}
              ref={el => {
                if (!el) return;
                const parentW = el.parentElement?.offsetWidth || 794;
                const s = Math.min(1, parentW / 794);
                el.style.setProperty('--s', s);
                el.parentElement.style.height = (1123 * s) + 'px';
              }}
            >
              <div id="cv-preview-root" className="shadow-2xl rounded-sm overflow-hidden">
                <CVPreview data={cvData} theme={theme} highlightKeywords={highlightKeywords} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Letter slide-in panel */}
      <CoverLetterPanel
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        letter={coverLetter}
        generating={coverLetterGenerating}
        onRegenerate={handleGenerateCoverLetter}
        cvName={cv?.title || 'CV'}
        jdJobTitle={(() => {
          const jd = (atsJD || jobDescription || '').trim();
          const firstLine = jd.split('\n')[0]?.trim() || '';
          return firstLine.substring(0, 80);
        })()}
        cvJobTitle={cvData.personal_info?.jobTitle || cvData.personal_info?.title || cv?.title || ''}
      />
    </div>
  );
};

export default CVCustomizePage;

