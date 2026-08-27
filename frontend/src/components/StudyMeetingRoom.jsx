import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  Volume2
} from 'lucide-react';

export default function StudyMeetingRoom({ groupId, groupName, token, currentUser, onClose }) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [mediaWarning, setMediaWarning] = useState('');

  // Local & Remote Media State
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // { [user_id]: { user_id, user_name, stream, videoEnabled, audioEnabled } }

  // Refs for WebSockets & Peer Connections
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({}); // { [user_id]: RTCPeerConnection }
  const localStreamRef = useRef(null);

  // STUN Servers Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // 1. Initialize Media Stream (with Smart Fallback) & Connect WebSockets Signaling
  useEffect(() => {
    console.log("[MEETING] StudyMeetingRoom mounted");
    console.log("[MEETING] StudyMeetingRoom initialization started");
    let isSubscribed = true;

    const initMeeting = async () => {
      setLoading(true);
      setError('');
      setMediaWarning('');

      let stream = null;

      // A. Smart Media Capture Fallback Strategy
      try {
        console.log("[MEETING] getUserMedia started");
        // Attempt 1: Full Video + Audio
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log("[MEETING] getUserMedia succeeded");
        console.log("[WebRTC] Local media acquired (Video + Audio)");
      } catch (err1) {
        console.warn("Full media access failed, trying fallback constraints...", err1);
        try {
          // Attempt 2: Video only
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          console.log("[MEETING] getUserMedia succeeded (Video only)");
          console.log("[WebRTC] Local media acquired (Video only)");
          if (isSubscribed) setMediaWarning("Microphone unavailable or muted. Joined with video only.");
          setMicEnabled(false);
        } catch (err2) {
          try {
            // Attempt 3: Audio only
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            console.log("[MEETING] getUserMedia succeeded (Audio only)");
            console.log("[WebRTC] Local media acquired (Audio only)");
            if (isSubscribed) setMediaWarning("Camera unavailable or blocked. Joined with audio only.");
            setCameraEnabled(false);
          } catch (err3) {
            console.warn("No camera or mic accessible. Joining in spectator mode.", err3);
            console.log("[MEETING] getUserMedia failed / spectator mode");
            console.log("[WebRTC] Local media acquired (Spectator mode)");
            if (isSubscribed) setMediaWarning("Camera and Microphone unavailable. Joined meeting in view/listen mode.");
            setMicEnabled(false);
            setCameraEnabled(false);
          }
        }
      }

      if (!isSubscribed) return;

      if (stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // B. Connect FastAPI WebSockets Signaling
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/groups/${groupId}/meeting/ws?token=${token}`;

      console.log("[MEETING] WebSocket connecting to:", wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[MEETING] WebSocket connected");
        console.log("[WebRTC] WebSocket connected");
        if (isSubscribed) setLoading(false);
      };

      socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleSignalingMessage(msg);
        } catch (e) {
          console.error("Error handling WebRTC signaling message:", e);
        }
      };

      socket.onerror = (err) => {
        console.error("[MEETING] WebSocket error:", err);
        console.error("[WebRTC] WebSocket error:", err);
        if (isSubscribed) {
          setError("Network error connecting to meeting signaling server.");
          setLoading(false);
        }
      };

      socket.onclose = () => {
        console.log("[MEETING] WebSocket closed");
        console.log("[WebRTC] WebSocket signaling disconnected.");
      };
    };

    initMeeting();

    return () => {
      console.log("[MEETING] Cleanup called");
      console.log("[MEETING] StudyMeetingRoom unmounted");
      isSubscribed = false;
      cleanupResources();
    };
  }, [groupId, token]);

  // Ensure local video element displays local stream when stream or loading state updates
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("[LOCAL VIDEO] Video element found:", true);
      console.log("[LOCAL VIDEO] getUserMedia stream:", localStream.id);
      console.log("[LOCAL VIDEO] Video tracks:", localStream.getVideoTracks());
      console.log("[LOCAL VIDEO] Audio tracks:", localStream.getAudioTracks());

      localVideoRef.current.srcObject = localStream;
      console.log("[LOCAL VIDEO] srcObject assigned:", localVideoRef.current.srcObject);

      localVideoRef.current.play().then(() => {
        console.log("[LOCAL VIDEO] play() called successfully");
        if (localVideoRef.current) {
          console.log("[LOCAL VIDEO] videoWidth:", localVideoRef.current.videoWidth);
          console.log("[LOCAL VIDEO] videoHeight:", localVideoRef.current.videoHeight);
          console.log("[LOCAL VIDEO] readyState:", localVideoRef.current.readyState);
        }
      }).catch(e => console.warn("[LOCAL VIDEO] play error:", e));
    }
  }, [localStream, loading]);

  // 2. Handle Incoming WebSockets WebRTC Signaling Messages
  const handleSignalingMessage = async (msg) => {
    const { type, sender_id, sender_name, sdp, candidate, existing_participants, audio_enabled, video_enabled } = msg;

    switch (type) {
      case 'room_state':
        console.log("[WebRTC] Joined meeting. Existing participants:", existing_participants);
        if (existing_participants && existing_participants.length > 0) {
          for (const p of existing_participants) {
            createPeerConnection(p.user_id, p.user_name, true);
          }
        }
        break;

      case 'participant_joined':
        console.log(`[WebRTC] Participant joined: ${sender_name} (${sender_id})`);
        setPeers(prev => ({
          ...prev,
          [sender_id]: {
            user_id: sender_id,
            user_name: sender_name,
            stream: null,
            audioEnabled: true,
            videoEnabled: true
          }
        }));
        break;

      case 'offer':
        console.log(`[WebRTC] Received offer from ${sender_id}`);
        await handleReceiveOffer(sender_id, sender_name, sdp);
        break;

      case 'answer':
        console.log(`[WebRTC] Received answer from ${sender_id}`);
        await handleReceiveAnswer(sender_id, sdp);
        break;

      case 'ice_candidate':
        console.log(`[WebRTC] Received ICE candidate from ${sender_id}`);
        await handleReceiveIceCandidate(sender_id, candidate);
        break;

      case 'toggle_media':
        setPeers(prev => {
          if (!prev[sender_id]) return prev;
          return {
            ...prev,
            [sender_id]: {
              ...prev[sender_id],
              audioEnabled: audio_enabled !== undefined ? audio_enabled : prev[sender_id].audioEnabled,
              videoEnabled: video_enabled !== undefined ? video_enabled : prev[sender_id].videoEnabled
            }
          };
        });
        break;

      case 'participant_left':
        {
          const targetUserId = sender_id || msg.user_id;
          console.log(`[MEETING DEBUG] participant_left received: user_id=${msg.user_id}, sender_id=${sender_id}`);
          console.log("[MEETING DEBUG] peers BEFORE removal:", peers);
          console.log("[MEETING DEBUG] closePeerConnection called:", targetUserId);
          closePeerConnection(targetUserId);
        }
        break;

      default:
        break;
    }
  };

  // 3. Create WebRTC Peer Connection (`RTCPeerConnection`)
  const createPeerConnection = (targetUserId, targetUserName, isInitiator) => {
    if (peerConnections.current[targetUserId]) return peerConnections.current[targetUserId];

    console.log(`[WebRTC] Creating peer connection for ${targetUserName} (${targetUserId}), isInitiator=${isInitiator}`);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[targetUserId] = pc;

    // Monitor connection states
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state (${targetUserId}): ${pc.connectionState}`);
    };
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state (${targetUserId}): ${pc.iceConnectionState}`);
    };

    // Attach local tracks if available
    if (localStreamRef.current) {
      console.log(`[WebRTC] Added local tracks to PC for ${targetUserId}`);
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log(`[WebRTC] Sending ICE candidate to ${targetUserId}`);
        socketRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          target_id: targetUserId,
          candidate: event.candidate
        }));
      }
    };

    // Remote Track handler (with fallback MediaStream creation)
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received from ${targetUserId}`);
      const remoteStream = (event.streams && event.streams[0])
        ? event.streams[0]
        : new MediaStream([event.track]);

      setPeers(prev => ({
        ...prev,
        [targetUserId]: {
          user_id: targetUserId,
          user_name: targetUserName,
          stream: remoteStream,
          audioEnabled: true,
          videoEnabled: true
        }
      }));
    };

    // If initiator, generate SDP Offer
    if (isInitiator) {
      console.log(`[WebRTC] Creating offer for ${targetUserId}`);
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log(`[WebRTC] Sending offer to ${targetUserId}`);
            socketRef.current.send(JSON.stringify({
              type: 'offer',
              target_id: targetUserId,
              sdp: pc.localDescription.sdp
            }));
          }
        })
        .catch(e => console.error("Error creating SDP offer:", e));
    }

    return pc;
  };

  // Handle incoming SDP Offer
  const handleReceiveOffer = async (senderId, senderName, sdp) => {
    const pc = createPeerConnection(senderId, senderName, false);
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    console.log(`[WebRTC] Creating answer for ${senderId}`);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log(`[WebRTC] Sending answer to ${senderId}`);
      socketRef.current.send(JSON.stringify({
        type: 'answer',
        target_id: senderId,
        sdp: pc.localDescription.sdp
      }));
    }
  };

  // Handle incoming SDP Answer
  const handleReceiveAnswer = async (senderId, sdp) => {
    const pc = peerConnections.current[senderId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    }
  };

  // Handle incoming ICE Candidate
  const handleReceiveIceCandidate = async (senderId, candidate) => {
    const pc = peerConnections.current[senderId];
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ICE candidate:", e);
      }
    }
  };

  // Close peer connection for a participant and clean up remote video stream
  const closePeerConnection = (userId) => {
    console.log(`[WebRTC] Closing peer connection and removing participant: ${userId}`);
    if (peerConnections.current[userId]) {
      const pc = peerConnections.current[userId];
      console.log(`[MEETING DEBUG] peer connection state (${userId}):`, pc.connectionState);
      try {
        pc.getSenders().forEach(s => {
          try { pc.removeTrack(s); } catch (e) {}
        });
      } catch (e) {}
      try {
        pc.close();
      } catch (e) {}
      delete peerConnections.current[userId];
    }
    setPeers(prev => {
      console.log(`[MEETING DEBUG] REMOVE PEER: ${userId}`);
      const copy = { ...prev };
      if (copy[userId]) {
        if (copy[userId].stream) {
          console.log(`[MEETING DEBUG] remote stream tracks for ${userId}:`, copy[userId].stream.getTracks());
          try {
            copy[userId].stream.getTracks().forEach(track => track.stop());
          } catch (e) {}
        }
        delete copy[userId];
      }
      console.log("[MEETING DEBUG] peers AFTER removal:", copy);
      return copy;
    });
  };

  // 4. Toggle Microphone (Audio) with On-Demand Stream Capture
  const toggleMicrophone = async () => {
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      const newStatus = audioTrack.enabled;
      setMicEnabled(newStatus);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'toggle_media',
          audio_enabled: newStatus,
          video_enabled: cameraEnabled
        }));
      }
    } else {
      // Audio track missing -> Dynamically request microphone permission
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = audioStream.getAudioTracks()[0];
        if (newTrack) {
          if (!localStreamRef.current) {
            localStreamRef.current = new MediaStream([newTrack]);
          } else {
            localStreamRef.current.addTrack(newTrack);
          }
          setLocalStream(localStreamRef.current);
          setMicEnabled(true);

          // Add track to existing peer connections
          Object.values(peerConnections.current).forEach(pc => {
            pc.addTrack(newTrack, localStreamRef.current);
          });

          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'toggle_media',
              audio_enabled: true,
              video_enabled: cameraEnabled
            }));
          }
        }
      } catch (err) {
        alert("Microphone permission was denied or microphone hardware is unavailable.");
      }
    }
  };

  // 5. Toggle Camera (Video) with On-Demand Stream Capture
  const toggleCamera = async () => {
    if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      const newStatus = videoTrack.enabled;
      setCameraEnabled(newStatus);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'toggle_media',
          audio_enabled: micEnabled,
          video_enabled: newStatus
        }));
      }
    } else {
      // Video track missing -> Dynamically request camera permission
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = videoStream.getVideoTracks()[0];
        if (newTrack) {
          if (!localStreamRef.current) {
            localStreamRef.current = new MediaStream([newTrack]);
          } else {
            localStreamRef.current.addTrack(newTrack);
          }
          setLocalStream(localStreamRef.current);
          setCameraEnabled(true);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }

          // Add track to existing peer connections
          Object.values(peerConnections.current).forEach(pc => {
            pc.addTrack(newTrack, localStreamRef.current);
          });

          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'toggle_media',
              audio_enabled: micEnabled,
              video_enabled: true
            }));
          }
        }
      } catch (err) {
        alert("Camera permission was denied or camera hardware is unavailable.");
      }
    }
  };

  // 6. Dedicated Internal Cleanup & Explicit User Leave Meeting
  const cleanupResources = () => {
    console.log("[MEETING] cleanupResources called");
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'leave' }));
        } catch (e) {}
      }
      try {
        socketRef.current.close();
      } catch (e) {}
      socketRef.current = null;
    }

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }

    if (peerConnections.current) {
      Object.keys(peerConnections.current).forEach(uid => {
        try {
          peerConnections.current[uid].close();
        } catch (e) {}
      });
      peerConnections.current = {};
    }

    setPeers({});
    setLocalStream(null);
  };

  const leaveMeeting = () => {
    console.log("[MEETING] Explicit user leaveMeeting invoked");
    cleanupResources();
    if (onClose) onClose();
  };

  const participantCount = Object.keys(peers).length + 1;

  return (
    <div className="bg-white border border-[#E8DDEB] rounded-2xl p-6 shadow-xl space-y-6 flex flex-col min-h-[580px]">

      {/* Top Meeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DDEB]">
        <div>
          <div className="flex items-center space-x-2 text-[#2E003E] text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Virtual Study Meeting</span>
          </div>
          <h3 className="text-xl font-bold text-[#2E003E] leading-tight">{groupName} Meeting Room</h3>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3 py-1.5 bg-[#F8F3F9] text-[#2E003E] border border-[#E8DDEB] rounded-xl text-xs font-mono font-semibold flex items-center space-x-1.5 shadow-sm">
            <Users className="w-4 h-4 text-[#2E003E]" />
            <span>{participantCount} {participantCount === 1 ? 'Participant' : 'Participants'} Active</span>
          </span>

          <button
            onClick={leaveMeeting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Meeting</span>
          </button>
        </div>
      </div>

      {/* Error / Warning Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {mediaWarning && !error && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs rounded-xl flex items-center space-x-2">
          <Volume2 className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{mediaWarning}</span>
        </div>
      )}

      {/* Meeting Video Grid Container */}
      <div className="flex-1 min-h-[360px] bg-slate-950 border border-slate-900 rounded-2xl p-4 overflow-y-auto">
        {loading ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#FFB7C5]" />
            <p className="text-xs font-medium">Connecting to virtual meeting signaling room...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">

            {/* LOCAL VIDEO TILE */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center shadow-lg group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted // Mute local stream output to prevent audio feedback echo
                className={`w-full h-full object-cover rounded-xl ${(!cameraEnabled || !localStream) ? 'hidden' : ''}`}
              />

              {(!cameraEnabled || !localStream) && (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <div className="w-14 h-14 rounded-full bg-[#2E003E] border border-[#FFB7C5]/30 font-bold text-lg text-white flex items-center justify-center">
                    {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Camera Off</span>
                </div>
              )}

              {/* Local Participant Badge */}
              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800/80 text-xs font-semibold text-white flex items-center space-x-2">
                <span>{currentUser?.name || 'You'} (You)</span>
                {!micEnabled && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
              </div>
            </div>

            {/* REMOTE VIDEO TILES */}
            {Object.values(peers).map((peer) => (
              <RemoteVideoTile key={peer.user_id} peer={peer} />
            ))}

          </div>
        )}
      </div>

      {/* Floating Control Bar */}
      <div className="flex justify-center items-center space-x-4 pt-2">
        {/* Toggle Microphone Button */}
        <button
          onClick={toggleMicrophone}
          disabled={loading || !!error}
          className={`p-3.5 rounded-2xl shadow-md border font-semibold transition flex items-center space-x-2 text-xs ${
            micEnabled
              ? 'bg-[#2E003E] hover:opacity-90 border-[#FFB7C5]/30 text-white'
              : 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white'
          }`}
          title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          <span>{micEnabled ? 'Mute Mic' : 'Unmuted'}</span>
        </button>

        {/* Toggle Camera Button */}
        <button
          onClick={toggleCamera}
          disabled={loading || !!error}
          className={`p-3.5 rounded-2xl shadow-md border font-semibold transition flex items-center space-x-2 text-xs ${
            cameraEnabled
              ? 'bg-[#2E003E] hover:opacity-90 border-[#FFB7C5]/30 text-white'
              : 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white'
          }`}
          title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          <span>{cameraEnabled ? 'Stop Video' : 'Camera Off'}</span>
        </button>

        {/* Leave Button */}
        <button
          onClick={leaveMeeting}
          className="p-3.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-2xl shadow-md border border-rose-500 transition flex items-center space-x-2 text-xs"
          title="End or Leave Meeting"
        >
          <PhoneOff className="w-5 h-5" />
          <span>Leave</span>
        </button>
      </div>

    </div>
  );
}

// Remote Peer Video Tile Sub-Component
function RemoteVideoTile({ peer }) {
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && peer.stream) {
      videoEl.srcObject = peer.stream;
      videoEl.play().catch(e => console.warn("Video play error:", e));
    }

    return () => {
      console.log(`[MEETING DEBUG] RemoteVideoTile unmounting: ${peer.user_id}`);
      if (videoEl) {
        console.log(`[MEETING DEBUG] Video props before removal - paused: ${videoEl.paused}, readyState: ${videoEl.readyState}, width: ${videoEl.videoWidth}, height: ${videoEl.videoHeight}`);
        try {
          videoEl.pause();
          videoEl.srcObject = null;
        } catch (e) {}
        console.log(`[MEETING DEBUG] video.srcObject after reset:`, videoEl.srcObject);
      }
    };
  }, [peer.stream, peer.user_id]);

  return (
    <div
      data-peer-id={peer.user_id}
      className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center shadow-lg"
    >
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        data-peer-id={peer.user_id}
        data-video-role="remote"
        className={`w-full h-full object-cover rounded-xl ${(!peer.videoEnabled || !peer.stream) ? 'hidden' : ''}`}
      />

      {(!peer.videoEnabled || !peer.stream) && (
        <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
          <div className="w-14 h-14 rounded-full bg-indigo-900/40 border border-indigo-500/40 font-bold text-lg text-indigo-300 flex items-center justify-center">
            {peer.user_name ? peer.user_name[0].toUpperCase() : 'P'}
          </div>
          <span className="text-xs font-semibold text-slate-400">Camera Off</span>
        </div>
      )}

      {/* Peer Participant Badge */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800/80 text-xs font-semibold text-white flex items-center space-x-2">
        <span>{peer.user_name}</span>
        {!peer.audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
      </div>
    </div>
  );
}
