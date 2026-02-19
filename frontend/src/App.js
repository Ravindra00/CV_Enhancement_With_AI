import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CVEditorPage from './pages/CVEditorPage';
import CVCustomizePage from './pages/CVCustomizePage';
import CoverLetterPage from './pages/CoverLetterPage';
import CoverLetterEditorPage from './pages/CoverLetterEditorPage';
import CoverLetterGeneratorPage from './pages/CoverLetterGeneratorPage';
import JobTrackerPage from './pages/JobTrackerPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && <Navbar />}
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* CV editor — support both /cv/:id and /cv-editor/:cvId for backward compat */}
          <Route path="/cv/:id" element={<ProtectedRoute><CVEditorPage /></ProtectedRoute>} />
          <Route path="/cv-editor/:cvId" element={<ProtectedRoute><CVEditorPage /></ProtectedRoute>} />

          {/* AI Customize — support both URL shapes */}
          <Route path="/cv/:id/customize" element={<ProtectedRoute><CVCustomizePage /></ProtectedRoute>} />
          <Route path="/cv-customize/:cvId" element={<ProtectedRoute><CVCustomizePage /></ProtectedRoute>} />

          {/* Cover Letters */}
          <Route path="/cover-letters" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />
          <Route path="/cover-letters/:id" element={<ProtectedRoute><CoverLetterEditorPage /></ProtectedRoute>} />
          <Route path="/cover-letter/new" element={<ProtectedRoute><CoverLetterGeneratorPage /></ProtectedRoute>} />

          {/* Job Tracker */}
          <Route path="/jobs" element={<ProtectedRoute><JobTrackerPage /></ProtectedRoute>} />

          {/* Default */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
