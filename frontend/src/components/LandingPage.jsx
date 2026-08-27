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
    <div className="min-h-screen bg-[#F8F3F9] text-[#241A26] flex flex-col justify-between p-6 sm:p-12 font-sans">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex justify-between items-center py-4 border-b border-[#E8DDEB]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#FFB7C5] rounded-lg flex items-center justify-center font-black text-[#2E003E] text-xl shadow-md">
            M
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-[#2E003E]">Minnie Study</h1>
            <p className="text-xs text-[#756A78]">B.Tech Mini-Project Platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-[#E8DDEB] text-xs shadow-sm">
          <span className="text-[#756A78]">System Status:</span>
          {loading ? (
            <span className="text-amber-600 font-medium animate-pulse">Checking...</span>
          ) : healthData?.status === 'online' ? (
            <span className="flex items-center text-[#2E003E] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#FFB7C5] mr-1.5 animate-ping"></span>
              Online & Connected
            </span>
          ) : (
            <span className="text-rose-600 font-medium">Offline</span>
          )}
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl w-full mx-auto my-12 text-center flex-1 flex flex-col justify-center">
        <div className="inline-block mx-auto mb-4 px-4 py-1.5 rounded-full bg-[#2E003E]/10 border border-[#2E003E]/20 text-[#2E003E] text-sm font-semibold">
          Cloud-Powered Collaborative Learning
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 text-[#2E003E]">
          AI-Assisted Collaborative Learning Platform
        </h2>

        <p className="text-lg sm:text-xl text-[#756A78] max-w-2xl mx-auto mb-10 leading-relaxed">
          A unified platform for students to collaborate in study groups, generate AI summaries and quizzes, track learning progress, and connect via real-time study sessions.
        </p>

        {/* System Health Card */}
        <div className="max-w-md w-full mx-auto bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-[#2E003E] uppercase tracking-wider">
              Backend Health Signal
            </h3>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="text-xs px-3 py-1 bg-[#2E003E] hover:opacity-90 rounded-md transition font-medium text-white disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-6 text-[#756A78] text-sm">Testing API connection...</div>
          ) : (
            <div className="space-y-3 text-left text-sm">
              <div className="flex justify-between p-2.5 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB]">
                <span className="text-[#756A78]">FastAPI Backend:</span>
                <span className={healthData?.status === 'online' ? 'text-[#2E003E] font-bold' : 'text-rose-600 font-semibold'}>
                  {healthData?.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB]">
                <span className="text-[#756A78]">PostgreSQL DB:</span>
                <span className={healthData?.database === 'connected' ? 'text-[#2E003E] font-bold' : 'text-amber-600 font-semibold'}>
                  {healthData?.database?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-[#F8F3F9] border border-[#E8DDEB]">
                <span className="text-[#756A78]">Project Engine:</span>
                <span className="text-[#2E003E] font-semibold truncate max-w-[200px]">
                  {healthData?.project || 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tech Stack Badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          {['React.js', 'Python FastAPI', 'PostgreSQL', 'Docker', 'Google Gemini API', 'WebSockets', 'WebRTC', 'AWS Ready'].map((tech) => (
            <span key={tech} className="px-3 py-1 bg-white border border-[#E8DDEB] text-[#2E003E] rounded-md text-xs font-mono font-medium shadow-sm">
              {tech}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-4 border-t border-[#E8DDEB] text-center text-xs text-[#756A78]">
        AI-Assisted Collaborative Learning Platform — B.Tech Mini-Project Foundation Phase
      </footer>
    </div>
  );
}
