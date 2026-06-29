import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cvAPI, coverLetterAPI } from '../services/api';
import { jsPDF } from 'jspdf';

const LANG_OPTIONS = [
  { value: 'auto', label: '🌐 Auto-detect' },
  { value: 'Deutsch', label: '🇩🇪 Deutsch' },
  { value: 'English', label: '🇬🇧 English' },
  { value: 'French', label: '🇫🇷 French' },
  { value: 'Spanish', label: '🇪🇸 Spanish' },
];

const SESS_LANG_KEY = 'ag_cl_language';
const SESS_JD_KEY   = 'ag_cl_jobdesc';

/* ─── Small Preview Modal ─────────────────────────────────────────── */
const LetterPreviewModal = ({ letter, title, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(letter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadPDF = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const margin = 22, pageW = 210, pageH = 297, usableW = pageW - margin * 2;
    let y = margin;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(30, 30, 30);
    for (const rawLine of letter.split('\n')) {
      const trimmed = rawLine.trim();
      if (trimmed === '') { y += 4; continue; }
      const wrapped = pdf.splitTextToSize(trimmed, usableW);
      for (const wl of wrapped) {
        if (y + 6 > pageH - margin) { pdf.addPage(); y = margin; }
        pdf.text(wl, margin, y);
        y += 5.5;
      }
      y += 1;
    }
    pdf.save(`${(title || 'cover_letter').replace(/[^a-z0-9_]/gi, '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="font-bold text-gray-900 dark:text-slate-100">📄 Cover Letter Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition font-medium"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-700 transition font-medium"
            >
              ⬇️ Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Letter body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Decorative letter paper */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
              {letter}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ────────────────────────────────────────────────────── */
const CoverLetterGeneratorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cvId = parseInt(searchParams.get('cvId')) || null;

  const [cv, setCV] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobDescription, setJobDescription] = useState(
    () => sessionStorage.getItem(SESS_JD_KEY) || ''
  );
  const [jobUrl, setJobUrl] = useState('');
  const [coverLetterTitle, setCoverLetterTitle] = useState('AI Generated Cover Letter');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [generatedLetterId, setGeneratedLetterId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [language, setLanguage] = useState(
    () => sessionStorage.getItem(SESS_LANG_KEY) || 'auto'
  );

  // New sender/recipient fields
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');

  // Persist language + JD to sessionStorage
  useEffect(() => { sessionStorage.setItem(SESS_LANG_KEY, language); }, [language]);
  useEffect(() => { sessionStorage.setItem(SESS_JD_KEY, jobDescription); }, [jobDescription]);

  useEffect(() => {
    if (cvId) fetchCV();
  }, [cvId]); // eslint-disable-line

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchCV = async () => {
    try {
      setLoading(true);
      const res = await cvAPI.getOne(cvId);
      setCV(res.data);
    } catch (err) {
      showToast('Failed to load CV', 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractJobDescriptionFromUrl = async () => {
    if (!jobUrl.trim()) { showToast('Please enter a job URL', 'error'); return; }
    try {
      setGenerating(true);
      const res = await coverLetterAPI.extractFromURL(jobUrl);
      setJobDescription(res.data.job_description);
      showToast('Job description extracted successfully');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to extract job description', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateAndSaveCoverLetter = async () => {
    if (!jobDescription.trim()) { showToast('Please enter a job description', 'error'); return; }
    if (!cvId) { showToast('CV not selected', 'error'); return; }

    try {
      setGenerating(true);
      setGeneratedLetter('');
      setGeneratedLetterId(null);
      
      let enhancedJD = jobDescription;
      if (senderName || senderContact || recipientName || recipientCompany) {
        enhancedJD += "\n\nAdditional details for the letter:\n";
        if (senderName) enhancedJD += `- Sender Name: ${senderName}\n`;
        if (senderContact) enhancedJD += `- Sender Contact: ${senderContact}\n`;
        if (recipientName) enhancedJD += `- Recipient Name: ${recipientName}\n`;
        if (recipientCompany) enhancedJD += `- Recipient Company: ${recipientCompany}\n`;
      }

      const res = await coverLetterAPI.generateWithAI(cvId, enhancedJD, coverLetterTitle, language);
      const letterText = res.data.content?.text || res.data.content;
      if (!letterText) { showToast('Error: No content in response', 'error'); return; }
      setGeneratedLetter(letterText);
      setGeneratedLetterId(res.data.id);
      showToast('Cover letter generated and saved!');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to generate cover letter';
      showToast(detail, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setJobDescription('');
    setJobUrl('');
    setGeneratedLetter('');
    setGeneratedLetterId(null);
    setCoverLetterTitle('AI Generated Cover Letter');
    sessionStorage.removeItem(SESS_JD_KEY);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <span>{toast.msg}</span>
          {toast.type === 'error' && (
            <button onClick={generateAndSaveCoverLetter} className="underline text-xs font-bold opacity-80 hover:opacity-100">
              Retry
            </button>
          )}
        </div>
      )}

      {/* Preview modal */}
      {showPreview && generatedLetter && (
        <LetterPreviewModal
          letter={generatedLetter}
          title={coverLetterTitle}
          onClose={() => setShowPreview(false)}
        />
      )}

      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Generate Cover Letter</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">AI-powered with {cv?.title || 'selected CV'}</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: Input ── */}
          <div className="space-y-5">
            {/* Job Description */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Job Description</h2>

              {/* URL extractor */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Extract from URL (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://linkedin.com/jobs/..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    onClick={extractJobDescriptionFromUrl}
                    disabled={generating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {generating ? '…' : 'Extract'}
                  </button>
                </div>
              </div>

              {/* JD textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Or Paste Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Sender / Recipient Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Letter Details (Optional)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Sender Contact</label>
                  <input
                    type="text"
                    value={senderContact}
                    onChange={e => setSenderContact(e.target.value)}
                    placeholder="Phone / Email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="Hiring Manager Name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Recipient Company</label>
                  <input
                    type="text"
                    value={recipientCompany}
                    onChange={e => setRecipientCompany(e.target.value)}
                    placeholder="Company Name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Settings: title + language */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Cover Letter Title</label>
                <input
                  type="text"
                  value={coverLetterTitle}
                  onChange={e => setCoverLetterTitle(e.target.value)}
                  placeholder="e.g. Application for Senior Developer at TechCorp"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>

              {/* Language selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                >
                  {LANG_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {language === 'auto'
                    ? 'Auto-detect: language is inferred from the job description.'
                    : `The letter will be written in ${language}.`
                  }
                </p>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generateAndSaveCoverLetter}
              disabled={generating || !jobDescription.trim() || !cvId}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating with AI…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate with AI
                </>
              )}
            </button>
          </div>

          {/* ── Right: Result ── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 h-fit sticky top-20">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Result</h2>

            {generatedLetter ? (
              <>
                {/* Letter text preview */}
                <div className="mb-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 max-h-72 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                    {generatedLetter.length > 600
                      ? generatedLetter.substring(0, 600) + '…'
                      : generatedLetter
                    }
                  </pre>
                </div>

                <div className="space-y-2">
                  {/* View / Preview button (identical to manual letters) */}
                  <button
                    onClick={() => setShowPreview(true)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    👁 View / Preview
                  </button>

                  {/* Edit in full editor */}
                  {generatedLetterId && (
                    <button
                      onClick={() => navigate(`/cover-letters/${generatedLetterId}`)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
                    >
                      ✏️ Edit in Full Editor
                    </button>
                  )}

                  {/* View all */}
                  <button
                    onClick={() => navigate('/cover-letters')}
                    className="w-full py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition"
                  >
                    ✓ View All Letters
                  </button>

                  {/* Regenerate */}
                  <button
                    onClick={generateAndSaveCoverLetter}
                    disabled={generating}
                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium text-sm transition"
                  >
                    ↻ Regenerate
                  </button>

                  {/* Clear form */}
                  <button
                    onClick={resetForm}
                    className="w-full py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  >
                    ✕ Clear Form
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Enter a job description and click "Generate with AI" to create your cover letter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterGeneratorPage;
