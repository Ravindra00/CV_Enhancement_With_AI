import React, { useRef, useState } from 'react';

/**
 * SectionReorder
 * ─────────────────────────────────────────────────────────────────────────────
 * Drag-and-drop section ordering + per-section visibility toggle.
 * Uses native HTML5 Drag API — no extra dependencies.
 *
 * Props:
 *   sections      — string[] — ordered section keys
 *   hiddenSections — Set<string>
 *   onReorder      — (newSections: string[]) => void
 *   onToggleVisible— (sectionKey: string) => void
 */

const SECTION_META = {
  summary:       { label: 'Profile Summary', icon: '👤' },
  experience:    { label: 'Experience',      icon: '💼' },
  education:     { label: 'Education',       icon: '🎓' },
  skills:        { label: 'Skills',          icon: '⚡' },
  languages:     { label: 'Languages',       icon: '🌐' },
  projects:      { label: 'Projects',        icon: '🚀' },
  certifications:{ label: 'Certifications', icon: '🏅' },
  interests:     { label: 'Interests',       icon: '🎯' },
  custom:        { label: 'Custom Sections', icon: '📌' },
};

export const DEFAULT_SECTION_ORDER = [
  'summary','experience','education','skills','languages','projects','certifications','interests','custom'
];

const SectionReorder = ({ sections = DEFAULT_SECTION_ORDER, hiddenSections = new Set(), onReorder, onToggleVisible }) => {
  const [open, setOpen] = useState(false);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image effect via opacity
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnter = (e, index) => {
    dragOverItem.current = index;
    e.currentTarget.classList.add('ring-2', 'ring-primary', 'ring-offset-1');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    // Remove any lingering highlight
    document.querySelectorAll('[data-drag-target]').forEach(el => {
      el.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
    });

    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const copy = [...sections];
    const [removed] = copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, removed);
    onReorder(copy);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary', 'ring-offset-1');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">⠿</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Section Order & Visibility</span>
          <span className="text-[10px] text-gray-400 dark:text-slate-500">drag to reorder</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-slate-700 px-3 py-3">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-2">Drag ⠿ handle to reorder • Toggle 👁 to show/hide</p>
          <div className="space-y-1.5">
            {sections.map((key, index) => {
              const meta = SECTION_META[key] || { label: key, icon: '📄' };
              const isHidden = hiddenSections.has(key);
              return (
                <div
                  key={key}
                  data-drag-target
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnter={e => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition cursor-grab active:cursor-grabbing select-none ${
                    isHidden
                      ? 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 opacity-50'
                      : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-primary-200 hover:bg-primary-50/30 dark:hover:border-primary-400 dark:hover:bg-primary-900/20'
                  }`}
                >
                  {/* Drag handle */}
                  <span className="text-gray-300 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300 text-base leading-none flex-shrink-0 cursor-grab">⠿</span>

                  {/* Icon & label */}
                  <span className="text-sm flex-shrink-0">{meta.icon}</span>
                  <span className={`text-xs font-medium flex-1 ${isHidden ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-700 dark:text-slate-300'}`}>
                    {meta.label}
                  </span>

                  {/* Position badge */}
                  <span className="text-[9px] text-gray-300 dark:text-slate-600 font-mono w-4 text-center">{index + 1}</span>

                  {/* Visibility toggle */}
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onToggleVisible(key); }}
                    className={`flex-shrink-0 text-sm transition ${isHidden ? 'opacity-40 hover:opacity-80' : 'hover:scale-110'}`}
                    title={isHidden ? 'Show section' : 'Hide section'}
                  >
                    {isHidden ? '🙈' : '👁'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionReorder;
