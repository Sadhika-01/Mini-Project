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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-purple-900/50 via-slate-900 to-slate-900 border border-purple-500/30 p-6 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Integrated Study Planner & Goal Tracker</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Planner</h2>
          <p className="text-slate-400 text-sm mt-1">
            Plan your learning. Track your progress. Earn points for completing goals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Goal</span>
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
          <button
            onClick={() => setShowSessionModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-lg"
          >
            <Clock className="w-4 h-4" />
            <span>Log Study</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: Weekly Progress & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Study Time</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{stats?.total_study_hours || 0} hrs</div>
          <p className="text-xs text-slate-400">{stats?.total_study_sessions_count || 0} recorded sessions</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily / Weekly Goals</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">
            {stats?.todays_goals_completed + stats?.weekly_goals_completed} <span className="text-sm font-normal text-slate-400">/ {stats?.todays_goals_total + stats?.weekly_goals_total}</span>
          </div>
          <p className="text-xs text-slate-400">Completed study goals</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Completion</span>
            <ListTodo className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white mb-1">{stats?.task_completion_pct || 0}%</div>
          <p className="text-xs text-slate-400">{stats?.completed_tasks_count || 0} completed, {stats?.pending_tasks_count || 0} pending</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 bg-slate-900/90 shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Earned Points (XP)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 mb-1">{stats?.total_points || 0} XP</div>
          <p className="text-xs text-slate-400">Synced to Leaderboard</p>
        </div>
      </div>

      {/* SECTION 1: Study Goals Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Active Study Goals</h3>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal</span>
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
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
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                      : 'bg-slate-950/90 border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold mb-1 ${
                        g.goal_type === 'weekly' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        {g.goal_type} Goal (+{pts} XP)
                      </span>
                      <h4 className={`font-bold text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                        {g.title}
                      </h4>
                      {g.description && <p className="text-xs text-slate-400 mt-1">{g.description}</p>}
                    </div>

                    <div className="flex items-center space-x-1">
                      {!isCompleted && (
                        <button
                          onClick={() => handleCompleteGoal(g.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition shadow"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Progress</span>
                      <span>{isCompleted ? '100%' : 'Pending'}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ListTodo className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Tasks & To-Dos</h3>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTaskFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${taskFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setTaskFilter('pending')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${taskFilter === 'pending' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setTaskFilter('completed')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${taskFilter === 'completed' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Completed
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm">
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
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                      : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <button
                      onClick={() => !isCompleted && handleCompleteTask(t.id)}
                      disabled={isCompleted}
                      className="text-slate-400 hover:text-emerald-400 transition"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                          {t.title}
                        </span>
                        {getPriorityBadge(t.priority)}
                      </div>
                      {t.description && <p className="text-xs text-slate-400 truncate">{t.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-3">
                    <span className="text-xs font-mono text-amber-400 font-bold">+5 XP</span>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Recorded Study Sessions</h3>
          </div>
          <button
            onClick={() => setShowSessionModal(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Session</span>
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm">
            No study sessions recorded yet. Click "Log Study" to record study time and earn +10 XP!
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white">{s.subject}</h4>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-mono font-bold">
                      {s.duration_minutes} mins
                    </span>
                  </div>
                  {s.notes && <p className="text-xs text-slate-400 mt-0.5">{s.notes}</p>}
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  <span>{new Date(s.session_date).toLocaleDateString()}</span>
                  <span className="block text-amber-400 font-bold">+10 XP</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE GOAL MODAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Study Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Complete 20 DSA problems"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                >
                  <option value="daily">Daily Goal (+10 XP)</option>
                  <option value="weekly">Weekly Goal (+30 XP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description (Optional)</label>
                <textarea
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief details about your goal..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Planner Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Read Operating Systems Chapter 4"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Priority Level</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description (Optional)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  placeholder="Notes or details..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-lg disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Study Session</h3>
            <form onSubmit={handleRecordSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Subject / Activity</label>
                <input
                  type="text"
                  value={sessionSubject}
                  onChange={(e) => setSessionSubject(e.target.value)}
                  placeholder="e.g. Computer Networks / Machine Learning"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  min="15"
                  max="600"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notes (Optional)</label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={2}
                  placeholder="What did you study during this session?"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg disabled:opacity-50"
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
