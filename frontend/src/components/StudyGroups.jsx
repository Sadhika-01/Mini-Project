import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import StudyMeetingRoom from './StudyMeetingRoom';
import {
  Users,
  PlusCircle,
  Search,
  UserCheck,
  UserPlus,
  LogOut,
  MessageSquare,
  BookOpen,
  Folder,
  Send,
  Sparkles,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Video
} from 'lucide-react';

export default function StudyGroups() {
  const { token, user } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [activeTab, setActiveTab] = useState('my-groups'); // 'my-groups' | 'browse'
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Group Workspace Detail View State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Workspace Mode State: 'chat' | 'meeting'
  const [workspaceMode, setWorkspaceMode] = useState('chat');

  // Backend Meeting Status State: { [group_id]: { active: boolean, participant_count: number } }
  const [meetingStatuses, setMeetingStatuses] = useState({});
  const [joiningMeeting, setJoiningMeeting] = useState(false);

  // Real-Time Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // Scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Fetch Backend Meeting Status for a Group
  const fetchMeetingStatus = async (groupId) => {
    if (!token || !groupId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/${groupId}/meeting/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingStatuses(prev => ({
          ...prev,
          [groupId]: data
        }));
        return data;
      }
    } catch (err) {
      console.warn("Failed to fetch meeting status:", err);
    }
  };

  // Periodically poll active meeting status for selected group workspace
  useEffect(() => {
    if (selectedGroup && token) {
      fetchMeetingStatus(selectedGroup.id);
      const interval = setInterval(() => {
        fetchMeetingStatus(selectedGroup.id);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup, token]);

  // Fetch groups list
  const fetchGroups = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const endpoint = activeTab === 'my-groups'
        ? `${API_BASE_URL}/api/v1/groups/my`
        : `${API_BASE_URL}/api/v1/groups/`;

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        // Fetch meeting status for member groups
        data.forEach(g => {
          if (g.is_member) {
            fetchMeetingStatus(g.id);
          }
        });
      } else {
        setError('Failed to fetch study groups.');
      }
    } catch (err) {
      setError('Network error connecting to backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedGroup) {
      fetchGroups();
    }
  }, [token, activeTab, selectedGroup]);

  // Create Group Submission
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || null
        })
      });

      if (res.ok) {
        setGroupName('');
        setGroupDesc('');
        setShowCreateModal(false);
        setActiveTab('my-groups');
        fetchGroups();
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to create group.');
      }
    } catch (err) {
      alert('Network error while creating group.');
    } finally {
      setCreating(false);
    }
  };

  // Join Group
  const handleJoinGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchGroups();
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to join group.');
      }
    } catch (err) {
      alert('Network error while joining group.');
    }
  };

  // Leave Group
  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to leave this study group?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        if (selectedGroup && selectedGroup.id === groupId) {
          handleCloseWorkspace();
        }
        fetchGroups();
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to leave group.');
      }
    } catch (err) {
      alert('Network error while leaving group.');
    }
  };

  // Open Workspace & Connect WebSockets Chat
  const handleOpenWorkspace = async (group, initialMode = 'chat') => {
    setSelectedGroup(group);
    setWorkspaceMode(initialMode);
    setWorkspaceLoading(true);
    setChatMessages([]);
    fetchMeetingStatus(group.id);

    try {
      // 1. Fetch Group Details & Roster
      const resDetails = await fetch(`${API_BASE_URL}/api/v1/groups/${group.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resDetails.ok) {
        setWorkspaceDetails(await resDetails.json());
      }

      // 2. Fetch Initial Chat History
      const resChat = await fetch(`${API_BASE_URL}/api/v1/groups/${group.id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resChat.ok) {
        setChatMessages(await resChat.json());
      }

      // 3. Connect Real-Time FastAPI WebSockets for Chat
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/groups/${group.id}/ws?token=${token}`;

      if (socketRef.current) {
        socketRef.current.close();
      }

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setChatMessages((prev) => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        setWsConnected(false);
      };

    } catch (err) {
      console.error("Failed to load workspace details:", err);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // Clean up WebSocket on close
  const handleCloseWorkspace = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSelectedGroup(null);
    setWorkspaceDetails(null);
    setWorkspaceMode('chat');
  };

  // Send Chat Message via WebSocket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(JSON.stringify({
      message_text: chatInput.trim()
    }));

    setChatInput('');
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* If Workspace is open, show Workspace View */}
      {selectedGroup ? (
        <div className="space-y-6">
          {/* Workspace Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div>
              <button
                onClick={handleCloseWorkspace}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-2 block"
              >
                ← Back to All Groups
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold text-white">{selectedGroup.name}</h2>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md text-xs font-mono">
                  {workspaceDetails?.member_count || selectedGroup.member_count} Members
                </span>
                {meetingStatuses[selectedGroup.id]?.active && (
                  <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-md text-xs font-mono animate-pulse">
                    🔴 Active Meeting ({meetingStatuses[selectedGroup.id].participant_count} Live)
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1">{selectedGroup.description || 'Dedicated study workspace for group members.'}</p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {workspaceMode === 'chat' ? (
                <button
                  onClick={async () => {
                    setJoiningMeeting(true);
                    await fetchMeetingStatus(selectedGroup.id);
                    setWorkspaceMode('meeting');
                    setJoiningMeeting(false);
                  }}
                  disabled={joiningMeeting}
                  className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
                >
                  <Video className="w-4 h-4" />
                  <span>
                    {joiningMeeting
                      ? '⏳ Joining Meeting...'
                      : meetingStatuses[selectedGroup.id]?.active
                        ? `🎥 Join Meeting (${meetingStatuses[selectedGroup.id].participant_count} Active)`
                        : '🎥 Start Meeting'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setWorkspaceMode('chat')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition flex items-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Switch to Live Chat</span>
                </button>
              )}

              <button
                onClick={() => handleLeaveGroup(selectedGroup.id)}
                className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Group</span>
              </button>
            </div>
          </div>

          {/* Workspace Content: Meeting Room OR Live Chat + Roster */}
          {workspaceMode === 'meeting' ? (
            <StudyMeetingRoom
              groupId={selectedGroup.id}
              groupName={selectedGroup.name}
              token={token}
              currentUser={user}
              onClose={() => {
                setWorkspaceMode('chat');
                if (selectedGroup) fetchMeetingStatus(selectedGroup.id);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Real-Time Group Chat Box */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[560px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">Group Live Chat</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">FastAPI WebSockets + PostgreSQL</span>
                </div>

                {/* Chat Messages Log */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                      No messages yet. Send a real-time message to start the conversation!
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isCurrentUser = msg.sender_name === user?.name || msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1 px-1">
                            <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md leading-relaxed ${
                              isCurrentUser
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                            }`}
                          >
                            {msg.message_text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Real-Time Message Input Form */}
                <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-800 flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a real-time message to group members..."
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || !wsConnected}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-lg disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

              {/* Right 1 Col: Group Roster */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Group Roster</h3>
                </div>

                {workspaceLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Loading members...</div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto">
                    {workspaceDetails?.members?.map((m) => (
                      <div key={m.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                          {m.name[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">
                            {m.name} {m.user_id === user?.id && '(You)'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Joined {new Date(m.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Default List / Browse Groups View */
        <>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Collaborative Study Workspaces</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Study Groups</h2>
              <p className="text-slate-400 text-sm mt-1">
                Join course groups, collaborate on resources, participate in live chat, and start WebRTC study meetings.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition flex items-center space-x-2 text-sm shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          </div>

          {/* Navigation Sub-Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('my-groups')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'my-groups'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Groups
              </button>
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'browse'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Browse All Groups
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups by name or subject..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Create Group Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-white">Create New Study Group</h3>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Group Name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. B.Tech Cloud Computing & AWS"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      rows={3}
                      placeholder="Brief topic summary, subject code, or goals..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Groups Grid Cards */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading study groups...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
              {activeTab === 'my-groups'
                ? "You haven't joined any study groups yet. Switch to 'Browse All Groups' or create your own!"
                : "No study groups found matching your search."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((g) => {
                const meetingStatus = meetingStatuses[g.id];
                const isMeetingActive = meetingStatus?.active;

                return (
                  <div
                    key={g.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded-md text-xs font-mono">
                          {g.member_count} {g.member_count === 1 ? 'Member' : 'Members'}
                        </span>
                        {g.is_member && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-semibold">
                            Joined
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                        {g.name}
                      </h3>
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                        {g.description || 'No description provided.'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">Created by {g.creator_name}</p>
                    </div>

                    <div className="pt-5 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-2">
                      {g.is_member ? (
                        <>
                          <button
                            onClick={() => handleOpenWorkspace(g, 'chat')}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-md"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Live Chat</span>
                          </button>
                          <button
                            onClick={() => handleOpenWorkspace(g, 'meeting')}
                            className={`px-3 py-2 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1 shadow-md ${
                              isMeetingActive
                                ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 animate-pulse'
                                : 'bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500'
                            }`}
                            title={isMeetingActive ? "Join Active Virtual Meeting" : "Start Virtual Meeting"}
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{isMeetingActive ? 'Join Meeting' : 'Start Meeting'}</span>
                          </button>
                          <button
                            onClick={() => handleLeaveGroup(g.id)}
                            className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition"
                            title="Leave Group"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(g.id)}
                          className="w-full py-2 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-slate-700"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Join Group</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
