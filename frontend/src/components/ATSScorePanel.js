import React, { useState } from 'react';

/**
 * ATSScorePanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays ATS analysis results from atsEngine.scoreResume()
 *
 * Props:
 *   result         — return value of scoreResume()
 *   onHighlight    — (keywords: string[]) => void — toggle keyword highlight in preview
 *   highlightOn    — bool — is highlight active
 *   cvData         — to detect which sections exist
 */

const TIER_COLOR = { green: '#16a34a', yellow: '#d97706', red: '#dc2626' };
const TIER_BG    = { green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800', yellow: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800', red: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' };
const TIER_LABEL = { green: '🎉 Strong Match', yellow: '⚡ Decent Match', red: '⚠️ Needs Work' };
const TIER_TEXT  = { green: 'text-green-700 dark:text-green-400', yellow: 'text-amber-700 dark:text-amber-400', red: 'text-red-700 dark:text-red-400' };

/* Circular score ring */
const ScoreRing = ({ score, tier }) => {
  const color = TIER_COLOR[tier] || '#dc2626';
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90 absolute inset-0">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-2xl font-black text-gray-900 dark:text-slate-100">{score}</span>
        <span className="text-[9px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">/ 100</span>
      </div>
    </div>
  );
};

/* Breakdown bar */
const BreakdownBar = ({ label, score, max, color }) => {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">{label}</span>
        <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">{score}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};

const ATSScorePanel = ({ result, onHighlight, highlightOn, cvData }) => {
  const [activeTab, setActiveTab] = useState('overview'); // overview | keywords | suggestions

  if (!result) return null;
  const { total, tier, breakdown, missingKeywords, matchedKeywords, suggestions, weakSections } = result;
  // tierColor used by child components via TIER_COLOR lookup

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition ${activeTab === id ? 'bg-primary text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className={`rounded-2xl border p-4 ${TIER_BG[tier]}`}>
        <div className="flex items-center gap-4">
          <ScoreRing score={total} tier={tier} />
          <div className="flex-1">
            <p className={`text-sm font-bold mb-1 ${TIER_TEXT[tier]}`}>{TIER_LABEL[tier]}</p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Your resume matches <strong>{matchedKeywords.length}</strong> of the job description keywords.
              {missingKeywords.length > 0 && <span> <strong className="text-red-600">{missingKeywords.length}</strong> keywords missing.</span>}
            </p>
            {/* Highlight toggle */}
            <button
              onClick={() => onHighlight && onHighlight(!highlightOn ? missingKeywords : [])}
              className={`mt-2 text-[10px] px-3 py-1 rounded-full border font-semibold transition ${
                highlightOn
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-600'
              }`}
            >
              {highlightOn ? '✓ Highlighting Missing Keywords' : '🔦 Highlight Missing in Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Weak sections alert */}
      {weakSections.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-orange-700 mb-1">⚠️ Weak Sections Detected</p>
          <p className="text-[11px] text-orange-600">
            These sections have low keyword alignment with the JD:{' '}
            <strong>{weakSections.join(', ')}</strong>. Consider adding relevant JD language.
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
        <TabBtn id="overview" label="📊 Breakdown" />
        <TabBtn id="keywords" label="🔑 Keywords" />
        <TabBtn id="suggestions" label="💡 Tips" />
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-1">
          <BreakdownBar
            label="Keyword Match Rate"
            score={breakdown.keywords}
            max={breakdown.keywordsMax}
            color={breakdown.keywords >= 28 ? '#16a34a' : breakdown.keywords >= 16 ? '#d97706' : '#dc2626'}
          />
          <BreakdownBar
            label="Required Skills Coverage"
            score={breakdown.skills}
            max={breakdown.skillsMax}
            color={breakdown.skills >= 18 ? '#16a34a' : breakdown.skills >= 10 ? '#d97706' : '#dc2626'}
          />
          <BreakdownBar
            label="Section Completeness"
            score={breakdown.completeness}
            max={breakdown.completenessMax}
            color={breakdown.completeness >= 16 ? '#16a34a' : breakdown.completeness >= 10 ? '#d97706' : '#dc2626'}
          />
          <BreakdownBar
            label="Formatting Safety"
            score={breakdown.formatting}
            max={breakdown.formattingMax}
            color={breakdown.formatting >= 12 ? '#16a34a' : breakdown.formatting >= 8 ? '#d97706' : '#dc2626'}
          />

          {/* Section completeness details */}
          {breakdown.sectionDetails?.missingSections?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-2">MISSING SECTIONS</p>
              <div className="flex flex-wrap gap-1.5">
                {breakdown.sectionDetails.missingSections.map((s, i) => (
                  <span key={i} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Keywords tab ── */}
      {activeTab === 'keywords' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
          {matchedKeywords.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-2 uppercase tracking-wide">✓ {matchedKeywords.length} Matched</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedKeywords.map((kw, i) => (
                  <span key={i} className="text-[10px] bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 px-2 py-0.5 rounded-full font-medium">{kw}</span>
                ))}
              </div>
            </div>
          )}
          {missingKeywords.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">✕ {missingKeywords.length} Missing</p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((kw, i) => (
                  <span key={i} className="text-[10px] bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full font-medium">{kw}</span>
                ))}
              </div>
            </div>
          )}
          {matchedKeywords.length === 0 && missingKeywords.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No significant keywords detected in the job description</p>
          )}
        </div>
      )}

      {/* ── Suggestions tab ── */}
      {activeTab === 'suggestions' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Improvement Tips</p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
                <span className="text-blue-500 dark:text-blue-400 font-bold text-xs flex-shrink-0 mt-0.5">→</span>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSScorePanel;
