import React, { useState, useEffect } from 'react';
import { fetchBackendHealth } from '../services/api';

export default function LandingPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    const data = await fetchBackendHealth();
    setHealthData(data);
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-12 font-sans">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex justify-between items-center py-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30">
            M
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Minnie Study</h1>
            <p className="text-xs text-slate-400">B.Tech Mini-Project Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
          <span className="text-slate-400">System Status:</span>
          {loading ? (
            <span className="text-yellow-400 font-medium animate-pulse">Checking...</span>
          ) : healthData?.status === 'online' ? (
            <span className="flex items-center text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
              Online & Connected
            </span>
          ) : (
            <span className="text-rose-400 font-medium">Offline</span>
          )}
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl w-full mx-auto my-12 text-center flex-1 flex flex-col justify-center">
        <div className="inline-block mx-auto mb-4 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium">
          Cloud-Powered Collaborative Learning
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
          AI-Assisted Collaborative Learning Platform
        </h2>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          A unified platform for students to collaborate in study groups, generate AI summaries and quizzes, track learning progress, and connect via real-time study sessions.
        </p>

        {/* System Health Card */}
        <div className="max-w-md w-full mx-auto bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Backend Health Signal
            </h3>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md transition font-medium text-white disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-6 text-slate-400 text-sm">Testing API connection...</div>
          ) : (
            <div className="space-y-3 text-left text-sm">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">FastAPI Backend:</span>
                <span className={healthData?.status === 'online' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {healthData?.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">PostgreSQL DB:</span>
                <span className={healthData?.database === 'connected' ? 'text-emerald-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                  {healthData?.database?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Project Engine:</span>
                <span className="text-indigo-300 font-medium truncate max-w-[200px]">
                  {healthData?.project || 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tech Stack Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          {['React.js', 'Python FastAPI', 'PostgreSQL', 'Docker', 'Google Gemini API', 'WebSockets', 'WebRTC', 'AWS Ready'].map((tech) => (
            <span key={tech} className="px-3 py-1 bg-slate-800/60 border border-slate-700/60 text-slate-300 rounded-md text-xs font-mono">
              {tech}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-4 border-t border-slate-800 text-center text-xs text-slate-500">
        AI-Assisted Collaborative Learning Platform — B.Tech Mini-Project Foundation Phase
      </footer>
    </div>
  );
}
