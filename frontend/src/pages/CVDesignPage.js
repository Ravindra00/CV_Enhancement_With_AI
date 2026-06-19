import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { cvAPI } from '../services/api';
import CVPreview from '../components/CVPreview';
import ThemePanel from '../components/ThemePanel';
import SectionReorder, { DEFAULT_SECTION_ORDER } from '../components/SectionReorder';
import { exportCVAsPDF } from '../utils/printCV';

/* Debounce helper */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

const CVDesignPage = () => {
  const { cvId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canUseAI = user?.ai_access === true || user?.is_superuser === true;
  
  const [cv, setCV] = useState(null);
  const [cvData, setCVData] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoSaveState, setAutoSaveState] = useState('idle');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    cvAPI.getOne(cvId).then(res => {
      setCV(res.data);
      // Normalize data for preview (similar to CVCustomizePage)
      const raw = res.data;
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
      
      setCVData({
        personal_info: raw.personal_info || {},
        experiences: exps,
        projects: raw.projects || [],
        skills: skills,
        educations: edus,
        languages: raw.languages || [],
        certifications: raw.certifications || [],
        interests: raw.interests || [],
        custom_sections: raw.custom_sections || [],
        theme: raw.theme || { primaryColor: '#1a1a1a', fontFamily: 'Inter, system-ui, sans-serif', layout: 'clean', accentStyle: 'line', pageMargin: 32, sectionSpacing: 12, columnSplit: 35 },
      });
      setTimeout(() => setIsInitialLoad(false), 500);
    }).catch(err => {
      showToast('Failed to load CV', 'error');
    }).finally(() => {
      setLoading(false);
    });
  }, [cvId]);

  const debouncedTheme = useDebounce(cvData.theme, 1000);
  
  useEffect(() => {
    if (!cvId || isInitialLoad) return;
    setAutoSaveState('saving');
    // Only update the theme portion for this page to avoid overwriting other edits
    cvAPI.update(cvId, {
        title: cv?.title || 'My CV',
        personal_info: cvData.personal_info,
        experiences: cvData.experiences,
        educations: cvData.educations,
        skills: cvData.skills,
        certifications: cvData.certifications,
        languages: cvData.languages,
        projects: cvData.projects,
        interests: cvData.interests,
        custom_sections: cvData.custom_sections,
        theme: debouncedTheme,
    })
      .then(() => { setAutoSaveState('saved'); setTimeout(() => setAutoSaveState('idle'), 2500); })
      .catch(() => setAutoSaveState('idle'));
  }, [debouncedTheme, cvId]); // eslint-disable-line

  const setTheme = useCallback(t => setCVData(prev => ({ ...prev, theme: t })), []);

  const sectionOrder = cvData.theme?.sectionOrder?.length ? cvData.theme.sectionOrder : DEFAULT_SECTION_ORDER;
  const hiddenSections = new Set(cvData.theme?.hiddenSections || []);

  const handleReorder = useCallback((newOrder) => {
    setCVData(prev => ({ ...prev, theme: { ...prev.theme, sectionOrder: newOrder } }));
  }, []);

  const handleToggleVisible = useCallback((key) => {
    setCVData(prev => {
      const theme = prev.theme || {};
      const newHidden = new Set(theme.hiddenSections || []);
      if (newHidden.has(key)) newHidden.delete(key);
      else newHidden.add(key);
      return { ...prev, theme: { ...theme, hiddenSections: Array.from(newHidden) } };
    });
  }, []);

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      await exportCVAsPDF(cv?.title || 'CV', {
        footerLabel: cvData?.personal_info?.name || cv?.title || 'CV',
      });
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-slate-100">Design Studio</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">{cv?.title}</p>
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-500 font-normal ml-2">
            {autoSaveState === 'saving' && <span className="animate-pulse text-primary">⟳ Saving…</span>}
            {autoSaveState === 'saved' && <span className="text-green-600">✓ Saved</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/cv-editor/${cvId}`)} className="text-xs px-3 py-1.5 font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition">
            ✏️ Content Editor
          </button>
          <button onClick={() => navigate(`/cv/${cvId}/customize`)} className="text-xs px-3 py-1.5 font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg transition">
            ✨ AI Enhance
          </button>
          <button onClick={handleDownloadPDF} disabled={exporting} className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 transition flex items-center gap-1">
            {exporting ? (
              <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Exporting…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download PDF</>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 53px)' }}>
        {/* Left panel: Design Controls */}
        <div className="w-[500px] flex-shrink-0 overflow-y-auto bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 space-y-4">
          <SectionReorder
            sections={sectionOrder}
            hiddenSections={hiddenSections}
            onReorder={handleReorder}
            onToggleVisible={handleToggleVisible}
          />
          <div className="border-t border-gray-200 dark:border-slate-700 my-4" />
          <ThemePanel theme={cvData.theme} onThemeChange={setTheme} defaultOpen={true} hideHeader={true} />
        </div>

        {/* Right panel: Live Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-slate-900 flex flex-col items-center py-6 px-2 min-w-0">
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
                <CVPreview data={cvData} theme={cvData.theme} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVDesignPage;
