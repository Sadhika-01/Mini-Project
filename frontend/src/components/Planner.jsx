import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  Award,
  ListTodo,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function Planner() {
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Data States
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Form States
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalType, setGoalType] = useState('daily');
  const [goalDueDate, setGoalDueDate] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [sessionSubject, setSessionSubject] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Fetch all planner data
  const fetchPlannerData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resGoals, resTasks, resSess, resStats] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/planner/goals`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/planner/tasks`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/planner/sessions`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/planner/stats`, { headers })
      ]);

      if (resGoals.ok && resTasks.ok && resSess.ok && resStats.ok) {
        setGoals(await resGoals.json());
        setTasks(await resTasks.json());
        setSessions(await resSess.json());
        setStats(await resStats.json());
      } else {
        setError('Failed to load planner data.');
      }
    } catch (err) {
      console.error("Planner load error:", err);
      setError('Network error connecting to planner backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlannerData();
  }, [token]);

  // Handle Goal Creation
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/goals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: goalTitle.trim(),
          description: goalDesc.trim() || null,
          goal_type: goalType,
          due_date: goalDueDate ? new Date(goalDueDate).toISOString() : null
        })
      });

      if (res.ok) {
        setGoalTitle('');
        setGoalDesc('');
        setShowGoalModal(false);
        fetchPlannerData();
      }
    } catch (err) {
      console.error("Create goal error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Goal Completion
  const handleCompleteGoal = async (goalId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/goals/${goalId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchPlannerData();
    } catch (err) {
      console.error("Complete goal error:", err);
    }
  };

  // Handle Goal Deletion
  const handleDeleteGoal = async (goalId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/goals/${goalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchPlannerData();
    } catch (err) {
      console.error("Delete goal error:", err);
    }
  };

  // Handle Task Creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          priority: taskPriority,
          due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null
        })
      });

      if (res.ok) {
        setTaskTitle('');
        setTaskDesc('');
        setShowTaskModal(false);
        fetchPlannerData();
      }
    } catch (err) {
      console.error("Create task error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Task Completion
  const handleCompleteTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchPlannerData();
    } catch (err) {
      console.error("Complete task error:", err);
    }
  };

  // Handle Task Deletion
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchPlannerData();
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  // Handle Study Session Record
  const handleRecordSession = async (e) => {
    e.preventDefault();
    if (!sessionSubject.trim() || !sessionDuration) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: sessionSubject.trim(),
          duration_minutes: parseInt(sessionDuration, 10),
          session_date: sessionDate || new Date().toISOString().split('T')[0],
          notes: sessionNotes.trim() || null
        })
      });

      if (res.ok) {
        setSessionSubject('');
        setSessionNotes('');
        setShowSessionModal(false);
        fetchPlannerData();
      }
    } catch (err) {
      console.error("Record session error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return t.status === 'pending';
    if (taskFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const getPriorityBadge = (priority) => {
    if (priority === 'high') return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-[10px] font-semibold uppercase">High</span>;
    if (priority === 'medium') return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[10px] font-semibold uppercase">Medium</span>;
    return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-[10px] font-semibold uppercase">Low</span>;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Loading study planner & stats...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#2E003E] text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-[#FFB7C5] text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#FFB7C5]" />
            <span>Integrated Study Planner & Goal Tracker</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Planner</h2>
          <p className="text-white/80 text-sm mt-1">
            Plan your learning. Track your progress. Earn points for completing goals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md border border-[#FFB7C5]/30"
          >
            <Plus className="w-4 h-4 text-[#FFB7C5]" />
            <span>Add Goal</span>
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md border border-[#FFB7C5]/30"
          >
            <Plus className="w-4 h-4 text-[#FFB7C5]" />
            <span>Add Task</span>
          </button>
          <button
            onClick={() => setShowSessionModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md border border-[#FFB7C5]/30"
          >
            <Clock className="w-4 h-4 text-[#FFB7C5]" />
            <span>Log Study</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: Weekly Progress & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Total Study Time</span>
            <Clock className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{stats?.total_study_hours || 0} hrs</div>
          <p className="text-xs text-[#756A78]">{stats?.total_study_sessions_count || 0} recorded sessions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Daily / Weekly Goals</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">
            {stats?.todays_goals_completed + stats?.weekly_goals_completed} <span className="text-sm font-normal text-[#756A78]">/ {stats?.todays_goals_total + stats?.weekly_goals_total}</span>
          </div>
          <p className="text-xs text-[#756A78]">Completed study goals</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Task Completion</span>
            <ListTodo className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{stats?.task_completion_pct || 0}%</div>
          <p className="text-xs text-[#756A78]">{stats?.completed_tasks_count || 0} completed, {stats?.pending_tasks_count || 0} pending</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8DDEB] shadow-sm hover:border-[#FFB7C5] transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-[#756A78] uppercase tracking-wider">Earned Points (XP)</span>
            <Award className="w-4 h-4 text-[#2E003E]" />
          </div>
          <div className="text-3xl font-black text-[#2E003E] mb-1">{stats?.total_points || 0} XP</div>
          <p className="text-xs text-[#756A78]">Synced to Leaderboard</p>
        </div>
      </div>

      {/* SECTION 1: Study Goals Cards */}
      <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#E8DDEB]">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#2E003E]" />
            <h3 className="text-base font-bold text-[#241A26]">Active Study Goals</h3>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-xs text-[#2E003E] hover:text-[#1F002B] font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="py-8 text-center text-[#756A78] text-sm">
            No study goals created yet. Click "Add Goal" to set a daily or weekly study target!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const isCompleted = g.status === 'completed';
              const pts = g.goal_type === 'weekly' ? 30 : 10;
              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    isCompleted
                      ? 'bg-[#F8F3F9] border-[#E8DDEB] opacity-75'
                      : 'bg-[#F8F3F9] border-[#E8DDEB] hover:border-[#FFB7C5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold mb-1 bg-[#2E003E] text-white">
                        {g.goal_type} Goal (+{pts} XP)
                      </span>
                      <h4 className={`font-bold text-sm ${isCompleted ? 'line-through text-[#756A78]' : 'text-[#241A26]'}`}>
                        {g.title}
                      </h4>
                      {g.description && <p className="text-xs text-[#756A78] mt-1">{g.description}</p>}
                    </div>

                    <div className="flex items-center space-x-1">
                      {!isCompleted && (
                        <button
                          onClick={() => handleCompleteGoal(g.id)}
                          className="px-3 py-1.5 bg-[#2E003E] hover:bg-[#1F002B] text-white font-semibold rounded-lg text-xs transition shadow-sm"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1.5 text-[#756A78] hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-[#756A78] font-mono">
                      <span>Progress</span>
                      <span>{isCompleted ? '100%' : 'Pending'}</span>
                    </div>
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E8DDEB]">
                      <div
                        className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-[#2E003E]'}`}
                        style={{ width: isCompleted ? '100%' : '30%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Planner Tasks List */}
      <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E8DDEB]">
          <div className="flex items-center space-x-2">
            <ListTodo className="w-5 h-5 text-[#2E003E]" />
            <h3 className="text-base font-bold text-[#241A26]">Tasks & To-Dos</h3>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 bg-[#F8F3F9] p-1 rounded-xl border border-[#E8DDEB] text-xs">
            <button
              onClick={() => setTaskFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${taskFilter === 'all' ? 'bg-[#2E003E] text-white shadow-sm' : 'text-[#756A78] hover:text-[#241A26]'}`}
            >
              All
            </button>
            <button
              onClick={() => setTaskFilter('pending')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${taskFilter === 'pending' ? 'bg-[#2E003E] text-white shadow-sm' : 'text-[#756A78] hover:text-[#241A26]'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setTaskFilter('completed')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${taskFilter === 'completed' ? 'bg-[#2E003E] text-white shadow-sm' : 'text-[#756A78] hover:text-[#241A26]'}`}
            >
              Completed
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-[#756A78] text-sm">
            No tasks found in this view. Click "Add Task" to create one!
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((t) => {
              const isCompleted = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isCompleted
                      ? 'bg-[#F8F3F9] border-[#E8DDEB] opacity-70'
                      : 'bg-[#F8F3F9] border-[#E8DDEB] hover:border-[#FFB7C5]'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <button
                      onClick={() => !isCompleted && handleCompleteTask(t.id)}
                      disabled={isCompleted}
                      className="text-[#756A78] hover:text-emerald-600 transition"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#756A78]" />
                      )}
                    </button>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-[#756A78]' : 'text-[#241A26]'}`}>
                          {t.title}
                        </span>
                        {getPriorityBadge(t.priority)}
                      </div>
                      {t.description && <p className="text-xs text-[#756A78] truncate">{t.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-3">
                    <span className="text-xs font-mono text-[#2E003E] font-bold">+5 XP</span>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 text-[#756A78] hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Recorded Study Sessions */}
      <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#E8DDEB]">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#2E003E]" />
            <h3 className="text-base font-bold text-[#241A26]">Recorded Study Sessions</h3>
          </div>
          <button
            onClick={() => setShowSessionModal(true)}
            className="text-xs text-[#2E003E] hover:text-[#1F002B] font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Session</span>
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="py-6 text-center text-[#756A78] text-sm">
            No study sessions recorded yet. Click "Log Study" to record study time and earn +10 XP!
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="p-3.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-[#241A26]">{s.subject}</h4>
                    <span className="px-2 py-0.5 bg-white text-[#2E003E] border border-[#E8DDEB] rounded text-[11px] font-mono font-bold">
                      {s.duration_minutes} mins
                    </span>
                  </div>
                  {s.notes && <p className="text-xs text-[#756A78] mt-0.5">{s.notes}</p>}
                </div>
                <div className="text-right font-mono text-xs text-[#756A78]">
                  <span>{new Date(s.session_date).toLocaleDateString()}</span>
                  <span className="block text-[#2E003E] font-bold">+10 XP</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE GOAL MODAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#2E003E]">Create Study Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Complete 20 DSA problems"
                  required
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm"
                >
                  <option value="daily">Daily Goal (+10 XP)</option>
                  <option value="weekly">Weekly Goal (+30 XP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Description (Optional)</label>
                <textarea
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief details about your goal..."
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 bg-[#F8F3F9] text-[#756A78] border border-[#E8DDEB] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#2E003E]">Create Planner Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Read Operating Systems Chapter 4"
                  required
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Priority Level</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Description (Optional)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  placeholder="Notes or details..."
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-[#F8F3F9] text-[#756A78] border border-[#E8DDEB] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD STUDY SESSION MODAL */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#2E003E]">Record Study Session</h3>
            <form onSubmit={handleRecordSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Subject / Activity</label>
                <input
                  type="text"
                  value={sessionSubject}
                  onChange={(e) => setSessionSubject(e.target.value)}
                  placeholder="e.g. Computer Networks / Machine Learning"
                  required
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  min="15"
                  max="600"
                  required
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Notes (Optional)</label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={2}
                  placeholder="What did you study during this session?"
                  className="w-full px-3 py-2 bg-[#F8F3F9] border border-[#E8DDEB] rounded-lg text-[#241A26] text-sm focus:outline-none focus:border-[#2E003E]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 bg-[#F8F3F9] text-[#756A78] border border-[#E8DDEB] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Log Session (+10 XP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
