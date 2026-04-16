/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',   // toggles via .dark on <html>
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
          DEFAULT: '#e11d48',
        },
        // Dark-mode surface palette (usable with dark: prefix)
        dark: {
          bg:      '#0f172a',
          panel:   '#1e293b',
          sidebar: '#1a2336',
          border:  '#334155',
          input:   '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.14)',
        'dark-card':  '0 2px 8px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
