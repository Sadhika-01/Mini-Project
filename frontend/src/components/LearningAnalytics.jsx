import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Clock,
  Flame,
  TrendingUp,
  CheckCircle,
  Upload,
  Download,
  Bot,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  Activity
} from 'lucide-react';

export default function LearningAnalytics() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        setError('Failed to load learning analytics metrics.');
      }
    } catch (err) {
      setError('Error connecting to analytics backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  // Helper for human-readable activity type formatting
  const formatActivityLabel = (activityType, metadataJson) => {
    let meta = {};
    try {
      if (metadataJson) meta = JSON.parse(metadataJson);
    } catch (e) {}

    switch (activityType) {
      case 'login':
        return `Signed in to Minnie platform`;
      case 'register':
        return `Created student account`;
      case 'create_group':
        return `Created new study group "${meta.name || ''}"`;
      case 'join_group':
        return `Joined study group "${meta.name || ''}"`;
      case 'leave_group':
        return `Left study group "${meta.name || ''}"`;
      case 'upload_resource':
        return `Uploaded resource "${meta.filename || ''}"`;
      case 'download_resource':
        return `Downloaded resource "${meta.filename || ''}"`;
      case 'ai_explain_doubt':
        return `Asked AI Assistant: "${meta.question || ''}"`;
      case 'ai_improve_answer':
        return `Generated AI answer refinement`;
      case 'ai_generate_summary':
        return `Generated AI PDF summary for "${meta.filename || ''}"`;
      default:
        return `Performed ${activityType.replace('_', ' ')}`;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Calculating learning analytics from PostgreSQL logs...</span>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-2xl flex items-center justify-between">
        <span>{error || 'Failed to load analytics.'}</span>
        <button
          onClick={fetchAnalytics}
          className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Find max count for chart scaling
  const maxWeeklyCount = Math.max(...analytics.weekly_trend.map(w => w.activity_count), 5);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#2E003E] text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-[#FFB7C5] text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-[#FFB7C5]" />
            <span>PostgreSQL Activity Analytics Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Learning Analytics Dashboard</h2>
          <p className="text-white/80 text-sm mt-1">
            Real-time study performance, engagement trends, and activity metrics calculated directly from your database logs.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-[#FFB7C5]/30 rounded-xl text-xs font-semibold transition flex items-center space-x-2 shrink-0 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#FFB7C5]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Calculated Study Time</span>
            <Clock className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{analytics.estimated_study_hours} hrs</div>
          <p className="text-xs text-[#756A78]">Based on session & interaction frequency</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Active Study Days</span>
            <Flame className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{analytics.total_active_days} Days</div>
          <p className="text-xs text-[#756A78]">Unique calendar days logged in DB</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Quiz Accuracy Rate</span>
            <TrendingUp className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{analytics.quiz_accuracy_pct}%</div>
          <p className="text-xs text-[#756A78]">Calculated assessment accuracy</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Goal Completion Rate</span>
            <CheckCircle className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{analytics.goal_completion_pct}%</div>
          <p className="text-xs text-[#756A78]">Completed study goals ratio</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Resource Contributions</span>
            <Upload className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">
            {analytics.resource_uploads_count} <span className="text-sm font-normal text-[#756A78]">up / {analytics.resource_downloads_count} down</span>
          </div>
          <p className="text-xs text-[#756A78]">E-Shelf document activity</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">AI Assistant Interactions</span>
            <Bot className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{analytics.ai_interactions_count} Queries</div>
          <p className="text-xs text-[#756A78]">Q&A, Refinements & PDF Summaries</p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Activity Trend Chart */}
        <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E8DDEB]">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#2E003E]" />
              <h3 className="text-base font-bold text-[#241A26]">7-Day Activity Trend</h3>
            </div>
            <span className="text-xs text-[#756A78] font-mono">Past Week</span>
          </div>

          <div className="h-48 flex items-end justify-between pt-6 px-2 gap-2">
            {analytics.weekly_trend.map((item, idx) => {
              const heightPct = Math.max((item.activity_count / maxWeeklyCount) * 100, 10);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-mono text-[#2E003E] font-bold opacity-0 group-hover:opacity-100 transition">
                    {item.activity_count}
                  </span>
                  <div className="w-full bg-[#F8F3F9] rounded-t-lg h-36 flex items-end p-1 border border-[#E8DDEB]">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-[#2E003E] to-[#FFB7C5] rounded-t-md transition-all duration-300"
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-[#756A78]">{item.day_name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Type Distribution Chart */}
        <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E8DDEB]">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-[#2E003E]" />
              <h3 className="text-base font-bold text-[#241A26]">Activity Distribution Breakdown</h3>
            </div>
            <span className="text-xs text-[#756A78] font-mono">{analytics.total_activities} Total Logs</span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(analytics.activity_breakdown).length === 0 ? (
              <p className="text-xs text-[#756A78] py-6 text-center">No recorded activity logs yet.</p>
            ) : (
              Object.entries(analytics.activity_breakdown).map(([actType, count]) => {
                const pct = Math.round((count / analytics.total_activities) * 100);
                return (
                  <div key={actType} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#241A26] capitalize">{actType.replace('_', ' ')}</span>
                      <span className="text-[#2E003E] font-bold font-mono">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-[#2E003E] to-[#FFB7C5] rounded-full transition-all duration-300"
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Raw Activity Logs Table */}
      <div className="bg-white border border-[#E8DDEB] rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center pb-3 border-b border-[#E8DDEB]">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#2E003E]" />
            <h3 className="text-base font-bold text-[#241A26]">Recent Activity Log Audit (PostgreSQL DB Records)</h3>
          </div>
          <span className="text-xs text-[#756A78] font-mono">Real-Time Audit Feed</span>
        </div>

        {analytics.recent_activities.length === 0 ? (
          <p className="text-xs text-[#756A78] py-6 text-center">No recent activities recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#241A26]">
              <thead className="bg-[#F8F3F9] text-xs uppercase text-[#2E003E] border-b border-[#E8DDEB]">
                <tr>
                  <th className="px-4 py-3 font-bold">Log ID</th>
                  <th className="px-4 py-3 font-bold">Activity Type</th>
                  <th className="px-4 py-3 font-bold">Description / Context</th>
                  <th className="px-4 py-3 font-bold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDEB]">
                {analytics.recent_activities.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8F3F9] transition text-xs">
                    <td className="px-4 py-3 font-mono font-bold text-[#2E003E]">#{log.id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded font-mono text-[11px] text-[#241A26]">
                        {log.activity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#241A26]">
                      {formatActivityLabel(log.activity_type, log.metadata_json)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#756A78]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
