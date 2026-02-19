import React, { useState, useCallback, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────
   ThemePanel — collapsible sidebar for CV color, font & layout customization
   Props:
     theme         — { primaryColor, fontFamily, layout }
     onThemeChange — fn(newTheme)
─────────────────────────────────────────────────────────────────── */

const PRESET_COLORS = [
    { label: 'Red', value: '#be123c' },
    { label: 'Crimson', value: '#dc2626' },
    { label: 'Navy', value: '#1e3a5f' },
    { label: 'Ocean', value: '#0369a1' },
    { label: 'Forest', value: '#166534' },
    { label: 'Slate', value: '#334155' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Amber', value: '#b45309' },
    { label: 'Indigo', value: '#4338ca' },
];

const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { label: 'Georgia', value: 'Georgia, Times New Roman, serif' },
    { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
    { label: 'Playfair', value: '"Playfair Display", Georgia, serif' },
    { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
];

const LAYOUTS = [
    { label: 'Classic', value: 'classic', icon: '▬' },
    { label: 'Modern', value: 'modern', icon: '⊡' },
    { label: 'Minimal', value: 'minimal', icon: '▭' },
];

const ThemePanel = ({ theme, onThemeChange }) => {
    const [open, setOpen] = useState(false);

    const set = useCallback((key, val) => {
        onThemeChange({ ...theme, [key]: val });
    }, [theme, onThemeChange]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ background: theme.primaryColor }} />
                    <span className="text-sm font-semibold text-gray-900">Theme & Style</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
                    {/* Layout */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Layout</label>
                        <div className="grid grid-cols-3 gap-2">
                            {LAYOUTS.map(l => (
                                <button
                                    key={l.value}
                                    onClick={() => set('layout', l.value)}
                                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 text-xs font-medium transition ${theme.layout === l.value ? 'border-primary bg-primary-50 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    <span className="text-lg">{l.icon}</span>
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color presets */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Primary Color</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => set('primaryColor', c.value)}
                                    title={c.label}
                                    className={`w-7 h-7 rounded-full border-2 transition ${theme.primaryColor === c.value ? 'border-gray-900 scale-110' : 'border-transparent hover:border-gray-400'}`}
                                    style={{ background: c.value }}
                                />
                            ))}
                        </div>
                        {/* Custom color picker */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Custom:</label>
                            <input
                                type="color"
                                value={theme.primaryColor}
                                onChange={e => set('primaryColor', e.target.value)}
                                className="w-8 h-7 rounded border border-gray-200 cursor-pointer p-0.5"
                            />
                            <span className="text-xs font-mono text-gray-500">{theme.primaryColor}</span>
                        </div>
                    </div>

                    {/* Font */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Font</label>
                        <div className="space-y-1">
                            {FONT_OPTIONS.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => set('fontFamily', f.value)}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs border transition ${theme.fontFamily === f.value ? 'border-primary bg-primary-50 text-primary font-semibold' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                                    style={{ fontFamily: f.value }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemePanel;
