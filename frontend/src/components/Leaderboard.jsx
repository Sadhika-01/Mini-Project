import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Award,
  Medal,
  Users,
  Filter,
  RefreshCw,
  Sparkles,
  Flame,
  Upload,
  BookOpen,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

export default function Leaderboard() {
  const { token, user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [leaderboardData, setLeaderboardData] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch groups user belongs to for filtering
  const fetchMyGroups = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data);
      }
    } catch (err) {
      console.error("Failed to load my groups for leaderboard filter:", err);
    }
  };

  // Fetch Leaderboard Data
  const fetchLeaderboard = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const queryParam = selectedGroupId !== 'all' ? `?group_id=${selectedGroupId}` : '';
      const res = await fetch(`${API_BASE_URL}/api/v1/leaderboard/${queryParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data);
      } else {
        setError('Failed to load leaderboard rankings.');
      }
    } catch (err) {
      setError('Error connecting to backend leaderboard service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyGroups();
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [token, selectedGroupId]);

  const rankings = leaderboardData?.rankings || [];
  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-amber-900/50 via-slate-900 to-slate-900 border border-amber-500/30 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Gamified Student Rankings</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Gamified Leaderboard</h2>
          <p className="text-slate-400 text-sm mt-1">
            Earn Experience Points (XP) for study goals, uploading resources, AI Q&A, and group participation.
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl shadow-lg transition flex items-center space-x-2 text-sm shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Board</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-slate-400 font-medium">Filter Board by Group:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-slate-950 text-white border border-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Groups (Global Platform)</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id.toString()}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Showing: <strong className="text-white">{leaderboardData?.filter_group_name || 'All Groups'}</strong></span>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {rankings.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* #2 Silver (Left) */}
          {top2 && (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 text-center flex flex-col items-center justify-between shadow-xl order-2 md:order-1">
              <div className="w-12 h-12 rounded-full bg-slate-700 text-slate-200 font-black text-lg flex items-center justify-center border-2 border-slate-400 mb-2">
                🥈 2
              </div>
              <h3 className="font-bold text-white text-base truncate max-w-full">
                {top2.name} {top2.is_current_user && '(You)'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">{top2.email}</p>
              <div className="px-4 py-1.5 bg-slate-950 border border-slate-700 rounded-full font-mono text-sm font-bold text-slate-200">
                {top2.total_xp} XP
              </div>
            </div>
          )}

          {/* #1 Gold (Center Highlighted) */}
          {top1 && (
            <div className="p-7 rounded-2xl bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/60 text-center flex flex-col items-center justify-between shadow-2xl scale-105 order-1 md:order-2">
              <div className="w-14 h-14 rounded-full bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center border-2 border-amber-300 mb-2 shadow-lg shadow-amber-500/30">
                🏆 1
              </div>
              <div className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-full mb-1">
                Top Learner
              </div>
              <h3 className="font-extrabold text-white text-lg truncate max-w-full">
                {top1.name} {top1.is_current_user && '(You)'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">{top1.email}</p>
              <div className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-full font-mono text-base font-extrabold shadow-lg">
                {top1.total_xp} XP
              </div>
            </div>
          )}

          {/* #3 Bronze (Right) */}
          {top3 && (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-900/40 text-center flex flex-col items-center justify-between shadow-xl order-3">
              <div className="w-12 h-12 rounded-full bg-amber-900/60 text-amber-400 font-black text-lg flex items-center justify-center border-2 border-amber-700 mb-2">
                🥉 3
              </div>
              <h3 className="font-bold text-white text-base truncate max-w-full">
                {top3.name} {top3.is_current_user && '(You)'}
              </h3>
              <p className="text-xs text-slate-400 mb-3">{top3.email}</p>
              <div className="px-4 py-1.5 bg-slate-950 border border-slate-700 rounded-full font-mono text-sm font-bold text-amber-400">
                {top3.total_xp} XP
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transparent Points System Rules Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Transparent XP System Rules</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Registration</span>
            <span className="text-amber-400 font-bold font-mono">+50 XP</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Create / Join Group</span>
            <span className="text-amber-400 font-bold font-mono">+30 / +20 XP</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Upload Resource</span>
            <span className="text-amber-400 font-bold font-mono">+30 XP</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">AI Q&A & Summaries</span>
            <span className="text-amber-400 font-bold font-mono">+15 to +25 XP</span>
          </div>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading rankings...</div>
      ) : rankings.length === 0 ? (
        <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
          No students found in the selected group leaderboard.
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Rank</th>
                  <th className="px-6 py-4 font-semibold">Student</th>
                  <th className="px-6 py-4 font-semibold">Active Days</th>
                  <th className="px-6 py-4 font-semibold">Resources</th>
                  <th className="px-6 py-4 font-semibold">Achievements</th>
                  <th className="px-6 py-4 font-semibold text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rankings.map((student) => (
                  <tr
                    key={student.user_id}
                    className={`hover:bg-slate-800/40 transition ${
                      student.is_current_user ? 'bg-indigo-950/30 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-mono font-bold">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                        student.rank === 1 ? 'bg-amber-500 text-slate-950 font-black' :
                        student.rank === 2 ? 'bg-slate-300 text-slate-950 font-black' :
                        student.rank === 3 ? 'bg-amber-800 text-white font-black' : 'text-slate-400'
                      }`}>
                        #{student.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                        {student.name[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-white">
                          {student.name} {student.is_current_user && '(You)'}
                        </span>
                        <span className="block text-xs text-slate-400">{student.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      {student.active_days} Days
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      {student.resources_count} Shared
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.achievements.map((badge, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-amber-300 font-mono"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-amber-400 text-base">
                      {student.total_xp} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
