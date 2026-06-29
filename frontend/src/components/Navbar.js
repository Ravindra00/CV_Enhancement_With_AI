import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

/**
 * Navbar
 * Props:
 *   isDark       – bool
 *   onToggleDark – () => void
 */
const Navbar = ({ isDark, onToggleDark }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const navLinks = [
    { to: '/dashboard', label: t('My Resumes') || 'My CVs', icon: '📄' },
    { to: '/cover-letters', label: t('Cover Letters'), icon: '✉️' },
    { to: '/jobs', label: t('Job Tracker'), icon: '🎯' },
    ...(user?.is_superuser ? [{ to: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav className="app-nav sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">CV</span>
            </div>
            <span className="font-bold app-text-primary text-base tracking-tight">CV Enhancer</span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive(to)
                    ? 'bg-primary-50 text-primary'
                    : 'app-text-secondary hover:app-bg-secondary'
                }`}
                style={isActive(to) ? {} : { color: 'var(--app-text-secondary)' }}
                onMouseEnter={e => { if (!isActive(to)) e.currentTarget.style.background = 'var(--app-sidebar)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={onToggleDark}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'var(--app-sidebar)', border: '1px solid var(--app-border)' }}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                /* Sun icon */
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm7.071-12.071a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM21 11h1a1 1 0 110 2h-1a1 1 0 110-2zM4.929 4.929a1 1 0 011.414 0l.707.707A1 1 0 115.636 7.05l-.707-.707a1 1 0 010-1.414zM3 11H2a1 1 0 100 2h1a1 1 0 100-2zm1.929 7.071l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 11-1.414-1.414zm13.142 0a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"/>
                </svg>
              ) : (
                /* Moon icon */
                <svg className="w-4 h-4" style={{ color: 'var(--app-text-secondary)' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              )}
            </button>

            {/* Language Switcher */}
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="text-sm font-medium app-text-secondary px-2 py-1 rounded-lg transition"
              style={{ background: 'var(--app-sidebar)', border: '1px solid var(--app-border)' }}
            >
              <option value="en">EN</option>
              <option value="de">DE</option>
            </select>

            {user && (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 ring-2 ring-primary-200 flex items-center justify-center">
                  <span className="text-primary-700 font-semibold text-xs">{user.name?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium app-text-primary">{user.name}</span>
              </div>
            )}

            <button
              onClick={() => navigate('/profile')}
              className="text-sm font-medium app-text-secondary px-3 py-1.5 rounded-lg transition"
              style={{ border: '1px solid var(--app-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--app-text-primary)'; e.currentTarget.style.color = 'var(--app-text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-border)'; e.currentTarget.style.color = 'var(--app-text-secondary)'; }}
            >
              Profile
            </button>

            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm font-medium app-text-secondary px-3 py-1.5 rounded-lg transition"
              style={{ border: '1px solid var(--app-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#e11d48'; e.currentTarget.style.color = '#e11d48'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-border)'; e.currentTarget.style.color = 'var(--app-text-secondary)'; }}
            >
              {t('Logout')}
            </button>
          </div>
        </div>
      </div>

    </nav>
  );
};

export default Navbar;
