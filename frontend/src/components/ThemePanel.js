import React, { useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────
   ThemePanel — collapsible sidebar for CV theme, templates,
   layout, color, font, accent, and spacing customization
─────────────────────────────────────────────────────────────────── */

const PRESET_COLORS = [
    { label: 'Charcoal', value: '#1a1a1a' },
    { label: 'Crimson', value: '#be123c' },
    { label: 'Ruby', value: '#dc2626' },
    { label: 'Navy', value: '#1e3a5f' },
    { label: 'Ocean', value: '#0369a1' },
    { label: 'Sky', value: '#0284c7' },
    { label: 'Forest', value: '#166534' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Slate', value: '#334155' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Violet', value: '#6d28d9' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Amber', value: '#b45309' },
    { label: 'Orange', value: '#c2410c' },
    { label: 'Indigo', value: '#4338ca' },
    { label: 'Pink', value: '#be185d' },
    { label: 'Brown', value: '#78350f' },
    { label: 'Graphite', value: '#374151' },
];

const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { label: 'Roboto', value: 'Roboto, Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, Times New Roman, serif' },
    { label: 'Playfair', value: '"Playfair Display", Georgia, serif' },
    { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
    { label: 'Lato', value: 'Lato, Helvetica, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, system-ui, sans-serif' },
];

const LAYOUTS = [
    { label: 'Clean', value: 'clean', icon: '📄', desc: 'White background, icon headers' },
    { label: 'Classic', value: 'classic', icon: '🎨', desc: 'Color header banner' },
    { label: 'Modern', value: 'modern', icon: '⊡', desc: 'Colored sidebar' },
    { label: 'Executive', value: 'executive', icon: '💼', desc: 'Two-column body' },
    { label: 'Minimal', value: 'minimal', icon: '▭', desc: 'Ultra clean whitespace' },
    { label: 'ATS-Safe', value: 'ats', icon: '🤖', desc: 'Plain — optimized for parsers' },
];

const ACCENT_STYLES = [
    { label: 'Line', value: 'line', icon: '—' },
    { label: 'Badge', value: 'badge', icon: '🏷' },
    { label: 'Dot', value: 'dot', icon: '●' },
];

/* ─── Named Templates ─────────────────────────────────────────── */
const TEMPLATES = [
    {
        id: 'classic',
        name: 'Classic',
        desc: 'Traditional serif, single-column',
        icon: '📜',
        gradient: 'from-amber-900 to-amber-700',
        preview: { bg: '#1e3a5f', text: '#fff' },
        config: {
            layout: 'classic',
            primaryColor: '#1e3a5f',
            fontFamily: 'Georgia, Times New Roman, serif',
            accentStyle: 'line',
            pageMargin: 24,
            sectionSpacing: 10,
            columnSplit: 35,
        },
    },
    {
        id: 'modern',
        name: 'Modern',
        desc: 'Two-column with accent sidebar',
        icon: '⚡',
        gradient: 'from-purple-700 to-violet-500',
        preview: { bg: '#7c3aed', text: '#fff' },
        config: {
            layout: 'modern',
            primaryColor: '#7c3aed',
            fontFamily: 'Inter, system-ui, sans-serif',
            accentStyle: 'badge',
            pageMargin: 20,
            sectionSpacing: 12,
            columnSplit: 33,
        },
    },
    {
        id: 'minimal',
        name: 'Minimal',
        desc: 'Clean whitespace, sans-serif',
        icon: '◻',
        gradient: 'from-gray-700 to-gray-500',
        preview: { bg: '#1a1a1a', text: '#fff' },
        config: {
            layout: 'minimal',
            primaryColor: '#1a1a1a',
            fontFamily: 'Lato, Helvetica, sans-serif',
            accentStyle: 'dot',
            pageMargin: 28,
            sectionSpacing: 14,
            columnSplit: 35,
        },
    },
    {
        id: 'ats',
        name: 'ATS-Safe',
        desc: 'Plain formatting for parsers',
        icon: '🤖',
        gradient: 'from-slate-700 to-slate-500',
        preview: { bg: '#000', text: '#fff' },
        config: {
            layout: 'ats',
            primaryColor: '#000000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            accentStyle: 'line',
            pageMargin: 32,
            sectionSpacing: 10,
            columnSplit: 35,
        },
    },
];

/* ─── Template mini-preview thumbnail ────────────────────────── */
const TemplateThumbnail = ({ template, isActive }) => {
    const { preview } = template;
    return (
        <div
            className={`w-full rounded-xl border-2 overflow-hidden transition cursor-pointer ${
                isActive ? 'border-primary shadow-md shadow-primary/20' : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{ aspectRatio: '1 / 1.414' }}
        >
            {/* Mini CV representation */}
            <div style={{ background: preview.bg, height: '28%', padding: '4px 6px' }}>
                <div style={{ width: '60%', height: 4, background: 'rgba(255,255,255,0.9)', borderRadius: 2, marginBottom: 2 }} />
                <div style={{ width: '40%', height: 2.5, background: 'rgba(255,255,255,0.55)', borderRadius: 1 }} />
            </div>
            <div style={{ padding: '4px 6px', background: '#fff', flex: 1 }}>
                {[80, 60, 70, 50, 65].map((w, i) => (
                    <div key={i} style={{ width: `${w}%`, height: 2, background: '#e5e7eb', borderRadius: 1, marginBottom: 3 }} />
                ))}
            </div>
        </div>
    );
};

const ThemePanel = ({ theme, onThemeChange }) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('templates'); // templates | layout | color | font | accent | spacing

    const set = useCallback((key, val) => {
        onThemeChange({ ...theme, [key]: val });
    }, [theme, onThemeChange]);

    const applyTemplate = useCallback((tpl) => {
        onThemeChange({ ...theme, ...tpl.config });
    }, [theme, onThemeChange]);

    const needsColumnControl = ['modern', 'executive'].includes(theme.layout);

    const Tab = ({ id, label }) => (
        <button
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition ${tab === id ? 'bg-primary text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 dark:hover:bg-slate-700'}`}
        >
            {label}
        </button>
    );

    const SliderRow = ({ label, min, max, step, value, unit, onChange }) => (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">{label}</span>
                <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-2 accent-primary rounded-full"
            />
            <div className="flex justify-between text-[9px] text-gray-300 dark:text-slate-600 mt-0.5">
                <span>{min}{unit}</span><span>{max}{unit}</span>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-slate-600 shadow-sm" style={{ background: theme.primaryColor }} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Theme & Design</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 font-normal capitalize">{theme.layout || 'clean'}</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-slate-700">
                    {/* Tab bar */}
                    <div className="flex gap-0.5 px-2 py-2 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex-wrap">
                        <Tab id="templates" label="Templates" />
                        <Tab id="layout" label="Layout" />
                        <Tab id="color" label="Color" />
                        <Tab id="font" label="Font" />
                        <Tab id="accent" label="Accent" />
                        <Tab id="spacing" label="Spacing" />
                    </div>

                    <div className="px-4 pb-4 pt-3">

                        {/* ── Templates tab ── */}
                        {tab === 'templates' && (
                            <div>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-3">Click a template to apply its full design config</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {TEMPLATES.map(tpl => {
                                        const isActive = theme.layout === tpl.config.layout && theme.primaryColor === tpl.config.primaryColor;
                                        return (
                                            <div key={tpl.id} onClick={() => applyTemplate(tpl)} className="cursor-pointer group">
                                                <TemplateThumbnail template={tpl} isActive={isActive} />
                                                <div className="mt-1.5 text-center">
                                                    <div className={`flex items-center justify-center gap-1.5 ${isActive ? 'text-primary' : 'text-gray-700 dark:text-slate-300'}`}>
                                                        <span className="text-sm">{tpl.icon}</span>
                                                        <p className="text-[11px] font-bold">{tpl.name}</p>
                                                        {isActive && <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 dark:text-slate-500">{tpl.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Layout tab ── */}
                        {tab === 'layout' && (
                            <div className="space-y-2">
                                {LAYOUTS.map(l => (
                                    <button
                                        key={l.value}
                                        onClick={() => set('layout', l.value)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition ${
                                            theme.layout === l.value ? 'border-primary bg-primary-50 dark:bg-primary-950' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                                        }`}
                                    >
                                        <span className="text-xl w-7 text-center">{l.icon}</span>
                                        <div>
                                            <p className={`text-xs font-bold ${theme.layout === l.value ? 'text-primary' : 'text-gray-800 dark:text-slate-200'}`}>{l.label}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-slate-500">{l.desc}</p>
                                        </div>
                                        {theme.layout === l.value && (
                                            <svg className="w-4 h-4 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Color tab ── */}
                        {tab === 'color' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 dark:text-slate-400">Presets</p>
                                <div className="grid grid-cols-6 gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => set('primaryColor', c.value)}
                                            title={c.label}
                                            className={`w-full aspect-square rounded-lg border-2 transition hover:scale-110 ${
                                                theme.primaryColor === c.value ? 'border-gray-900 dark:border-slate-200 ring-2 ring-gray-300 dark:ring-slate-600' : 'border-transparent'
                                            }`}
                                            style={{ background: c.value }}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                                    <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">Custom</label>
                                    <input
                                        type="color"
                                        value={theme.primaryColor}
                                        onChange={e => set('primaryColor', e.target.value)}
                                        className="w-9 h-8 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer p-0.5"
                                    />
                                    <span className="text-xs font-mono text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded">{theme.primaryColor}</span>
                                </div>
                            </div>
                        )}

                        {/* ── Font tab ── */}
                        {tab === 'font' && (
                            <div className="space-y-1">
                                {FONT_OPTIONS.map(f => (
                                    <button
                                        key={f.value}
                                        onClick={() => set('fontFamily', f.value)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm border-2 transition ${
                                            theme.fontFamily === f.value
                                                ? 'border-primary bg-primary-50 dark:bg-primary-950 text-primary font-semibold'
                                                : 'border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                        style={{ fontFamily: f.value }}
                                    >
                                        {f.label} <span className="text-[10px] ml-1 opacity-50">Aa Bb Cc</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Accent tab ── */}
                        {tab === 'accent' && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Section header style</p>
                                {ACCENT_STYLES.map(a => (
                                    <button
                                        key={a.value}
                                        onClick={() => set('accentStyle', a.value)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition ${
                                            (theme.accentStyle || 'line') === a.value
                                                ? 'border-primary bg-primary-50 dark:bg-primary-950 text-primary'
                                                : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'
                                        }`}
                                    >
                                        <span className="text-lg w-7 text-center">{a.icon}</span>
                                        <span className="text-xs font-semibold">{a.label}</span>
                                        {(theme.accentStyle || 'line') === a.value && (
                                            <svg className="w-4 h-4 text-primary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Spacing tab ── */}
                        {tab === 'spacing' && (
                            <div>
                                <SliderRow
                                    label="Page Margin"
                                    min={12} max={48} step={2}
                                    value={theme.pageMargin ?? 32}
                                    unit="px"
                                    onChange={v => set('pageMargin', v)}
                                />
                                <SliderRow
                                    label="Section Spacing"
                                    min={4} max={24} step={1}
                                    value={theme.sectionSpacing ?? 12}
                                    unit="px"
                                    onChange={v => set('sectionSpacing', v)}
                                />
                                {needsColumnControl && (
                                    <>
                                        <div className="mt-1 mb-2 border-t border-gray-100 dark:border-slate-700 pt-3">
                                            <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Two-Column Split</p>
                                        </div>
                                        <SliderRow
                                            label="Sidebar Width"
                                            min={25} max={50} step={1}
                                            value={theme.columnSplit ?? 35}
                                            unit="%"
                                            onChange={v => set('columnSplit', v)}
                                        />
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                                            <div className="flex-shrink-0 text-right" style={{ width: `${theme.columnSplit ?? 35}%`, background: '#e0e7ff', borderRadius: 3, padding: '2px 4px', color: '#4338ca' }}>
                                                {theme.columnSplit ?? 35}%
                                            </div>
                                            <div className="flex-1 text-left" style={{ background: '#f3f4f6', borderRadius: 3, padding: '2px 4px' }}>
                                                {100 - (theme.columnSplit ?? 35)}%
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                                    <button
                                        onClick={() => onThemeChange({ ...theme, pageMargin: 32, sectionSpacing: 12, columnSplit: 35 })}
                                        className="w-full py-1.5 text-[10px] text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                                    >
                                        Reset to Defaults
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemePanel;
