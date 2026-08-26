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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-900/50 via-slate-900 to-slate-900 border border-blue-500/30 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>PostgreSQL Activity Analytics Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Learning Analytics Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time study performance, engagement trends, and activity metrics calculated directly from your database logs.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calculated Study Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{analytics.estimated_study_hours} hrs</div>
          <p className="text-xs text-slate-400">Based on session & interaction frequency</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Study Days</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{analytics.total_active_days} Days</div>
          <p className="text-xs text-slate-400">Unique calendar days logged in DB</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quiz Accuracy Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{analytics.quiz_accuracy_pct}%</div>
          <p className="text-xs text-slate-400">Calculated assessment accuracy</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Goal Completion Rate</span>
            <CheckCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{analytics.goal_completion_pct}%</div>
          <p className="text-xs text-slate-400">Completed study goals ratio</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resource Contributions</span>
            <Upload className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">
            {analytics.resource_uploads_count} <span className="text-sm font-normal text-slate-400">up / {analytics.resource_downloads_count} down</span>
          </div>
          <p className="text-xs text-slate-400">E-Shelf document activity</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Assistant Interactions</span>
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{analytics.ai_interactions_count} Queries</div>
          <p className="text-xs text-slate-400">Q&A, Refinements & PDF Summaries</p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Activity Trend Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-bold text-white">7-Day Activity Trend</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Past Week</span>
          </div>

          <div className="h-48 flex items-end justify-between pt-6 px-2 gap-2">
            {analytics.weekly_trend.map((item, idx) => {
              const heightPct = Math.max((item.activity_count / maxWeeklyCount) * 100, 10);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-mono text-indigo-300 opacity-0 group-hover:opacity-100 transition">
                    {item.activity_count}
                  </span>
                  <div className="w-full bg-slate-800 rounded-t-lg h-36 flex items-end p-1">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-md transition-all duration-300"
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{item.day_name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Type Distribution Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Activity Distribution Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{analytics.total_activities} Total Logs</span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(analytics.activity_breakdown).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recorded activity logs yet.</p>
            ) : (
              Object.entries(analytics.activity_breakdown).map(([actType, count]) => {
                const pct = Math.round((count / analytics.total_activities) * 100);
                return (
                  <div key={actType} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300 capitalize">{actType.replace('_', ' ')}</span>
                      <span className="text-indigo-400 font-mono">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Raw Activity Logs Table (Explicit Separation from Calculated Analytics) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Recent Activity Log Audit (PostgreSQL DB Records)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-Time Audit Feed</span>
        </div>

        {analytics.recent_activities.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No recent activities recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Log ID</th>
                  <th className="px-4 py-3 font-semibold">Activity Type</th>
                  <th className="px-4 py-3 font-semibold">Description / Context</th>
                  <th className="px-4 py-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {analytics.recent_activities.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition text-xs">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-400">#{log.id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-300">
                        {log.activity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {formatActivityLabel(log.activity_type, log.metadata_json)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
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
