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
  Video,
  Share2,
  Copy,
  Check,
  FileText,
  Info
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

  // Workspace Mode State: 'overview' | 'chat' | 'meeting'
  const [workspaceMode, setWorkspaceMode] = useState('overview');

  // Backend Meeting Status State: { [group_id]: { active: boolean, participant_count: number } }
  const [meetingStatuses, setMeetingStatuses] = useState({});
  const [joiningMeeting, setJoiningMeeting] = useState(false);

  // Share Group Link Modal & Copy State
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Invitation URL Join State (for ?join_group=XYZ)
  const [invitePreview, setInvitePreview] = useState(null);
  const [joiningInvite, setJoiningInvite] = useState(false);

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

  // Check URL query parameters for ?join_group=XYZ link invitation
  useEffect(() => {
    const checkInviteLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const joinGroupId = params.get('join_group');

      if (joinGroupId && token) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/groups/${joinGroupId}/preview`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (res.ok) {
            const previewData = await res.json();
            if (previewData.is_member) {
              // User is already a member -> Open workspace directly
              handleOpenWorkspace(previewData, 'overview');
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              // User is not a member -> Show Join Group invitation modal
              setInvitePreview(previewData);
            }
          }
        } catch (e) {
          console.error("Failed to check join group invite link:", e);
        }
      }
    };

    checkInviteLink();
  }, [token]);

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
        return true;
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to join group.');
        return false;
      }
    } catch (err) {
      alert('Network error while joining group.');
      return false;
    }
  };

  // Accept Invite Link Join
  const handleAcceptInvite = async () => {
    if (!invitePreview) return;
    setJoiningInvite(true);
    const success = await handleJoinGroup(invitePreview.id);
    setJoiningInvite(false);
    if (success) {
      const groupData = { ...invitePreview, is_member: true };
      setInvitePreview(null);
      window.history.replaceState({}, document.title, window.location.pathname);
      handleOpenWorkspace(groupData, 'overview');
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

  // Open Workspace (Default mode is 'overview')
  const handleOpenWorkspace = async (group, initialMode = 'overview') => {
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
    setWorkspaceMode('overview');
  };

  // Copy Share Group Invitation Link
  const handleCopyShareLink = () => {
    if (!selectedGroup) return;
    const shareUrl = `${window.location.origin}?join_group=${selectedGroup.id}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
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

      {/* Public Share Invite Modal */}
      {invitePreview && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F3F9] border border-[#E8DDEB] text-[#2E003E] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#2E003E] uppercase tracking-wider block mb-1">
                Group Invitation
              </span>
              <h3 className="text-xl font-bold text-[#2E003E] leading-tight">{invitePreview.name}</h3>
              <p className="text-[#756A78] text-xs mt-2 leading-relaxed">
                {invitePreview.description || 'Join this study group to collaborate on notes, participate in live chat, and start WebRTC meetings.'}
              </p>
            </div>

            <div className="p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl flex items-center justify-around text-xs font-mono text-[#2E003E]">
              <span>{invitePreview.member_count} Members</span>
              <span>•</span>
              <span>Created by {invitePreview.creator_name}</span>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setInvitePreview(null);
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="flex-1 py-2.5 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#756A78] border border-[#E8DDEB] rounded-xl text-xs font-semibold"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAcceptInvite}
                disabled={joiningInvite}
                className="flex-1 py-2.5 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4 text-[#FFB7C5]" />
                <span>{joiningInvite ? 'Joining...' : 'Join Group'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Group Modal */}
      {showShareModal && selectedGroup && (
        <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8DDEB]">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-[#2E003E]" />
                <h3 className="text-base font-bold text-[#2E003E]">Share Study Group</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[#756A78] hover:text-[#2E003E] text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-[#756A78] text-xs leading-relaxed">
              Share this invitation link with classmates so they can view the group preview and join <strong>{selectedGroup.name}</strong>.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-[#756A78] uppercase">Invitation Link</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}?join_group=${selectedGroup.id}`}
                  className="flex-1 px-3.5 py-2.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl text-[#2E003E] text-xs font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyShareLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md ${
                    linkCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#2E003E] hover:opacity-90 text-white border border-[#FFB7C5]/30'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#FFB7C5]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {linkCopied && (
              <p className="text-[11px] text-emerald-700 font-medium text-center">
                ✓ Link copied to clipboard! Anyone logged in can join this group using this link.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#756A78] border border-[#E8DDEB] rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If Workspace is open, show Workspace View */}
      {selectedGroup ? (
        <div className="space-y-6">
          {/* Central Study Group Workspace Header */}
          <div className="bg-white border border-[#E8DDEB] p-6 rounded-2xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  onClick={handleCloseWorkspace}
                  className="text-xs text-[#2E003E] hover:underline font-semibold mb-2 block"
                >
                  ← Back to All Groups
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-extrabold text-[#2E003E]">{selectedGroup.name}</h2>
                  <span className="px-2.5 py-1 bg-[#F8F3F9] text-[#2E003E] border border-[#E8DDEB] rounded-md text-xs font-mono font-semibold">
                    {workspaceDetails?.member_count || selectedGroup.member_count} Members
                  </span>
                  {meetingStatuses[selectedGroup.id]?.active && (
                    <span className="px-2.5 py-1 bg-rose-500/10 text-rose-700 border border-rose-500/30 rounded-md text-xs font-mono animate-pulse font-bold">
                      🔴 Active Meeting ({meetingStatuses[selectedGroup.id].participant_count} Live)
                    </span>
                  )}
                </div>
                <p className="text-[#756A78] text-sm mt-1">{selectedGroup.description || 'Dedicated study workspace for group members.'}</p>
              </div>

              <button
                onClick={() => handleLeaveGroup(selectedGroup.id)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Group</span>
              </button>
            </div>

            {/* Central Workspace Main Actions Bar (Overview | Live Chat | Study Meeting | Share Group) */}
            <div className="pt-3 border-t border-[#E8DDEB] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 bg-[#F8F3F9] p-1 rounded-xl border border-[#E8DDEB] text-xs font-semibold">
                <button
                  onClick={() => setWorkspaceMode('overview')}
                  className={`px-4 py-2 rounded-lg transition ${
                    workspaceMode === 'overview'
                      ? 'bg-[#2E003E] text-white shadow-sm'
                      : 'text-[#756A78] hover:text-[#241A26]'
                  }`}
                >
                  📋 Workspace Overview
                </button>
                <button
                  onClick={() => setWorkspaceMode('chat')}
                  className={`px-4 py-2 rounded-lg transition flex items-center space-x-1.5 ${
                    workspaceMode === 'chat'
                      ? 'bg-[#2E003E] text-white shadow-sm'
                      : 'text-[#756A78] hover:text-[#241A26]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Live Chat</span>
                </button>
                <button
                  onClick={async () => {
                    setJoiningMeeting(true);
                    await fetchMeetingStatus(selectedGroup.id);
                    setWorkspaceMode('meeting');
                    setJoiningMeeting(false);
                  }}
                  disabled={joiningMeeting}
                  className={`px-4 py-2 rounded-lg transition flex items-center space-x-1.5 ${
                    workspaceMode === 'meeting'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-[#756A78] hover:text-[#241A26]'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>
                    {joiningMeeting
                      ? '⏳ Joining Meeting...'
                      : meetingStatuses[selectedGroup.id]?.active
                        ? `🎥 Join Meeting (${meetingStatuses[selectedGroup.id].participant_count} Active)`
                        : '🎥 Study Meeting'}
                  </span>
                </button>
              </div>

              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#2E003E] border border-[#E8DDEB] rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Share2 className="w-4 h-4 text-[#2E003E]" />
                <span>🔗 Share Group</span>
              </button>
            </div>
          </div>

          {/* Workspace Content View: Overview OR Live Chat OR Meeting Room */}
          {workspaceMode === 'meeting' ? (
            <StudyMeetingRoom
              groupId={selectedGroup.id}
              groupName={selectedGroup.name}
              token={token}
              currentUser={user}
              onClose={() => {
                setWorkspaceMode('overview');
                if (selectedGroup) fetchMeetingStatus(selectedGroup.id);
              }}
            />
          ) : workspaceMode === 'chat' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Real-Time Group Chat Box */}
              <div className="lg:col-span-2 bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm flex flex-col h-[560px]">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DDEB] mb-4">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-[#2E003E]" />
                    <h3 className="text-base font-bold text-[#241A26]">Group Live Chat</h3>
                  </div>
                  <span className="text-xs text-[#756A78] font-mono">FastAPI WebSockets + PostgreSQL</span>
                </div>

                {/* Chat Messages Log */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[#756A78] text-xs italic">
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
                          <div className="flex items-center space-x-2 text-[11px] text-[#756A78] mb-1 px-1">
                            <span className="font-semibold text-[#2E003E]">{msg.sender_name}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm leading-relaxed ${
                              isCurrentUser
                                ? 'bg-[#2E003E] text-white rounded-br-none'
                                : 'bg-[#F8F3F9] border border-[#E8DDEB] text-[#241A26] rounded-bl-none'
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
                <form onSubmit={handleSendMessage} className="pt-4 border-t border-[#E8DDEB] flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a real-time message to group members..."
                    className="flex-1 px-4 py-2.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl text-[#241A26] placeholder-[#756A78] text-xs focus:outline-none focus:border-[#2E003E]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || !wsConnected}
                    className="px-4 py-2.5 bg-[#2E003E] hover:opacity-90 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 text-[#FFB7C5]" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

              {/* Right 1 Col: Group Roster */}
              <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-[#E8DDEB]">
                  <Users className="w-5 h-5 text-[#2E003E]" />
                  <h3 className="text-base font-bold text-[#241A26]">Group Roster</h3>
                </div>

                {workspaceLoading ? (
                  <div className="py-8 text-center text-[#756A78] text-xs">Loading members...</div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto">
                    {workspaceDetails?.members?.map((m) => (
                      <div key={m.id} className="p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2E003E] text-white font-bold text-xs flex items-center justify-center">
                          {m.name[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[#241A26] truncate">
                            {m.name} {m.user_id === user?.id && '(You)'}
                          </p>
                          <p className="text-[10px] text-[#756A78] font-mono">
                            Joined {new Date(m.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DEFAULT CENTRAL WORKSPACE OVERVIEW VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left 2 Cols: Group Overview Details & Actions */}
              <div className="lg:col-span-2 space-y-6">

                {/* Workspace Action Hub Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setWorkspaceMode('chat')}
                    className="p-5 bg-white border border-[#E8DDEB] hover:border-[#FFB7C5] rounded-2xl shadow-sm cursor-pointer transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#F8F3F9] border border-[#E8DDEB] text-[#2E003E] flex items-center justify-center mb-3 group-hover:scale-105 transition">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-[#241A26] group-hover:text-[#2E003E] transition">Group Live Chat</h4>
                    <p className="text-[#756A78] text-xs mt-1">Real-time WebSockets group discussions with PostgreSQL history.</p>
                  </div>

                  <div
                    onClick={async () => {
                      setJoiningMeeting(true);
                      await fetchMeetingStatus(selectedGroup.id);
                      setWorkspaceMode('meeting');
                      setJoiningMeeting(false);
                    }}
                    className="p-5 bg-white border border-[#E8DDEB] hover:border-rose-500/40 rounded-2xl shadow-sm cursor-pointer transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                      <Video className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-[#241A26] group-hover:text-rose-700 transition">
                      {meetingStatuses[selectedGroup.id]?.active ? 'Join Active Meeting' : 'Virtual Study Meeting'}
                    </h4>
                    <p className="text-[#756A78] text-xs mt-1">
                      {meetingStatuses[selectedGroup.id]?.active
                        ? `Meeting currently in progress (${meetingStatuses[selectedGroup.id].participant_count} members connected).`
                        : 'Start Google-Meet-style WebRTC video/audio conferencing.'}
                    </p>
                  </div>
                </div>

                {/* Group Information & Subject Metadata */}
                <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-[#E8DDEB]">
                    <Info className="w-5 h-5 text-[#2E003E]" />
                    <h3 className="text-base font-bold text-[#241A26]">Group Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl">
                      <span className="text-[#756A78] block mb-1">Created By</span>
                      <span className="font-semibold text-[#2E003E]">{workspaceDetails?.creator_name || selectedGroup.creator_name || 'Admin'}</span>
                    </div>
                    <div className="p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl">
                      <span className="text-[#756A78] block mb-1">Created On</span>
                      <span className="font-semibold text-[#2E003E]">{new Date(selectedGroup.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-[#756A78] font-semibold block mb-1">Description</span>
                    <p className="text-[#241A26] text-xs leading-relaxed p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl">
                      {selectedGroup.description || 'No additional description provided for this study workspace.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Right 1 Col: Group Roster Sidebar */}
              <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-[#E8DDEB]">
                  <Users className="w-5 h-5 text-[#2E003E]" />
                  <h3 className="text-base font-bold text-[#241A26]">Group Roster ({workspaceDetails?.member_count || selectedGroup.member_count})</h3>
                </div>

                {workspaceLoading ? (
                  <div className="py-8 text-center text-[#756A78] text-xs">Loading members...</div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto">
                    {workspaceDetails?.members?.map((m) => (
                      <div key={m.id} className="p-3 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2E003E] text-white font-bold text-xs flex items-center justify-center">
                          {m.name[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[#241A26] truncate">
                            {m.name} {m.user_id === user?.id && '(You)'}
                          </p>
                          <p className="text-[10px] text-[#756A78] font-mono">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#2E003E] text-white p-6 rounded-2xl shadow-md">
            <div>
              <div className="flex items-center space-x-2 text-[#FFB7C5] text-xs font-semibold uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5 text-[#FFB7C5]" />
                <span>Collaborative Study Workspaces</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Study Groups</h2>
              <p className="text-white/80 text-sm mt-1">
                Join course groups, collaborate on resources, participate in live chat, and start WebRTC study meetings.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl shadow-md transition flex items-center space-x-2 text-sm shrink-0 border border-[#FFB7C5]/30"
            >
              <PlusCircle className="w-4 h-4 text-[#FFB7C5]" />
              <span>Create Group</span>
            </button>
          </div>

          {/* Navigation Sub-Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-[#E8DDEB] text-xs font-semibold shadow-sm">
              <button
                onClick={() => setActiveTab('my-groups')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'my-groups'
                    ? 'bg-[#2E003E] text-white shadow-sm'
                    : 'text-[#756A78] hover:text-[#241A26]'
                }`}
              >
                My Groups
              </button>
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'browse'
                    ? 'bg-[#2E003E] text-white shadow-sm'
                    : 'text-[#756A78] hover:text-[#241A26]'
                }`}
              >
                Browse All Groups
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-[#756A78] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups by name or subject..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8DDEB] rounded-xl text-[#241A26] placeholder-[#756A78] text-xs focus:outline-none focus:border-[#2E003E] shadow-sm"
              />
            </div>
          </div>

          {/* Create Group Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-[#2E003E]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-[#E8DDEB] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-[#2E003E]">Create New Study Group</h3>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Group Name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. B.Tech Cloud Computing & AWS"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl text-[#241A26] placeholder-[#756A78] text-sm focus:outline-none focus:border-[#2E003E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E003E] uppercase mb-1">Description</label>
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      rows={3}
                      placeholder="Brief topic summary, subject code, or goals..."
                      className="w-full px-3.5 py-2.5 bg-[#F8F3F9] border border-[#E8DDEB] rounded-xl text-[#241A26] placeholder-[#756A78] text-sm focus:outline-none focus:border-[#2E003E]"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#756A78] border border-[#E8DDEB] rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-4 py-2 bg-[#2E003E] hover:opacity-90 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
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
            <div className="py-12 text-center text-[#756A78] text-sm">Loading study groups...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 bg-white border border-[#E8DDEB] rounded-2xl text-center text-[#756A78] text-sm shadow-sm">
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
                    className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-[#FFB7C5] transition group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 bg-[#F8F3F9] text-[#2E003E] border border-[#E8DDEB] rounded-md text-xs font-mono font-semibold">
                          {g.member_count} {g.member_count === 1 ? 'Member' : 'Members'}
                        </span>
                        {g.is_member && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 rounded text-[11px] font-semibold">
                            Joined
                          </span>
                        )}
                      </div>
                      <h3
                        onClick={() => g.is_member && handleOpenWorkspace(g, 'overview')}
                        className={`text-lg font-bold text-[#2E003E] line-clamp-1 transition ${
                          g.is_member ? 'hover:underline cursor-pointer' : ''
                        }`}
                      >
                        {g.name}
                      </h3>
                      <p className="text-[#756A78] text-xs line-clamp-2 leading-relaxed">
                        {g.description || 'No description provided.'}
                      </p>
                      <p className="text-[11px] text-[#756A78] font-mono">Created by {g.creator_name}</p>
                    </div>

                    <div className="pt-5 border-t border-[#E8DDEB] mt-4 flex items-center justify-between gap-2">
                      {g.is_member ? (
                        <>
                          <button
                            onClick={() => handleOpenWorkspace(g, 'overview')}
                            className="flex-1 py-2 bg-[#2E003E] hover:opacity-90 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-md"
                          >
                            <span>Open Workspace</span>
                          </button>
                          <button
                            onClick={() => handleLeaveGroup(g.id)}
                            className="p-2 bg-[#F8F3F9] hover:bg-rose-500/20 text-[#756A78] hover:text-rose-600 rounded-xl border border-[#E8DDEB] transition"
                            title="Leave Group"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleJoinGroup(g.id)}
                          className="w-full py-2 bg-[#F8F3F9] hover:bg-[#E8DDEB] text-[#2E003E] font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-[#E8DDEB]"
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
