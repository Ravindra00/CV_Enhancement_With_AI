import React, { useRef } from 'react';

/**
 * RichTextInput
 * ─────────────────────────────────────────────────────────────────────────────
 * A lightweight rich-text toolbar wrapping a <textarea>.
 * Applies markdown-style inline formatting:
 *   **bold**   _italic_   • bullet on each line
 *
 * Props:
 *   value, onChange, placeholder, rows, className
 */

const TOOLBAR_BTN = 'px-2 py-1 text-xs font-bold rounded border border-gray-200 dark:border-slate-500 bg-white dark:bg-slate-600 hover:bg-primary hover:text-white hover:border-primary transition text-gray-600 dark:text-slate-300 disabled:opacity-40';

function wrapSelection(textarea, before, after) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end);

  // Toggle off if already wrapped
  if (
    text.slice(start - before.length, start) === before &&
    text.slice(end, end + after.length) === after
  ) {
    const newVal = text.slice(0, start - before.length) + selected + text.slice(end + after.length);
    return { value: newVal, selStart: start - before.length, selEnd: end - before.length };
  }

  const newVal = text.slice(0, start) + before + selected + after + text.slice(end);
  return { value: newVal, selStart: start + before.length, selEnd: end + before.length };
}

function applyBullets(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const before = text.slice(0, start);
  const selected = text.slice(start, end) || '';
  const after = text.slice(end);

  // Apply bullet to each non-empty line in selection, or add at cursor
  const lines = selected
    ? selected.split('\n').map(l => {
        if (!l.trim()) return l;
        return l.trimStart().startsWith('• ') ? l.replace(/^(\s*)•\s/, '$1') : `• ${l.trimStart()}`;
      }).join('\n')
    : '• ';

  const newVal = before + lines + after;
  return { value: newVal, selStart: start, selEnd: start + lines.length };
}

const RichTextInput = ({
  value = '',
  onChange,
  placeholder = '',
  rows = 4,
  className = '',
  id,
}) => {
  const ref = useRef(null);

  const apply = (fn) => {
    if (!ref.current) return;
    const result = fn(ref.current);
    onChange(result.value);
    // Restore selection after state update
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      ref.current.setSelectionRange(result.selStart, result.selEnd);
    });
  };

  const inputCls = `w-full border-0 rounded-b-lg px-3 py-2 text-sm focus:outline-none transition bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 resize-none font-mono ${className}`;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-300 transition">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
        <button
          type="button"
          title="Bold (Ctrl+B)"
          className={TOOLBAR_BTN}
          onMouseDown={e => { e.preventDefault(); apply(ta => wrapSelection(ta, '**', '**')); }}
        >
          <span style={{ fontWeight: 900 }}>B</span>
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          className={TOOLBAR_BTN}
          onMouseDown={e => { e.preventDefault(); apply(ta => wrapSelection(ta, '_', '_')); }}
        >
          <span style={{ fontStyle: 'italic' }}>I</span>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-slate-500 mx-1" />
        <button
          type="button"
          title="Toggle bullet list"
          className={TOOLBAR_BTN}
          onMouseDown={e => { e.preventDefault(); apply(applyBullets); }}
        >
          ≡
        </button>
        <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">**bold** _italic_ •bullet</span>
      </div>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={inputCls}
        onKeyDown={e => {
          // Ctrl/Cmd + B
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            apply(ta => wrapSelection(ta, '**', '**'));
          }
          // Ctrl/Cmd + I
          if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            apply(ta => wrapSelection(ta, '_', '_'));
          }
          // Auto-continue bullet on Enter
          if (e.key === 'Enter') {
            const ta = ref.current;
            if (!ta) return;
            const before = ta.value.slice(0, ta.selectionStart);
            const currentLine = before.split('\n').pop();
            if (currentLine.trimStart().startsWith('• ')) {
              e.preventDefault();
              const newVal = ta.value.slice(0, ta.selectionStart) + '\n• ' + ta.value.slice(ta.selectionEnd);
              onChange(newVal);
              const pos = ta.selectionStart + 3;
              requestAnimationFrame(() => { if (ref.current) ref.current.setSelectionRange(pos, pos); });
            }
          }
        }}
      />
    </div>
  );
};

export default RichTextInput;
