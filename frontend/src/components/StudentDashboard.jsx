import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DoubtForum from './DoubtForum';
import StudyGroups from './StudyGroups';
import EShelf from './EShelf';
import LearningAnalytics from './LearningAnalytics';
import Leaderboard from './Leaderboard';
import Planner from './Planner';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  HelpCircle,
  Calendar,
  Trophy,
  BarChart3,
  LogOut,
  Clock,
  CheckCircle,
  TrendingUp,
  FileText,
  Sparkles,
  ChevronRight,
  Flame,
  Video
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [noticeMessage, setNoticeMessage] = useState('');

  // EXACT SEVEN Sidebar Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'groups', label: 'Study Groups', icon: Users },
    { id: 'eshelf', label: 'E-Shelf', icon: BookOpen },
    { id: 'doubt-forum', label: 'Doubt Forum', icon: HelpCircle },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'analytics', label: 'Learning Analytics', icon: BarChart3 },
  ];

  // Mock Dashboard Metrics
  const metrics = [
    {
      title: 'Study Hours',
      value: '28.5 hrs',
      subtext: '+4.2 hrs this week',
      icon: Clock,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    },
    {
      title: 'Quiz Accuracy',
      value: '87.5%',
      subtext: 'Top 10% in group',
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'Goal Completion',
      value: '80%',
      subtext: '4 of 5 weekly goals',
      icon: CheckCircle,
      color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-400',
    },
    {
      title: 'Active Days',
      value: '14 Days',
      subtext: 'Current daily streak',
      icon: Flame,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    },
  ];

  // Mock Study Groups
  const mockStudyGroups = [
    { id: 1, name: 'Cloud Computing & AWS Lab', members: 12, subject: 'Cloud Architecture', activity: 'Active now' },
    { id: 2, name: 'AI & Machine Learning B.Tech', members: 18, subject: 'Neural Networks', activity: '2h ago' },
    { id: 3, name: 'Data Structures & Algorithms', members: 24, subject: 'Tree Traversal', activity: 'Yesterday' },
  ];

  // Mock Recent E-Shelf Resources
  const mockResources = [
    { id: 1, title: 'AWS Distributed Systems Guide.pdf', category: 'Cloud', size: '2.4 MB', uploader: 'Prof. Sharma' },
    { id: 2, title: 'Unit 3 - Deep Learning Notes.pdf', category: 'AI/NLP', size: '1.8 MB', uploader: 'Ananya S.' },
    { id: 3, title: 'FastAPI Microservices Cheatsheet.pdf', category: 'Backend', size: '950 KB', uploader: 'Vasudev D.' },
  ];

  const handleNavClick = (tabId, label) => {
    setActiveTab(tabId);
    setNoticeMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/20">
              M
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-tight">Minnie Study</h1>
              <p className="text-xs text-indigo-400 font-medium">Collaborative Cloud AI</p>
            </div>
          </div>

          {/* EXACT 7 Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Navigation Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id, item.label)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-sm shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content View Container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {activeTab === 'doubt-forum' ? (
          <DoubtForum />
        ) : activeTab === 'groups' ? (
          <StudyGroups />
        ) : activeTab === 'eshelf' ? (
          <EShelf />
        ) : activeTab === 'planner' ? (
          <Planner />
        ) : activeTab === 'analytics' ? (
          <LearningAnalytics />
        ) : activeTab === 'leaderboard' ? (
          <Leaderboard />
        ) : (
          <>
            {/* Top Workspace Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
              <div>
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Student Workspace</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Welcome back, {user?.name}! 👋
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleNavClick('groups', 'Study Groups')}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center space-x-2"
                >
                  <Video className="w-4 h-4" />
                  <span>🎥 Study Meetings</span>
                </button>
                <div className="bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-300">Session Verified</span>
                </div>
              </div>
            </header>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {metrics.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl bg-gradient-to-br ${m.color} bg-slate-900/90 border shadow-lg flex flex-col justify-between`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {m.title}
                      </span>
                      <div className="p-2 bg-slate-800/80 rounded-lg">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white tracking-tight mb-1">
                        {m.value}
                      </div>
                      <div className="text-xs font-medium text-slate-400">
                        {m.subtext}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Active Study Groups Widget */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-base font-bold text-white">Your Study Groups</h3>
                    </div>
                    <button
                      onClick={() => handleNavClick('groups', 'Study Groups')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center"
                    >
                      View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {mockStudyGroups.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => handleNavClick('groups', 'Study Groups')}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition group cursor-pointer"
                      >
                        <div className="text-xs font-mono text-indigo-400 mb-1">{g.subject}</div>
                        <h4 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition line-clamp-1 mb-3">
                          {g.name}
                        </h4>
                        <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                          <span>{g.members} Members</span>
                          <span className="text-emerald-400">{g.activity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared E-Shelf Resources Widget */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-base font-bold text-white">Recent E-Shelf Resources</h3>
                    </div>
                    <button
                      onClick={() => handleNavClick('eshelf', 'E-Shelf')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center"
                    >
                      Browse E-Shelf <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mockResources.map((r) => (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:bg-slate-900 transition"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <h4 className="text-xs font-semibold text-white truncate">{r.title}</h4>
                            <p className="text-[10px] text-slate-400">Uploaded by {r.uploader}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-400">
                          {r.size}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
