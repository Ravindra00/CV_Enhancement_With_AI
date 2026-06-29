import React, { useEffect, useState } from 'react';
import { jobsAPI, cvAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useCVStore } from '../store/cvStore';

const RecommendedJobsPage = () => {
  const [jobs, setJobs] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cvs, setCVs } = useCVStore();
  const { t } = useTranslation();

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobsAPI.getRecommendations();
      setJobs(res.data.grouped_by_company || {});
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch job recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Attempt to load CVs if not loaded to check if user has a CV
    const loadData = async () => {
      if (cvs.length === 0) {
        try {
          const res = await cvAPI.getAll();
          setCVs(res.data);
        } catch (e) {
          console.error('Failed to fetch CVs', e);
        }
      }
      fetchJobs();
    };
    loadData();
  }, []);

  const handleAction = async (recId, action) => {
    try {
      await jobsAPI.action(recId, action);
      fetchJobs(); // refresh the list to reflect status updates
    } catch (err) {
      console.error('Failed to perform action:', err);
      alert('Action failed, please try again.');
    }
  };

  const getScoreColor = (score) => {
    if (score > 75) return { bg: 'bg-green-100', text: 'text-green-800' };
    if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    return { bg: 'bg-red-100', text: 'text-red-800' };
  };

  // If user has no CV uploaded
  if (!loading && cvs.length === 0 && total === 0 && !error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Recommended Jobs</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">Upload your CV to get personalised job matches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold app-text-primary">Today's Job Matches</h1>
        <p className="app-text-secondary text-sm mt-1">10 jobs matched to your CV · refreshes daily</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Warning if no jobs due to missing API keys (implied if empty but no explicit error) */}
      {!loading && total === 0 && !error && cvs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium">Add your Adzuna API key in Settings to enable job matching.</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex flex-col space-y-3 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(jobs).map(([company, companyJobs]) => (
            <div key={company} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold app-text-primary">{company}</h2>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-bold">
                  {companyJobs.length} {companyJobs.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {companyJobs.map(job => {
                  const scoreColors = getScoreColor(job.match_score);
                  return (
                    <div key={job.id} className="p-6 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${scoreColors.bg} ${scoreColors.text}`}>
                              {job.match_score}% Match
                            </span>
                            {job.salary_min && job.salary_max && (
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                ${Number(job.salary_min).toLocaleString()} - ${Number(job.salary_max).toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-xl font-bold app-text-primary mb-1">{job.title}</h3>
                          <p className="app-text-secondary text-sm mb-4">{job.location || 'Remote'}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {(job.match_reasons || []).slice(0, 3).map((reason, idx) => (
                              <span key={idx} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-2.5 py-1 rounded-md text-xs font-medium">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                          {job.is_applied ? (
                            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-bold text-center border border-green-200">
                              Applied ✓
                            </span>
                          ) : (
                            <>
                              <button 
                                onClick={() => { window.open(job.url, '_blank'); handleAction(job.id, 'view'); }}
                                className="bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                              >
                                View Job
                              </button>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAction(job.id, 'save')}
                                  disabled={job.is_saved}
                                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${job.is_saved ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                  {job.is_saved ? 'Saved' : 'Save'}
                                </button>
                                <button 
                                  onClick={() => handleAction(job.id, 'dismiss')}
                                  className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition"
                                >
                                  Dismiss
                                </button>
                              </div>
                              <button 
                                onClick={() => handleAction(job.id, 'apply')}
                                className="px-4 py-1.5 mt-1 border border-primary text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg text-sm font-semibold transition"
                              >
                                Mark as Applied
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && !error && total > 0 && (
        <div className="mt-8 flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
          <button 
            onClick={fetchJobs} 
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Matches
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendedJobsPage;
