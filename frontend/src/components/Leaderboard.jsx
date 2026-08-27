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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#2E003E] text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-[#FFB7C5] text-xs font-semibold uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5 text-[#FFB7C5]" />
            <span>Gamified Student Rankings</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Gamified Leaderboard</h2>
          <p className="text-white/80 text-sm mt-1">
            Earn Experience Points (XP) for study goals, uploading resources, AI Q&A, and group participation.
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl shadow-md transition flex items-center space-x-2 text-sm shrink-0 border border-[#FFB7C5]/30"
        >
          <RefreshCw className="w-4 h-4 text-[#FFB7C5]" />
          <span>Refresh Board</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-[#E8DDEB] text-xs shadow-sm">
          <Filter className="w-4 h-4 text-[#756A78] ml-1" />
          <span className="text-[#756A78] font-medium">Filter Board by Group:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="bg-[#F8F3F9] text-[#241A26] border border-[#E8DDEB] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#2E003E]"
          >
            <option value="all">All Groups (Global Platform)</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id.toString()}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-[#756A78] flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-[#2E003E]" />
          <span>Showing: <strong className="text-[#2E003E]">{leaderboardData?.filter_group_name || 'All Groups'}</strong></span>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {rankings.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* #2 Silver (Left) */}
          {top2 && (
            <div className="p-6 rounded-2xl bg-white border border-slate-300 text-center flex flex-col items-center justify-between shadow-sm order-2 md:order-1">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 font-black text-lg flex items-center justify-center border-2 border-slate-300 mb-2">
                🥈 2
              </div>
              <h3 className="font-bold text-[#241A26] text-base truncate max-w-full">
                {top2.name} {top2.is_current_user && '(You)'}
              </h3>
              <p className="text-xs text-[#756A78] mb-3">{top2.email}</p>
              <div className="px-4 py-1.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-full font-mono text-sm font-bold text-[#2E003E]">
                {top2.total_xp} XP
              </div>
            </div>
          )}

          {/* #1 Gold (Center Highlighted) */}
          {top1 && (
            <div className="p-7 rounded-2xl bg-white border-2 border-amber-400 text-center flex flex-col items-center justify-between shadow-md scale-105 order-1 md:order-2">
              <div className="w-14 h-14 rounded-full bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center border-2 border-amber-300 mb-2 shadow-md">
                🏆 1
              </div>
              <div className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded-full mb-1">
                Top Learner
              </div>
              <h3 className="font-extrabold text-[#2E003E] text-lg truncate max-w-full">
                {top1.name} {top1.is_current_user && '(You)'}
              </h3>
              <p className="text-xs text-[#756A78] mb-4">{top1.email}</p>
              <div className="px-5 py-2 bg-[#2E003E] text-white rounded-full font-mono text-base font-extrabold shadow-md border border-[#FFB7C5]/30">
                {top1.total_xp} XP
              </div>
            </div>
          )}

          {/* #3 Bronze (Right) */}
          {top3 && (
            <div className="p-6 rounded-2xl bg-white border border-amber-800/20 text-center flex flex-col items-center justify-between shadow-sm order-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 font-black text-lg flex items-center justify-center border-2 border-amber-600/40 mb-2">
                🥉 3
              </div>
              <h3 className="font-bold text-[#241A26] text-base truncate max-w-full">
                {top3.name} {top3.is_current_user && '(You)'}
              </h3>
              <p className="text-xs text-[#756A78] mb-3">{top3.email}</p>
              <div className="px-4 py-1.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-full font-mono text-sm font-bold text-[#2E003E]">
                {top3.total_xp} XP
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transparent Points System Rules Box */}
      <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-[#241A26] uppercase tracking-wider flex items-center space-x-2">
          <Award className="w-4 h-4 text-[#2E003E]" />
          <span>Transparent XP System Rules</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-[#F8F3F9] rounded-xl border border-[#E8DDEB]">
            <span className="text-[#756A78] block">Registration</span>
            <span className="text-[#2E003E] font-bold font-mono">+50 XP</span>
          </div>
          <div className="p-2.5 bg-[#F8F3F9] rounded-xl border border-[#E8DDEB]">
            <span className="text-[#756A78] block">Create / Join Group</span>
            <span className="text-[#2E003E] font-bold font-mono">+30 / +20 XP</span>
          </div>
          <div className="p-2.5 bg-[#F8F3F9] rounded-xl border border-[#E8DDEB]">
            <span className="text-[#756A78] block">Upload Resource</span>
            <span className="text-[#2E003E] font-bold font-mono">+30 XP</span>
          </div>
          <div className="p-2.5 bg-[#F8F3F9] rounded-xl border border-[#E8DDEB]">
            <span className="text-[#756A78] block">AI Q&A & Summaries</span>
            <span className="text-[#2E003E] font-bold font-mono">+15 to +25 XP</span>
          </div>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      {loading ? (
        <div className="py-12 text-center text-[#756A78] text-sm">Loading rankings...</div>
      ) : rankings.length === 0 ? (
        <div className="p-12 bg-white border border-[#E8DDEB] rounded-2xl text-center text-[#756A78] text-sm">
          No students found in the selected group leaderboard.
        </div>
      ) : (
        <div className="bg-white border border-[#E8DDEB] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#241A26]">
              <thead className="bg-[#F8F3F9] text-xs uppercase text-[#2E003E] border-b border-[#E8DDEB]">
                <tr>
                  <th className="px-6 py-4 font-bold">Rank</th>
                  <th className="px-6 py-4 font-bold">Student</th>
                  <th className="px-6 py-4 font-bold">Active Days</th>
                  <th className="px-6 py-4 font-bold">Resources</th>
                  <th className="px-6 py-4 font-bold">Achievements</th>
                  <th className="px-6 py-4 font-bold text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDEB]">
                {rankings.map((student) => (
                  <tr
                    key={student.user_id}
                    className={`hover:bg-[#F8F3F9] transition ${
                      student.is_current_user ? 'bg-[#F8F3F9] border-l-4 border-[#2E003E]' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-mono font-bold">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                        student.rank === 1 ? 'bg-amber-400 text-slate-950 font-black shadow-sm' :
                        student.rank === 2 ? 'bg-slate-200 text-slate-900 font-black' :
                        student.rank === 3 ? 'bg-amber-700 text-white font-black' : 'text-[#756A78]'
                      }`}>
                        #{student.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#241A26] flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2E003E] text-white flex items-center justify-center font-bold text-xs">
                        {student.name[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-[#241A26]">
                          {student.name} {student.is_current_user && '(You)'}
                        </span>
                        <span className="block text-xs text-[#756A78]">{student.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#241A26]">
                      {student.active_days} Days
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-[#241A26]">
                      {student.resources_count} Shared
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.achievements.map((badge, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded text-[11px] text-[#2E003E] font-semibold font-mono"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#2E003E] text-base">
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
