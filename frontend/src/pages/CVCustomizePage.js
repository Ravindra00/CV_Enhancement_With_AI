import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cvAPI, customizeAPI } from '../services/api';
import CVPreview from '../components/CVPreview';

const CVCustomizePage = () => {
  const params = useParams();
  const cvId = params.id || params.cvId;  // support /cv/:id/customize and /cv-customize/:cvId
  const navigate = useNavigate();
  const [cv, setCV] = useState(null);
  const [cvData, setCVData] = useState({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [matchScore, setMatchScore] = useState(null);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [missingKeywords, setMissingKeywords] = useState([]);
  const [toast, setToast] = useState(null);
  const [previewScale, setPreviewScale] = useState(0.48);

  useEffect(() => {
    fetchCV();
    const handleResize = () => setPreviewScale(window.innerWidth > 1600 ? 0.55 : 0.45);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cvId]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCV = async () => {
    try {
      const r = await cvAPI.getOne(cvId);
      setCV(r.data);
      setCVData(r.data.parsed_data || {});
      // setCVData(mapBackendToPreview(r.data))
    } catch { showToast('Failed to load CV', 'error'); }
    finally { setLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) { showToast('Please enter a job description', 'error'); return; }
    setAnalyzing(true);
    setSuggestions([]);
    setMatchScore(null);
    try {
      const res = await customizeAPI.analyzeCVWithJobDescription(cvId, jobDescription);
      const d = res.data;
      setSuggestions(d.suggestions || []);
      setMatchScore(d.score ?? null);
      setMatchedKeywords(d.matched_keywords || []);
      setMissingKeywords(d.missing_keywords || []);
    } catch { showToast('Analysis failed. Try again.', 'error'); }
    finally { setAnalyzing(false); }
  };

  const handleApply = async (suggestion, index) => {
    try {
      await customizeAPI.applySuggestion(cvId, suggestion.id);
      setAppliedIds(prev => new Set([...prev, index]));
      showToast('Suggestion applied!');
      // Refresh cv data to update preview
      const r = await cvAPI.getOne(cvId);
      setCVData(r.data.parsed_data || {});
    } catch { showToast('Failed to apply suggestion', 'error'); }
  };

  const handleDownloadPDF = async () => {
    try {
      showToast('Generating PDF…');
      const token = JSON.parse(localStorage.getItem('auth-store') || '{}')?.state?.token;
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/cvs/${cvId}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${cv?.title || 'CV'}_enhanced.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('PDF export failed', 'error'); }
  };

  const ScoreRing = ({ score }) => {
    const color = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
    const r = 28, circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className="flex flex-col items-center">
        <svg width={72} height={72} viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="text-center -mt-14">
          <span className="text-xl font-bold text-gray-900">{score}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-8 font-medium">Match Score</p>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white toast ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-14 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/cv-editor/${cvId}`)} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">AI Enhancement</h1>
            <p className="text-xs text-gray-500">{cv?.title}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI Powered
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/cv-editor/${cvId}`)} className="text-xs px-3 py-1.5 font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            Edit CV
          </button>
          <button onClick={handleDownloadPDF} className="text-xs px-4 py-1.5 font-semibold text-white bg-primary hover:bg-primary-700 rounded-lg transition flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>
        {/* Left: Job description + results */}
        <div className="w-[420px] flex-none border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* JD Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Job Description</label>
              <p className="text-xs text-gray-500 mb-3">Paste the job posting below. Our AI will analyze how well your CV matches and suggest improvements.</p>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={8}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 transition resize-none"
              />
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !jobDescription.trim()}
                className="w-full mt-3 py-2.5 bg-primary hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Analyzing with AI…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Analyze & Get Suggestions
                  </>
                )}
              </button>
            </div>

            {/* Match Score */}
            {matchScore !== null && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-5">
                  <ScoreRing score={matchScore} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {matchScore >= 70 ? '🎉 Strong match!' : matchScore >= 40 ? '⚡ Good potential' : '⚠️ Needs improvement'}
                    </p>
                    {matchedKeywords.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-green-700 mb-1">✓ Matched keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {matchedKeywords.slice(0, 8).map((k, i) => (
                            <span key={i} className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {missingKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1">✕ Missing keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {missingKeywords.slice(0, 8).map((k, i) => (
                            <span key={i} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{k}</span>
                          ))}
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
                  <h3 className="text-sm font-semibold text-gray-800">AI Suggestions</h3>
                  <span className="text-xs text-gray-500">{suggestions.length} suggestions</span>
                </div>
                <div className="space-y-3">
                  {suggestions.map((s, i) => (
                    <div key={i} className={`rounded-xl border p-4 transition ${appliedIds.has(i) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.section}</span>
                          <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{s.title}</h4>
                        </div>
                        {appliedIds.has(i) ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-medium whitespace-nowrap">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApply(s, i)}
                            className="text-xs px-3 py-1 bg-primary hover:bg-primary-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{s.description}</p>
                      <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700 border border-gray-100">
                        <span className="font-medium text-gray-900">Suggestion: </span>{s.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!analyzing && suggestions.length === 0 && !matchScore && (
              <div className="text-center py-10 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
                <p className="text-sm">Paste a job description to get AI-powered suggestions</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="flex-1 bg-gray-200 overflow-auto flex flex-col items-center pt-6 pb-10">
          <div className="mb-3 text-xs text-gray-500 font-medium">Live Preview</div>
          <div style={{ width: 794 * previewScale + 32 }}>
            <div style={{ width: 794, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              <CVPreview data={cvData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVCustomizePage;
