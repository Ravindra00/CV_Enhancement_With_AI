import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useDarkMode } from './hooks/useDarkMode';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerificationPage from './pages/VerificationPage';
import DashboardPage from './pages/DashboardPage';
import CVViewPage from './pages/CVViewPage';
import CVEditorPage from './pages/CVEditorPage';
import CVCustomizePage from './pages/CVCustomizePage';
import CVDesignPage from './pages/CVDesignPage';
import CoverLetterPage from './pages/CoverLetterPage';
import CoverLetterViewPage from './pages/CoverLetterViewPage';
import CoverLetterEditorPage from './pages/CoverLetterEditorPage';
import CoverLetterGeneratorPage from './pages/CoverLetterGeneratorPage';
import JobTrackerPage from './pages/JobTrackerPage';
import AdminPage from './pages/AdminPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // Initialize dark mode — syncs .dark class on <html> and provides toggle
  const [isDark, toggleDark] = useDarkMode();

  return (
    <Router>
      <div className="min-h-screen" style={{ background: 'var(--app-bg)', color: 'var(--app-text-primary)' }}>
        {isAuthenticated && <Navbar isDark={isDark} onToggleDark={toggleDark} />}
        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify" element={<VerificationPage />} />

          {/* ==================== PROTECTED ROUTES ==================== */}

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* ===== CV ROUTES ===== */}
          <Route path="/cv/:cvId" element={<ProtectedRoute><CVViewPage /></ProtectedRoute>} />
          <Route path="/cv/:cvId/edit" element={<ProtectedRoute><CVEditorPage /></ProtectedRoute>} />
          <Route path="/cv-editor/:cvId" element={<ProtectedRoute><CVEditorPage /></ProtectedRoute>} />
          <Route path="/cv/:cvId/customize" element={<ProtectedRoute><CVCustomizePage /></ProtectedRoute>} />
          <Route path="/cv/:cvId/design" element={<ProtectedRoute><CVDesignPage /></ProtectedRoute>} />
          <Route path="/cv-customize/:cvId" element={<ProtectedRoute><CVCustomizePage /></ProtectedRoute>} />

          {/* ===== COVER LETTER ROUTES ===== */}
          <Route path="/cover-letters" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />
          <Route path="/cover-letters/:id/view" element={<ProtectedRoute><CoverLetterViewPage /></ProtectedRoute>} />
          <Route path="/cover-letters/:id/edit" element={<ProtectedRoute><CoverLetterEditorPage /></ProtectedRoute>} />
          <Route path="/cover-letter/:id" element={<ProtectedRoute><CoverLetterViewPage /></ProtectedRoute>} />
          <Route path="/cover-letter/new" element={<ProtectedRoute><CoverLetterGeneratorPage /></ProtectedRoute>} />

          {/* Job Tracker */}
          <Route path="/jobs" element={<ProtectedRoute><JobTrackerPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

          {/* ==================== DEFAULT ROUTES ==================== */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;