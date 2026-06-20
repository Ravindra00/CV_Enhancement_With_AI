import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

const UserProfilePage = () => {
  const { user, setUser } = useAuthStore();
  
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  
  const [profileStatus, setProfileStatus] = useState({ error: '', success: '', loading: false });
  const [passwordStatus, setPasswordStatus] = useState({ error: '', success: '', loading: false });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileStatus({ error: '', success: '', loading: true });
    
    try {
      const res = await authAPI.updateProfile(profileForm);
      setUser(res.data); // Update store
      setProfileStatus({ error: '', success: 'Profile updated successfully', loading: false });
      setTimeout(() => setProfileStatus(prev => ({ ...prev, success: '' })), 3000);
    } catch (err) {
      setProfileStatus({ error: err.response?.data?.detail || 'Failed to update profile', success: '', loading: false });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ error: '', success: '', loading: true });

    if (passwordForm.new_password.length < 6) {
      setPasswordStatus({ error: 'New password must be at least 6 characters', success: '', loading: false });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordStatus({ error: 'New passwords do not match', success: '', loading: false });
      return;
    }

    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setPasswordStatus({ error: '', success: 'Password updated successfully', loading: false });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPasswordStatus(prev => ({ ...prev, success: '' })), 3000);
    } catch (err) {
      setPasswordStatus({ error: err.response?.data?.detail || 'Failed to update password', success: '', loading: false });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 app-text-primary">User Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Update Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold mb-4 app-text-primary">Profile Information</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            
            {profileStatus.error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                {profileStatus.error}
              </div>
            )}
            {profileStatus.success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
                {profileStatus.success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 dark:text-gray-400 sm:text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-white sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={profileStatus.loading || profileForm.name === user?.name}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {profileStatus.loading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </section>

        {/* Change Password Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold mb-4 app-text-primary">Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            
            {passwordStatus.error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                {passwordStatus.error}
              </div>
            )}
            {passwordStatus.success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
                {passwordStatus.success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.current_password}
                onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-white sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.new_password}
                onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-white sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-white sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={passwordStatus.loading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {passwordStatus.loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
};

export default UserProfilePage;
