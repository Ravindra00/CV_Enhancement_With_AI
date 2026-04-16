import React, { useState, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';

/**
 * CoverLetterPanel
 * ────────────────────────────────────────────────────────────────────────────
 * Slide-in panel displaying generated cover letter with controls.
 *
 * Props:
 *   isOpen        – bool
 *   onClose       – () => void
 *   letter        – string (generated letter text)
 *   onRegenerate  – () => void
 *   cvName        – string (for PDF filename)
 *   generating    – bool
 */

const CoverLetterPanel = ({ isOpen, onClose, letter: initialLetter, onRegenerate, cvName = 'Cover Letter', generating, jdJobTitle = '', cvJobTitle = '' }) => {
  const [letter, setLetter] = useState(initialLetter || '');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const textRef = useRef(null);

  // Sync when new letter is generated
  React.useEffect(() => {
    if (initialLetter) setLetter(initialLetter);
  }, [initialLetter]);

  const wordCount = letter.trim().split(/\s+/).filter(Boolean).length;
  const charCount = letter.length;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      if (textRef.current) {
        textRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [letter]);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const margin = 22;
      const pageW = 210;
      const pageH = 297;
      const usableW = pageW - margin * 2;
      let y = margin;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      pdf.setTextColor(30, 30, 30);

      const lines = letter.split('\n');

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();

        if (trimmed === '') {
          y += 4;
          continue;
        }

        // Sign-off / header lines — slightly different style
        if (trimmed.startsWith('Dear ') || trimmed.startsWith('Sincerely,')) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }

        const wrapped = pdf.splitTextToSize(trimmed, usableW);
        for (const wl of wrapped) {
          if (y + 6 > pageH - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(wl, margin, y);
          y += 5.5;
        }
        y += 1; // small line gap
      }

      const safe = cvName.replace(/[^a-zA-Z0-9\-_. ]/g, '_');
      pdf.save(`${safe}_Cover_Letter.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExporting(false);
    }
  }, [letter, cvName]);

  const handleSaveLocally = useCallback(() => {
    try {
      const buildFileName = (title) =>
        (title || 'position')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') + '_cover_letter';
      const fileName = buildFileName(jdJobTitle || cvJobTitle || cvName);
      const existing = JSON.parse(localStorage.getItem('ag_saved_cover_letters') || '[]');
      const entry = {
        id: Date.now().toString(),
        fileName,
        cvName,
        jdJobTitle: jdJobTitle || '',
        cvJobTitle: cvJobTitle || '',
        body: letter,
        createdAt: new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('ag_saved_cover_letters', JSON.stringify([entry, ...existing].slice(0, 20)));
      setSavedLocally(true);
      setTimeout(() => setSavedLocally(false), 2500);
    } catch (e) {
      // silent — localStorage may be full
    }
  }, [letter, cvName, jdJobTitle, cvJobTitle]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
          style={{ backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 520 }}
      >
        {/* Panel header */}
        <div className="app-panel flex items-center justify-between px-5 py-4 border-b app-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark-accent flex items-center justify-center flex-shrink-0">
              <span className="text-base">✉</span>
            </div>
            <div>
              <h2 className="text-sm font-bold app-text-primary">Cover Letter</h2>
              <p className="text-[10px] app-text-secondary">Generated from your CV + Job Description</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full app-bg-secondary hover:bg-red-50 flex items-center justify-center transition app-text-secondary hover:text-red-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls bar */}
        <div className="app-panel border-b app-border px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onRegenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-60"
          >
            {generating ? (
              <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Regenerate</>
            )}
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${copied ? 'bg-green-600 text-white' : 'app-bg-secondary app-text-primary hover:opacity-80 app-border border'}`}
          >
            {copied ? (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
            )}
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exporting || !letter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-700 disabled:opacity-60 rounded-lg transition"
          >
            {exporting ? (
              <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Exporting…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export PDF</>
            )}
          </button>

          {/* Spacer + word count */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleSaveLocally}
              disabled={!letter || savedLocally}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50 ${
                savedLocally
                  ? 'bg-green-600 text-white'
                  : 'app-bg-secondary app-text-primary hover:opacity-80 app-border border'
              }`}
              title="Save to local browser storage"
            >
              {savedLocally
                ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Saved!</>
                : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>Save Locally</>
              }
            </button>
            <span className={`text-[10px] font-medium app-text-secondary ${wordCount > 340 ? 'text-red-500' : wordCount > 280 ? 'text-green-600' : ''}`}>
              {wordCount} words · {charCount} chars
            </span>
            {wordCount > 340 && <span className="text-[9px] text-red-500 font-bold">Too long</span>}
            {wordCount >= 280 && wordCount <= 340 && <span className="text-[9px] text-green-600 font-bold">✓ Ideal</span>}
          </div>
        </div>

        {/* Generating overlay */}
        {generating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.18)' }}>
            <div className="app-panel rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
              <svg className="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm font-semibold app-text-primary">Generating your letter…</p>
            </div>
          </div>
        )}

        {/* Editable letter area */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {letter ? (
            <textarea
              ref={textRef}
              value={letter}
              onChange={e => setLetter(e.target.value)}
              className="flex-1 w-full text-sm leading-relaxed app-input rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 13, lineHeight: '22px' }}
              spellCheck
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center app-bg-secondary rounded-xl border-2 border-dashed app-border gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-3xl">✉</span>
              </div>
              <div>
                <p className="text-sm font-semibold app-text-primary mb-1">No letter yet</p>
                <p className="text-xs app-text-secondary leading-relaxed">
                  Paste a job description in the AI Enhance or ATS Score tab, then click<br />
                  <strong className="text-indigo-600">Generate Cover Letter</strong> to create a tailored letter.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tone indicator footer */}
        {letter && (
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="app-bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold app-text-secondary uppercase tracking-wide">Note:</span>
              <span className="text-[10px] app-text-secondary">You can edit the letter inline above. All changes are local and won't be saved unless you export.</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CoverLetterPanel;
