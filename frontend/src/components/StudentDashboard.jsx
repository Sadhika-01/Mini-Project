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
    <div className="min-h-screen bg-[#F8F3F9] text-[#241A26] flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#2E003E] border-r border-[#2E003E] flex flex-col justify-between shrink-0 shadow-xl">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-white/10 flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FFB7C5] rounded-xl flex items-center justify-center font-black text-[#2E003E] text-xl shadow-md">
              M
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-tight">Minnie Study</h1>
              <p className="text-xs text-white/80 font-medium">Collaborative Cloud AI</p>
            </div>
          </div>

          {/* EXACT 7 Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-xs font-semibold text-[#FFB7C5] uppercase tracking-wider">
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
                      ? 'bg-white/15 border border-[#FFB7C5]/40 text-white shadow-sm font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFB7C5]' : 'text-white/70'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-9 h-9 rounded-xl bg-[#FFB7C5]/20 border border-[#FFB7C5]/40 text-[#FFB7C5] font-bold flex items-center justify-center text-sm shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-white/80 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-white/80 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content View Container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#F8F3F9]">
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
            <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-[#E8DDEB] gap-4">
              <div>
                <div className="flex items-center space-x-2 text-[#2E003E] text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB7C5]" />
                  <span>Student Workspace</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#2E003E] tracking-tight">
                  Welcome back, {user?.name}! 👋
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleNavClick('groups', 'Study Groups')}
                  className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-2 border border-[#FFB7C5]/30"
                >
                  <Video className="w-4 h-4 text-[#FFB7C5]" />
                  <span>🎥 Study Meetings</span>
                </button>
                <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E8DDEB] text-xs flex items-center space-x-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#2E003E] animate-pulse"></span>
                  <span className="text-[#2E003E] font-semibold">Session Verified</span>
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
                    className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">
                        {m.title}
                      </span>
                      <div className="p-2 bg-[#F8F3F9] text-[#2E003E] rounded-lg">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[#2E003E] tracking-tight mb-1">
                        {m.value}
                      </div>
                      <div className="text-xs font-medium text-[#756A78]">
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
                <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-[#2E003E]" />
                      <h3 className="text-base font-bold text-[#241A26]">Your Study Groups</h3>
                    </div>
                    <button
                      onClick={() => handleNavClick('groups', 'Study Groups')}
                      className="text-xs text-[#2E003E] hover:underline font-semibold flex items-center"
                    >
                      View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {mockStudyGroups.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => handleNavClick('groups', 'Study Groups')}
                        className="p-4 rounded-xl bg-[#F8F3F9] border border-[#E8DDEB] hover:border-[#FFB7C5] transition group cursor-pointer"
                      >
                        <div className="text-xs font-mono text-[#2E003E] font-semibold mb-1">{g.subject}</div>
                        <h4 className="font-semibold text-sm text-[#241A26] group-hover:text-[#2E003E] transition line-clamp-1 mb-3">
                          {g.name}
                        </h4>
                        <div className="flex justify-between items-center text-xs text-[#756A78] border-t border-[#E8DDEB] pt-2.5">
                          <span>{g.members} Members</span>
                          <span className="text-[#2E003E] font-semibold">{g.activity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared E-Shelf Resources Widget */}
                <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-[#2E003E]" />
                      <h3 className="text-base font-bold text-[#241A26]">Recent E-Shelf Resources</h3>
                    </div>
                    <button
                      onClick={() => handleNavClick('eshelf', 'E-Shelf')}
                      className="text-xs text-[#2E003E] hover:underline font-semibold flex items-center"
                    >
                      Browse E-Shelf <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mockResources.map((r) => (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-xl bg-[#F8F3F9] border border-[#E8DDEB] flex items-center justify-between hover:bg-[#E8DDEB]/50 transition"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <FileText className="w-4 h-4 text-[#2E003E] shrink-0" />
                          <div className="truncate">
                            <h4 className="text-xs font-semibold text-[#241A26] truncate">{r.title}</h4>
                            <p className="text-[10px] text-[#756A78]">Uploaded by {r.uploader}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-white border border-[#E8DDEB] rounded text-[10px] font-mono text-[#756A78]">
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
