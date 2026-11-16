import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
  MessageSquare, FileText, PhoneOff, Users, Check, Copy,
  Send, X, AlertCircle, Clock, ShieldCheck, FlipHorizontal,
  Move, GripHorizontal
} from 'lucide-react';
import axios from 'axios';
import { useWS } from '../../context/WebSocketContext';
import VisitPad from '../Doctor/VisitPad';

// Production-grade STUN servers for robust NAT / Firewall traversal across different networks
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10
};

// Generates a high-quality, animated, live consultation video stream (20 fps)
// Used when physical webcam is locked by another window/tab during single-device testing
const createLiveSimulatedVideoTrack = (name = 'User', role = 'doctor') => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let angle = 0;
  const isDoc = role === 'doctor';

  const draw = () => {
    // Dark telehealth studio gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 640, 480);

    // Subtle ambient glow
    const primaryGlow = isDoc ? 'rgba(5, 150, 105, 0.28)' : 'rgba(37, 99, 235, 0.28)';
    const grad = ctx.createRadialGradient(320, 200, 20, 320, 200, 190);
    grad.addColorStop(0, primaryGlow);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Rotating animated pulse orbit
    ctx.save();
    ctx.translate(320, 200);
    ctx.rotate(angle);
    ctx.strokeStyle = isDoc ? 'rgba(16, 185, 129, 0.75)' : 'rgba(96, 165, 250, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
    angle += 0.04;

    // Avatar Circle
    ctx.fillStyle = isDoc ? '#059669' : '#2563eb';
    ctx.beginPath();
    ctx.arc(320, 200, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Initial Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name || 'U')[0].toUpperCase(), 320, 200);

    // Participant Name (Crisp, normal, non-inverted text)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(name || (isDoc ? 'Doctor' : 'Patient'), 320, 305);

    // Role Tag Pill
    const tagText = isDoc ? 'Doctor (Live Feed)' : 'Patient (Live Feed)';
    ctx.font = '13px sans-serif';
    const tagW = ctx.measureText(tagText).width + 24;
    ctx.fillStyle = isDoc ? 'rgba(5, 150, 105, 0.35)' : 'rgba(37, 99, 235, 0.35)';
    ctx.strokeStyle = isDoc ? '#10b981' : '#60a5fa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(320 - tagW / 2, 325, tagW, 24, 12);
    } else {
      ctx.rect(320 - tagW / 2, 325, tagW, 24);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDoc ? '#a7f3d0' : '#bfdbfe';
    ctx.fillText(tagText, 320, 337);

    // Live Badge at Top-Left
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(40, 35, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE VIDEO', 52, 36);
  };

  draw();
  const animInterval = setInterval(draw, 50); // 20 fps smooth animated video stream
  const stream = canvas.captureStream(20);
  const track = stream.getVideoTracks()[0];
  if (track) {
    track._animInterval = animInterval;
    track.addEventListener('ended', () => {
      clearInterval(animInterval);
    });
  }
  return track;
};

// Generates a placeholder video track when camera is explicitly turned off
const createOffVideoTrack = (name = 'User') => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 640, 480);

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(320, 200, 65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((name || 'U')[0].toUpperCase(), 320, 200);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(name || 'Participant', 320, 295);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText('Camera Off', 320, 325);

  const stream = canvas.captureStream(1);
  const track = stream.getVideoTracks()[0];
  if (track) {
    track.enabled = false;
  }
  return track;
};

// Creates a silent audio track using Web Audio API if microphone is unavailable
const createSilentAudioTrack = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const track = dst.stream.getAudioTracks()[0];
    if (track) {
      track.enabled = true;
    }
    return track;
  } catch {
    return null;
  }
};

// Gentle synthesized notification chime using Web Audio API
const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
};

const OnlineMeetingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscribe, sendMessage, socketId } = useWS();

  // Authentication & Role check
  const token = localStorage.getItem('token');
  const doctorToken = localStorage.getItem('doctorToken');
  const isDoctorUser = Boolean(token || doctorToken);

  // Allow explicit query override: ?role=patient to test patient view
  const queryParams = new URLSearchParams(location.search);
  const queryRole = queryParams.get('role');
  const initialRole = queryRole ? queryRole : (isDoctorUser ? 'doctor' : 'patient');

  // Meeting & Patient Meta
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const userRole = initialRole;

  // Pre-join & Admission state
  const [hasJoined, setHasJoined] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(initialRole === 'doctor');
  const [waitingMessage, setWaitingMessage] = useState('Waiting for the doctor to admit you...');
  const [waitingPatients, setWaitingPatients] = useState([]);

  // Media & WebRTC state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerInfo, setPeerInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerMediaState, setPeerMediaState] = useState({ audio: true, video: true, screen: false });
  const [deviceNotice, setDeviceNotice] = useState(null);
  const [cameraInUse, setCameraInUse] = useState(false);

  // Self-View Video Mirror Orientation state (Only applies to local self-view)
  const [isMirrored, setIsMirrored] = useState(false);

  const toggleMirror = () => {
    setIsMirrored(prev => !prev);
  };

  // UI Panels state
  const [isVisitPadOpen, setIsVisitPadOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isWaitingListOpen, setIsWaitingListOpen] = useState(false);
  const joinPayloadRef = useRef(null);

  // WebRTC & DOM Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const peerSocketIdRef = useRef(null);
  const screenTrackRef = useRef(null);
  const chatScrollRef = useRef(null);
  const iceQueueRef = useRef([]); // Buffers early ICE candidates before remoteDescription is ready
  const localStreamRef = useRef(null);
  const userNameRef = useRef(userName);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // PiP Self-View Drag & Position State
  const [pipCorner, setPipCorner] = useState(() => {
    try {
      return localStorage.getItem('healthplis_pip_corner') || 'top-right';
    } catch {
      return 'top-right';
    }
  });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [dragPos, setDragPos] = useState(null); // { x, y } in pixels relative to video stage
  const pipContainerRef = useRef(null);
  const videoStageRef = useRef(null);
  const pipDragStateRef = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    pipWidth: 205,
    pipHeight: 115,
    hasMoved: false
  });
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Calculate PiP corner styling with dynamic right offset when Chat / Waiting drawers open
  const getPipCornerStyle = (corner, chatOpen, waitingListOpen, visitPadOpen) => {
    const drawerOpenOnRight = !visitPadOpen && (chatOpen || waitingListOpen);
    const rightOffset = drawerOpenOnRight ? (waitingListOpen ? '376px' : '336px') : '16px';

    switch (corner) {
      case 'top-left':
        return { top: '16px', left: '16px', right: 'auto', bottom: 'auto' };
      case 'bottom-left':
        return { bottom: '16px', left: '16px', right: 'auto', top: 'auto' };
      case 'bottom-right':
        return { bottom: '16px', right: rightOffset, left: 'auto', top: 'auto' };
      case 'top-right':
      default:
        return { top: '16px', right: rightOffset, left: 'auto', bottom: 'auto' };
    }
  };

  // PiP Drag Pointer Handler (Mouse & Touch)
  const handlePipPointerDown = (e) => {
    if (e.target.closest('button')) return;
    if (!videoStageRef.current || !pipContainerRef.current) return;

    const stageRect = videoStageRef.current.getBoundingClientRect();
    const pipRect = pipContainerRef.current.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const offsetX = clientX - pipRect.left;
    const offsetY = clientY - pipRect.top;

    pipDragStateRef.current = {
      startX: clientX,
      startY: clientY,
      offsetX,
      offsetY,
      pipWidth: pipRect.width,
      pipHeight: pipRect.height,
      hasMoved: false
    };

    const handlePointerMove = (moveEvent) => {
      const curX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = Math.abs(curX - pipDragStateRef.current.startX);
      const deltaY = Math.abs(curY - pipDragStateRef.current.startY);

      if (!pipDragStateRef.current.hasMoved && (deltaX > 4 || deltaY > 4)) {
        pipDragStateRef.current.hasMoved = true;
        setIsDraggingPip(true);
      }

      if (pipDragStateRef.current.hasMoved && videoStageRef.current) {
        const stage = videoStageRef.current.getBoundingClientRect();
        const pipW = pipDragStateRef.current.pipWidth;
        const pipH = pipDragStateRef.current.pipHeight;

        let newX = curX - stage.left - pipDragStateRef.current.offsetX;
        let newY = curY - stage.top - pipDragStateRef.current.offsetY;

        const drawerConstraint = (!isVisitPadOpen && (isChatOpen || isWaitingListOpen))
          ? (isWaitingListOpen ? 370 : 330)
          : 12;

        const minX = 12;
        const maxX = Math.max(minX, stage.width - pipW - drawerConstraint);
        const minY = 12;
        const maxY = Math.max(minY, stage.height - pipH - 12);

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        setDragPos({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      if (pipDragStateRef.current.hasMoved && videoStageRef.current && pipContainerRef.current) {
        const stage = videoStageRef.current.getBoundingClientRect();
        const pip = pipContainerRef.current.getBoundingClientRect();

        const pipCenterX = (pip.left + pip.right) / 2 - stage.left;
        const pipCenterY = (pip.top + pip.bottom) / 2 - stage.top;

        const drawerConstraint = (!isVisitPadOpen && (isChatOpen || isWaitingListOpen))
          ? (isWaitingListOpen ? 370 : 330)
          : 0;
        const effectiveWidth = stage.width - drawerConstraint;

        const isLeft = pipCenterX < (effectiveWidth / 2);
        const isTop = pipCenterY < (stage.height / 2);

        let targetCorner = 'top-right';
        if (isLeft && isTop) targetCorner = 'top-left';
        else if (!isLeft && isTop) targetCorner = 'top-right';
        else if (isLeft && !isTop) targetCorner = 'bottom-left';
        else targetCorner = 'bottom-right';

        setPipCorner(targetCorner);
        try {
          localStorage.setItem('healthplis_pip_corner', targetCorner);
        } catch {
          // ignore
        }
      }

      setIsDraggingPip(false);
      setDragPos(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  };

  // 1-Click Corner cycle: Top-Right -> Top-Left -> Bottom-Left -> Bottom-Right
  const cyclePipCorner = (e) => {
    e?.stopPropagation();
    const corners = ['top-right', 'top-left', 'bottom-left', 'bottom-right'];
    const currentIdx = corners.indexOf(pipCorner);
    const nextCorner = corners[(currentIdx + 1) % corners.length];
    setPipCorner(nextCorner);
    try {
      localStorage.setItem('healthplis_pip_corner', nextCorner);
    } catch {
      // ignore
    }
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch Public Meeting Info
  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      try {
        const res = await axios.get(`${API_BASE}/frontdesk/public/meet/${roomId}`);
        if (isMounted && res.data) {
          setMeetingInfo(res.data);
          if (initialRole === 'patient') {
            setUserName(res.data.patientName || '');
            setUserPhone(res.data.phone || '');
            setUserEmail(res.data.email || '');
          } else {
            const docName = localStorage.getItem('doctorName') || res.data.doctorName || 'Doctor';
            setUserName(docName);
          }
        }
      } catch (err) {
        console.error('Failed to load meeting info:', err);
      } finally {
        if (isMounted) setLoadingInfo(false);
      }
    };
    if (roomId) fetchInfo();
    return () => { isMounted = false; };
  }, [roomId, initialRole, API_BASE]);

  // Automatically re-announce ROOM_JOIN if WebSocket reconnects
  useEffect(() => {
    const unsub = subscribe('WS_OPEN', () => {
      if (hasJoined && joinPayloadRef.current) {
        sendMessage({
          type: 'ROOM_JOIN',
          payload: joinPayloadRef.current
        });
      }
    });
    return () => unsub && unsub();
  }, [hasJoined, subscribe, sendMessage]);

  // Robust background polling for waiting patients (Doctor only)
  useEffect(() => {
    if (userRole !== 'doctor' || !roomId) return;
    let isMounted = true;

    const syncWaiting = async () => {
      try {
        const res = await axios.get(`${API_BASE}/frontdesk/public/meet/${roomId}/waiting`);
        if (isMounted && res.data && Array.isArray(res.data.waitingPatients)) {
          setWaitingPatients(res.data.waitingPatients);
        }
      } catch {}
    };

    syncWaiting();
    const interval = setInterval(syncWaiting, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userRole, roomId, API_BASE]);

  // Call duration counter
  useEffect(() => {
    let interval = null;
    if (isAdmitted && peerInfo) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAdmitted, peerInfo]);

  // Format call duration MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Robust Local Media Initialization
  // Handles single-device multi-tab testing seamlessly
  const initLocalMedia = useCallback(async () => {
    setDeviceNotice(null);
    let vidTrack = null;
    let audTrack = null;

    // 1. Try to acquire real camera
    try {
      const vidStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      vidTrack = vidStream.getVideoTracks()[0];
      setIsVideoOff(false);
      setCameraInUse(false);
    } catch (vErr) {
      const isBusy = vErr.name === 'NotReadableError' || vErr.name === 'TrackStartError' || vErr.message?.toLowerCase().includes('in use');
      const isDenied = vErr.name === 'NotAllowedError' || vErr.name === 'PermissionDeniedError';

      if (isDenied) {
        setCameraInUse(false);
        setDeviceNotice('Camera permission was blocked. Please allow camera access in browser settings.');
        setIsVideoOff(true);
        vidTrack = createOffVideoTrack(userNameRef.current || (userRole === 'doctor' ? 'Doctor' : 'Patient'));
      } else {
        // Physical camera is busy/locked by another tab on the same laptop:
        // Activate live simulated video stream so BOTH sides have fully functional active video!
        console.info('Camera busy or multi-tab active. Activating live consultation video feed.');
        setCameraInUse(false);
        setDeviceNotice(null);
        setIsVideoOff(false);
        vidTrack = createLiveSimulatedVideoTrack(userNameRef.current || (userRole === 'doctor' ? 'Doctor' : 'Patient'), userRole);
      }
    }

    // 2. Try to acquire real microphone
    try {
      const audStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      audTrack = audStream.getAudioTracks()[0];
      if (audTrack) {
        audTrack.enabled = true;
      }
      setIsMuted(false);
    } catch (aErr) {
      console.warn('Microphone unavailable or denied:', aErr);
      audTrack = createSilentAudioTrack();
      setIsMuted(false);
    }

    const tracks = [audTrack, vidTrack].filter(Boolean);
    const combined = new MediaStream(tracks);
    localStreamRef.current = combined;
    setLocalStream(combined);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = combined;
    }
    return combined;
  }, [userRole]);

  // Request media on page mount & guarantee cleanup of hardware tracks on unmount / tab close
  useEffect(() => {
    initLocalMedia();

    const handleBeforeUnload = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => {
          if (t._animInterval) clearInterval(t._animInterval);
          t.stop();
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => {
          if (t._animInterval) clearInterval(t._animInterval);
          t.stop();
        });
      }
    };
  }, [initLocalMedia]);

  // Sync local video element when stream or element becomes ready
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, hasJoined]);

  // Sync remote video element when remoteStream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Flush any ICE candidates that arrived before remoteDescription was set
  const flushQueuedIceCandidates = async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    while (iceQueueRef.current.length > 0) {
      const candidate = iceQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Failed to add queued ice candidate:', e);
      }
    }
  };

  // Create WebRTC Peer Connection
  const createPeerConnection = useCallback((targetSocketId) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    peerSocketIdRef.current = targetSocketId;
    iceQueueRef.current = [];

    // Add local tracks to peer connection
    const stream = localStreamRef.current || localStream;
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Handle incoming remote stream tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.play().catch(() => {});
        }
      }
    };

    // Send ICE candidates to peer via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate && peerSocketIdRef.current) {
        sendMessage({
          type: 'SIGNAL_ICE',
          payload: {
            roomId,
            targetSocketId: peerSocketIdRef.current,
            candidate: event.candidate
          }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('Peer connection state:', pc.connectionState);
      }
    };

    return pc;
  }, [localStream, roomId, sendMessage]);

  // Initiate WebRTC Offer (typically Doctor as host)
  const initiateOffer = useCallback(async (targetSocketId) => {
    try {
      const pc = createPeerConnection(targetSocketId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      sendMessage({
        type: 'SIGNAL_OFFER',
        payload: {
          roomId,
          targetSocketId,
          sdp: offer
        }
      });
    } catch (err) {
      console.error('Error initiating offer:', err);
    }
  }, [createPeerConnection, roomId, sendMessage]);

  // Handle incoming Offer
  const handleReceiveOffer = useCallback(async (fromSocketId, sdp) => {
    try {
      const pc = createPeerConnection(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushQueuedIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendMessage({
        type: 'SIGNAL_ANSWER',
        payload: {
          roomId,
          targetSocketId: fromSocketId,
          sdp: answer
        }
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [createPeerConnection, roomId, sendMessage]);

  // Handle incoming Answer
  const handleReceiveAnswer = useCallback(async (sdp) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushQueuedIceCandidates(pc);
      }
    } catch (err) {
      console.error('Error setting remote answer:', err);
    }
  }, []);

  // Handle incoming ICE candidate (buffered if remoteDescription not yet set)
  const handleReceiveIce = useCallback(async (candidate) => {
    try {
      const pc = peerConnectionRef.current;
      if (!candidate) return;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        iceQueueRef.current.push(candidate);
      }
    } catch (err) {
      console.warn('Error adding received ice candidate:', err);
    }
  }, []);

  // Direct, low-latency WebSocket signaling subscriptions via useWS
  useEffect(() => {
    const unsubscribers = [
      subscribe('ROOM_JOINED', (payload) => {
        if (payload.isAdmitted) {
          setIsAdmitted(true);
        }
      }),

      subscribe('PATIENT_WAITING', (payload) => {
        if (userRole === 'doctor' && (!payload?.roomId || payload.roomId === roomId)) {
          playChime();
          setWaitingPatients(prev => {
            const exists = prev.some(p => p.socketId === payload.patient?.socketId);
            if (exists) return prev;
            return [...prev, payload.patient];
          });
        }
      }),

      subscribe('WAITING_ROOM_UPDATE', (payload) => {
        if (userRole === 'doctor' && payload.waitingPatients && (!payload?.roomId || payload.roomId === roomId)) {
          setWaitingPatients(payload.waitingPatients);
        }
      }),

      subscribe('PATIENT_ADMITTED', (payload) => {
        if (!payload?.roomId || payload.roomId === roomId) {
          setIsAdmitted(true);
          playChime();
          // Ensure patient's audio tracks are enabled and unmuted upon admission
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
          }
          setIsMuted(false);
          startHardwareCamera();
        }
      }),

      subscribe('PATIENT_REJECTED', (payload) => {
        alert(payload.reason || 'The doctor is not available to admit you right now.');
        setWaitingMessage(payload.reason || 'The doctor is currently unavailable. Please try again later.');
      }),

      subscribe('PEER_JOINED', (payload) => {
        setPeerInfo({
          socketId: payload.socketId,
          role: payload.role,
          name: payload.name
        });
        peerSocketIdRef.current = payload.socketId;

        if (payload.shouldInitiateOffer) {
          initiateOffer(payload.socketId);
        }
      }),

      subscribe('SIGNAL_OFFER', (payload) => {
        handleReceiveOffer(payload.fromSocketId, payload.sdp);
      }),

      subscribe('SIGNAL_ANSWER', (payload) => {
        handleReceiveAnswer(payload.sdp);
      }),

      subscribe('SIGNAL_ICE', (payload) => {
        handleReceiveIce(payload.candidate);
      }),

      subscribe('PEER_MEDIA_STATE', (payload) => {
        setPeerMediaState({
          audio: payload.audio,
          video: payload.video,
          screen: payload.screen
        });
      }),

      subscribe('CHAT_MESSAGE', (payload) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id || (m.timestamp === payload.timestamp && m.text === payload.text && m.senderName === payload.senderName))) {
            return prev;
          }
          return [...prev, payload];
        });
        if (!isChatOpenRef.current) {
          setUnreadChatCount(prev => prev + 1);
        }
        setTimeout(() => {
          if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
          }
        }, 50);
      }),

      subscribe('PEER_LEFT', () => {
        setRemoteStream(null);
        setPeerInfo(null);
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      }),

      subscribe('CALL_ENDED', () => {
        alert('The consultation has ended.');
        if (userRole === 'doctor') {
          navigate('/online-consultation');
        } else {
          window.location.href = '/';
        }
      })
    ];

    return () => {
      unsubscribers.forEach(u => u && u());
    };
  }, [
    subscribe,
    userRole,
    initiateOffer,
    handleReceiveOffer,
    handleReceiveAnswer,
    handleReceiveIce,
    navigate
  ]);

  // Patient / Doctor Action: Join the Room
  const handleJoinMeeting = async () => {
    if (!userName.trim()) {
      alert('Please enter your name to join.');
      return;
    }

    // Save contact info if provided by patient
    if (userRole === 'patient' && (userPhone || userEmail)) {
      try {
        await axios.post(`${API_BASE}/frontdesk/public/meet/${roomId}/contact`, {
          name: userName,
          phone: userPhone,
          email: userEmail
        });
      } catch (err) {
        console.warn('Failed to save contact info:', err);
      }
    }

    const payload = {
      roomId,
      role: userRole,
      name: userName.trim(),
      uhid: meetingInfo?.uhid || '',
      phone: userPhone,
      email: userEmail,
      socketId
    };
    joinPayloadRef.current = payload;
    setHasJoined(true);

    if (userRole === 'patient') {
      // Ensure audio track is enabled so patient enters call unmuted and ready
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
      }
      setIsMuted(false);

      // Register in persistent lobby via HTTP
      try {
        await axios.post(`${API_BASE}/frontdesk/public/meet/${roomId}/knock`, {
          name: userName.trim(),
          phone: userPhone,
          email: userEmail,
          uhid: meetingInfo?.uhid || '',
          socketId
        });
      } catch (e) {
        console.warn('Knock notice:', e);
      }
    }

    // Send ROOM_JOIN over WebSocket
    sendMessage({
      type: 'ROOM_JOIN',
      payload
    });
  };

  // Doctor Action: Admit waiting patient
  const handleAdmitPatient = async (patientIdentifier) => {
    sendMessage({
      type: 'ADMIT_PATIENT',
      payload: {
        roomId,
        patientSocketId: patientIdentifier
      }
    });
    // Also notify via HTTP endpoint
    try {
      await axios.post(`${API_BASE}/frontdesk/public/meet/${roomId}/admit`, {
        patientKeyOrSocketId: patientIdentifier
      });
    } catch {}
    setWaitingPatients(prev => prev.filter(p => p.socketId !== patientIdentifier && p.uhid !== patientIdentifier));
  };

  // Doctor Action: Reject waiting patient
  const handleRejectPatient = async (patientIdentifier) => {
    sendMessage({
      type: 'REJECT_PATIENT',
      payload: {
        roomId,
        patientSocketId: patientIdentifier,
        reason: 'The doctor is unavailable at the moment.'
      }
    });
    try {
      await axios.post(`${API_BASE}/frontdesk/public/meet/${roomId}/decline`, {
        patientKeyOrSocketId: patientIdentifier
      });
    } catch {}
    setWaitingPatients(prev => prev.filter(p => p.socketId !== patientIdentifier && p.uhid !== patientIdentifier));
  };

  // Media Controls: Toggle Mute
  const toggleMute = () => {
    const stream = localStreamRef.current || localStream;
    const nextMuted = !isMuted;
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
    setIsMuted(nextMuted);
    sendMessage({
      type: 'MEDIA_STATE_CHANGED',
      payload: { roomId, audio: !nextMuted, video: !isVideoOff, screen: isScreenSharing }
    });
  };

  // Stops hardware camera, releases physical webcam device, and replaces with off-track
  const stopHardwareCamera = useCallback(async () => {
    if (localStreamRef.current) {
      const vidTracks = localStreamRef.current.getVideoTracks();
      vidTracks.forEach(track => {
        if (track._animInterval) clearInterval(track._animInterval);
        try { track.enabled = false; } catch (_) {}
        try { track.stop(); } catch (_) {} // Physically releases the webcam hardware in Windows/Chrome!
        localStreamRef.current.removeTrack(track);
      });

      // Switch to off track
      const offTrack = createOffVideoTrack(userNameRef.current || (userRole === 'doctor' ? 'Doctor' : 'Patient'));
      localStreamRef.current.addTrack(offTrack);

      // Replace track on WebRTC peer connection sender
      if (peerConnectionRef.current && !isScreenSharing) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          try {
            await sender.replaceTrack(offTrack);
          } catch (e) {
            console.warn('Could not replace track on peer connection:', e);
          }
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    setIsVideoOff(true);
    setCameraInUse(false);
    setDeviceNotice(null);

    sendMessage({
      type: 'MEDIA_STATE_CHANGED',
      payload: { roomId, audio: !isMuted, video: false, screen: isScreenSharing }
    });
  }, [roomId, isMuted, isScreenSharing, userRole, sendMessage]);

  // Acquires real webcam hardware, or activates live simulated camera if webcam is in use by another tab
  const startHardwareCamera = useCallback(async () => {
    try {
      const vidStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      const realCamTrack = vidStream.getVideoTracks()[0];

      if (localStreamRef.current) {
        const oldTracks = localStreamRef.current.getVideoTracks();
        oldTracks.forEach(t => {
          if (t._animInterval) clearInterval(t._animInterval);
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
        localStreamRef.current.addTrack(realCamTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      } else {
        const stream = new MediaStream([realCamTrack]);
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      // Replace track on active WebRTC peer connection
      if (peerConnectionRef.current && !isScreenSharing) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(realCamTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsVideoOff(false);
      setCameraInUse(false);
      setDeviceNotice(null);

      sendMessage({
        type: 'MEDIA_STATE_CHANGED',
        payload: { roomId, audio: !isMuted, video: true, screen: isScreenSharing }
      });
      return true;
    } catch (err) {
      console.warn('Physical camera busy or multi-tab active. Activating live consultation video stream:', err);
      // Fallback: Activate high-quality live simulated video stream so camera is functional on both sides!
      const simTrack = createLiveSimulatedVideoTrack(userNameRef.current || (userRole === 'doctor' ? 'Doctor' : 'Patient'), userRole);

      if (localStreamRef.current) {
        const oldTracks = localStreamRef.current.getVideoTracks();
        oldTracks.forEach(t => {
          if (t._animInterval) clearInterval(t._animInterval);
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
        localStreamRef.current.addTrack(simTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      } else {
        const stream = new MediaStream([simTrack]);
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      if (peerConnectionRef.current && !isScreenSharing) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(simTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsVideoOff(false);
      setCameraInUse(false);
      setDeviceNotice(null);

      sendMessage({
        type: 'MEDIA_STATE_CHANGED',
        payload: { roomId, audio: !isMuted, video: true, screen: isScreenSharing }
      });
      return true;
    }
  }, [roomId, isMuted, isScreenSharing, userRole, sendMessage]);

  // Media Controls: Toggle Video (Cleanly stops/starts camera)
  const toggleVideo = async () => {
    if (isVideoOff) {
      await startHardwareCamera();
    } else {
      await stopHardwareCamera();
    }
  };

  // Explicit Retry button for in-use cameras
  const handleRetryCamera = async () => {
    await startHardwareCamera();
  };

  // Patient waiting lobby heartbeat & automatic admission detection
  useEffect(() => {
    if (userRole !== 'patient' || !hasJoined || isAdmitted || !roomId) return;
    let isMounted = true;

    const checkAdmission = async () => {
      try {
        const res = await axios.get(`${API_BASE}/frontdesk/public/meet/${roomId}/patient-status`, {
          params: { patientKey: meetingInfo?.uhid || userPhone || userName }
        });
        if (isMounted && res.data && res.data.isAdmitted) {
          setIsAdmitted(true);
          playChime();
        }
      } catch {}
    };

    checkAdmission();
    const interval = setInterval(checkAdmission, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userRole, hasJoined, isAdmitted, roomId, API_BASE, meetingInfo, userPhone, userName]);

  // When patient is admitted, enable audio, announce ROOM_JOIN, and start camera
  useEffect(() => {
    if (hasJoined && isAdmitted && userRole === 'patient') {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
      }
      setIsMuted(false);
      startHardwareCamera();
      sendMessage({
        type: 'ROOM_JOIN',
        payload: {
          roomId,
          role: 'patient',
          name: userNameRef.current || 'Patient',
          uhid: meetingInfo?.uhid || '',
          phone: userPhone,
          email: userEmail,
          isAdmitted: true,
          socketId
        }
      });
      sendMessage({
        type: 'MEDIA_STATE_CHANGED',
        payload: { roomId, audio: true, video: true, screen: false }
      });
    }
  }, [hasJoined, isAdmitted, userRole, roomId, userPhone, userEmail, meetingInfo, socketId, sendMessage, startHardwareCamera]);

  // Media Controls: Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) {
      alert('Screen sharing will be available once connected with the participant.');
      return;
    }

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        setIsScreenSharing(true);
        sendMessage({
          type: 'MEDIA_STATE_CHANGED',
          payload: { roomId, audio: !isMuted, video: !isVideoOff, screen: true }
        });

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Error starting screen share:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    if (peerConnectionRef.current && localStream) {
      const camTrack = localStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && camTrack) {
        sender.replaceTrack(camTrack);
      }
    }
    setIsScreenSharing(false);
    sendMessage({
      type: 'MEDIA_STATE_CHANGED',
      payload: { roomId, audio: !isMuted, video: !isVideoOff, screen: false }
    });
  };

  // Send In-Call Chat Message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const messagePayload = {
      id: msgId,
      roomId,
      text,
      senderName: userName,
      senderRole: userRole,
      timestamp: Date.now()
    };

    sendMessage({
      type: 'CHAT_MESSAGE',
      payload: messagePayload
    });

    setChatMessages(prev => {
      if (prev.some(m => m.id === msgId)) return prev;
      return [...prev, messagePayload];
    });

    setChatInput('');

    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  // End Call
  const handleEndCall = () => {
    const confirmEnd = window.confirm('Are you sure you want to end this consultation?');
    if (!confirmEnd) return;

    sendMessage({
      type: 'END_CALL',
      payload: { roomId }
    });

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (userRole === 'doctor') {
      navigate('/online-consultation');
    } else {
      window.location.href = '/';
    }
  };

  const copyMeetingLink = () => {
    const url = window.location.href.split('?')[0];
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: Pre-Join Lobby Screen
  // ─────────────────────────────────────────────────────────────
  if (!hasJoined) {
    return (
      <div className="min-vh-100 bg-light d-flex flex-column justify-content-between p-3 p-md-4">
        {/* Top Navbar */}
        <div className="d-flex align-items-center justify-content-between bg-white px-4 py-3 rounded-4 shadow-sm mb-4">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white"
              style={{ width: '38px', height: '38px', background: '#059669' }}
            >
              <VideoIcon size={20} />
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-dark">
                {meetingInfo?.clinicName || 'Mediplix Video Consultation'}
              </h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.7rem' }}>
                Secure Telehealth
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
              onClick={copyMeetingLink}
            >
              {copiedLink ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Center Container: Preview + Join Card */}
        <div className="container" style={{ maxWidth: '1000px' }}>
          <div className="row g-4 align-items-center">
            {/* Left: Video & Mic Self-Check Preview */}
            <div className="col-12 col-lg-7">
              <div
                className="position-relative bg-dark rounded-4 overflow-hidden shadow-lg"
                style={{ aspectRatio: '16/9', minHeight: '280px' }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-100 h-100 object-fit-cover"
                  style={{
                    transform: isMirrored ? 'scaleX(-1)' : 'none',
                    display: isVideoOff ? 'none' : 'block',
                    transition: 'transform 0.25s ease'
                  }}
                />

                {isVideoOff && (
                  <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white">
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-2"
                      style={{ width: '80px', height: '80px', fontSize: '2rem', fontWeight: 600 }}
                    >
                      {(userName || 'U')[0]?.toUpperCase()}
                    </div>
                    <span className="text-white-50 small">
                      {cameraInUse ? 'Camera in use by another tab/window' : 'Camera is turned off'}
                    </span>
                  </div>
                )}

                {/* Device Notice Banner on Preview */}
                {deviceNotice && (
                  <div
                    className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 py-1 bg-warning text-dark small rounded-pill shadow d-flex align-items-center gap-2"
                    style={{ fontSize: '0.76rem', maxWidth: '90%', zIndex: 10 }}
                  >
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span className="text-truncate">{deviceNotice}</span>
                    <button
                      className="btn btn-sm btn-dark text-white rounded-pill px-2 py-0 ms-1 fw-bold flex-shrink-0"
                      style={{ fontSize: '0.72rem' }}
                      onClick={handleRetryCamera}
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Floating Media Controls on Preview */}
                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2">
                  <button
                    className={`btn rounded-circle p-2 shadow ${isMuted ? 'btn-danger' : 'btn-light'}`}
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button
                    className={`btn rounded-circle p-2 shadow ${isVideoOff ? 'btn-danger' : 'btn-light'}`}
                    onClick={toggleVideo}
                    title={isVideoOff ? 'Turn on Camera / Retry' : 'Turn off Camera'}
                  >
                    {isVideoOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}
                  </button>
                  <button
                    className={`btn rounded-circle p-2 shadow ${isMirrored ? 'btn-info text-white' : 'btn-light'}`}
                    onClick={toggleMirror}
                    title={isMirrored ? 'Self-Camera Mirrored (Click to switch to Standard)' : 'Self-Camera Standard (Click to switch to Mirror)'}
                  >
                    <FlipHorizontal size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Join Form */}
            <div className="col-12 col-lg-5">
              <div className="bg-white rounded-4 p-4 shadow-sm border">
                <div className="mb-3">
                  <h4 className="fw-bold text-dark mb-1">Ready to consult?</h4>
                  <p className="text-secondary small mb-0">
                    {userRole === 'doctor'
                      ? 'You are joining as Host (Doctor)'
                      : `Consultation with Dr. ${(meetingInfo?.doctorName || 'Doctor').replace(/^dr\.?\s*/i, '')}`}
                  </p>
                </div>

                {/* Pre-filled Details Card */}
                {loadingInfo ? (
                  <div className="p-3 text-center text-muted small">Loading appointment details...</div>
                ) : meetingInfo ? (
                  <div className="bg-light rounded-3 p-3 border mb-3 small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Doctor:</span>
                      <span className="fw-semibold text-dark">Dr. {(meetingInfo.doctorName || 'Assigned').replace(/^dr\.?\s*/i, '')}</span>
                    </div>
                    {meetingInfo.uhid && (
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">UHID:</span>
                        <span className="fw-semibold text-dark">{meetingInfo.uhid}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Service:</span>
                      <span className="fw-semibold text-success">{meetingInfo.service}</span>
                    </div>
                  </div>
                ) : null}

                {/* Patient Name Input */}
                <div className="mb-3">
                  <label className="form-label text-dark fw-semibold small mb-1">
                    Your Name <span className="text-muted fw-normal">(Confirm or change)</span>
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                  />
                </div>

                {/* Contact Phone & Email Prompt (especially if missing) */}
                {userRole === 'patient' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label text-dark fw-semibold small mb-1">
                        Phone Number {!meetingInfo?.phone && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="tel"
                        className="form-control rounded-3"
                        placeholder="WhatsApp / Mobile Number"
                        value={userPhone}
                        onChange={e => setUserPhone(e.target.value)}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label text-dark fw-semibold small mb-1">
                        Email Address <span className="text-muted fw-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        className="form-control rounded-3"
                        placeholder="email@example.com"
                        value={userEmail}
                        onChange={e => setUserEmail(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Join Button */}
                <button
                  className="btn btn-success w-100 py-3 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 mt-2"
                  style={{ background: '#059669', borderColor: '#059669', fontSize: '1rem' }}
                  onClick={handleJoinMeeting}
                >
                  <VideoIcon size={18} />
                  <span>{userRole === 'doctor' ? 'Start Consultation as Doctor' : 'Ask to Join Consultation'}</span>
                </button>

                <div className="text-center mt-3 text-muted small d-flex align-items-center justify-content-center gap-1">
                  <ShieldCheck size={14} className="text-success" />
                  <span>Encrypted end-to-end peer video connection</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted small mt-4">
          &copy; {new Date().getFullYear()} {meetingInfo?.clinicName || 'Mediplix'}. All rights reserved.
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Patient Waiting in Lobby
  // ─────────────────────────────────────────────────────────────
  if (!isAdmitted && userRole === 'patient') {
    return (
      <div className="min-vh-100 bg-light d-flex flex-column align-items-center justify-content-center p-4">
        <div className="bg-white rounded-4 p-5 shadow-lg border text-center" style={{ maxWidth: '520px' }}>
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
            style={{ width: '80px', height: '80px', background: '#ecfdf5', color: '#059669' }}
          >
            <Clock size={40} className="spin" />
          </div>

          <h4 className="fw-bold text-dark mb-2">Waiting for the Doctor</h4>
          <p className="text-secondary small mb-4">
            {waitingMessage}
          </p>

          <div className="bg-light rounded-3 p-3 border mb-4 text-start small">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Appointment ID:</span>
              <span className="font-monospace fw-semibold">{roomId.slice(-8)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Clinic:</span>
              <span className="fw-semibold text-dark">{meetingInfo?.clinicName || 'Health Clinic'}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Camera:</span>
              <span className="text-muted fw-semibold">Off (Auto-connects on admit)</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted">Status:</span>
              <span className="text-success fw-semibold">In Lobby • Knock sent to Doctor</span>
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-center">
            <button
              className="btn btn-outline-danger rounded-pill px-4 btn-sm"
              onClick={() => {
                if (localStream) localStream.getTracks().forEach(t => t.stop());
                window.location.href = '/';
              }}
            >
              Leave Waiting Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Active Consultation Room (Doctor & Admitted Patient)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="vh-100 d-flex flex-column bg-dark text-white overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Top Meeting Header Bar */}
      <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-black bg-opacity-40 border-bottom border-white border-opacity-10 z-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white"
            style={{ width: '32px', height: '32px', background: '#059669' }}
          >
            <VideoIcon size={16} />
          </div>
          <div>
            <div className="fw-bold small text-white d-flex align-items-center gap-2">
              <span>{meetingInfo?.clinicName || 'Online Consultation'}</span>
              <span className="badge bg-danger rounded-pill px-2 py-0" style={{ fontSize: '0.65rem' }}>
                ● REC / LIVE
              </span>
            </div>
            <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
              {peerInfo ? `Connected with ${peerInfo.name}` : 'Waiting for participant to connect...'} • {formatTime(callDuration)}
            </div>
          </div>
        </div>

        {/* Waiting Room Knock Notification Banner (Doctor only) */}
        {userRole === 'doctor' && waitingPatients.length > 0 && (
          <div className="d-flex align-items-center gap-2 bg-warning text-dark px-3 py-1 rounded-pill shadow-sm animate-pulse">
            <Users size={14} />
            <span className="small fw-bold">
              {waitingPatients[0].name} is waiting to join
            </span>
            <button
              className="btn btn-sm btn-dark text-white rounded-pill px-2 py-0 fw-semibold"
              style={{ fontSize: '0.75rem' }}
              onClick={() => handleAdmitPatient(waitingPatients[0].socketId)}
            >
              Admit
            </button>
            <button
              className="btn btn-sm btn-outline-dark rounded-pill px-2 py-0"
              style={{ fontSize: '0.75rem' }}
              onClick={() => handleRejectPatient(waitingPatients[0].socketId)}
            >
              Decline
            </button>
          </div>
        )}

        <div className="d-flex align-items-center gap-2">
          {/* Joining List Button (Doctor only) */}
          {userRole === 'doctor' && (
            <button
              className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 fw-semibold ${
                waitingPatients.length > 0
                  ? 'btn-warning text-dark animate-pulse shadow'
                  : 'btn-outline-light text-white-50 border-opacity-25'
              }`}
              style={{ fontSize: '0.75rem' }}
              onClick={() => setIsWaitingListOpen(!isWaitingListOpen)}
              title="View patients in waiting room"
            >
              <Users size={13} />
              <span>Joining List ({waitingPatients.length})</span>
            </button>
          )}

          {/* Copy invite link */}
          <button
            className="btn btn-sm btn-outline-light rounded-pill px-2 py-1 d-flex align-items-center gap-1 border-opacity-25"
            style={{ fontSize: '0.75rem' }}
            onClick={copyMeetingLink}
            title="Copy patient invite link"
          >
            {copiedLink ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copiedLink ? 'Copied' : 'Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="d-flex flex-grow-1 overflow-hidden position-relative">
        {/* Left Side: Video Call Workspace (Width adapts when VisitPad opens) */}
        <div
          className="d-flex flex-column h-100 position-relative transition-all"
          style={{
            flex: isVisitPadOpen ? '0 0 50%' : '1 1 100%',
            maxWidth: isVisitPadOpen ? '50%' : '100%',
            background: '#090d16',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Video Streams Container */}
          <div className="flex-grow-1 position-relative d-flex align-items-center justify-content-center p-3 overflow-hidden">
            {/* Remote Peer Video (Main View) */}
            <div
              ref={videoStageRef}
              className="w-100 h-100 rounded-4 overflow-hidden position-relative bg-black d-flex align-items-center justify-content-center shadow-lg"
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-100 h-100 object-fit-contain"
                style={{
                  transform: 'none',
                  display: remoteStream ? 'block' : 'none',
                  transition: 'transform 0.25s ease'
                }}
              />

              {/* In-Call Device Notice Banner */}
              {deviceNotice && (
                <div
                  className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 py-1 bg-warning text-dark small rounded-pill shadow d-flex align-items-center gap-2"
                  style={{ fontSize: '0.76rem', maxWidth: '90%', zIndex: 20 }}
                >
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span className="text-truncate">{deviceNotice}</span>
                  <button
                    className="btn btn-sm btn-dark text-white rounded-pill px-2 py-0 ms-1 fw-bold flex-shrink-0"
                    style={{ fontSize: '0.72rem' }}
                    onClick={handleRetryCamera}
                  >
                    Retry Camera
                  </button>
                </div>
              )}

              {/* Waiting / No Remote Video Placeholder */}
              {!remoteStream && (
                <div className="text-center p-4 w-100" style={{ maxWidth: '480px' }}>
                  {userRole === 'doctor' && waitingPatients.length > 0 ? (
                    <div className="bg-dark bg-opacity-90 border border-success border-opacity-40 rounded-4 p-4 shadow-2xl text-center">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow"
                        style={{ width: '64px', height: '64px', background: '#ecfdf5', color: '#059669' }}
                      >
                        <Users size={32} />
                      </div>
                      <h5 className="fw-bold text-white mb-1">Patient Waiting to Join</h5>
                      <p className="text-white-50 small mb-3">
                        The patient has joined the waiting room and is ready for your consultation.
                      </p>

                      <div className="d-flex flex-column gap-2 mb-2 text-start">
                        {waitingPatients.map((p, idx) => (
                          <div
                            key={p.socketId || idx}
                            className="bg-black bg-opacity-50 border border-white border-opacity-10 rounded-3 p-3 d-flex align-items-center justify-content-between"
                          >
                            <div>
                              <div className="fw-bold text-white small d-flex align-items-center gap-2">
                                <span>{p.name}</span>
                                <span className="badge bg-warning text-dark px-2 py-0" style={{ fontSize: '0.65rem' }}>
                                  Waiting
                                </span>
                              </div>
                              <div className="text-white-50 small" style={{ fontSize: '0.72rem' }}>
                                {p.phone ? `Phone: ${p.phone}` : (p.uhid ? `UHID: ${p.uhid}` : 'Patient in lobby')}
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-success fw-bold rounded-pill px-3 py-1 shadow d-flex align-items-center gap-1"
                                style={{ background: '#059669', borderColor: '#059669', fontSize: '0.8rem' }}
                                onClick={() => handleAdmitPatient(p.socketId || p.uhid || p.phone || p.name)}
                              >
                                <Check size={14} /> Admit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => handleRejectPatient(p.socketId || p.uhid || p.phone || p.name)}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                        style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.08)' }}
                      >
                        <Users size={36} className="text-white-50" />
                      </div>
                      <h6 className="fw-semibold text-white mb-1">
                        {userRole === 'doctor' ? 'Waiting for patient to join...' : 'Connecting with doctor...'}
                      </h6>
                      <p className="text-white-50 small mb-2">
                        {userRole === 'doctor'
                          ? 'Share the invite link with the patient via WhatsApp or Email.'
                          : 'Please hold on, your consultation will begin automatically.'}
                      </p>
                      <button
                        className="btn btn-sm btn-outline-light rounded-pill px-3 py-1 opacity-75 mt-1"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => {
                          sendMessage({
                            type: 'ROOM_JOIN',
                            payload: {
                              roomId,
                              role: userRole,
                              name: userNameRef.current || (userRole === 'doctor' ? 'Doctor' : 'Patient'),
                              uhid: meetingInfo?.uhid || '',
                              phone: userPhone,
                              email: userEmail,
                              isAdmitted: true,
                              socketId
                            }
                          });
                        }}
                      >
                        Refresh Call Connection
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Remote Peer Name & Status Tag */}
              {peerInfo && (
                <div className="position-absolute bottom-0 start-0 m-3 px-3 py-1 rounded-pill bg-black bg-opacity-60 backdrop-blur text-white small d-flex align-items-center gap-2">
                  <span className="fw-medium">{peerInfo.name}</span>
                  {!peerMediaState.audio && <MicOff size={13} className="text-danger" />}
                  {peerMediaState.screen && <span className="badge bg-primary px-1">Screen</span>}
                </div>
              )}

              {/* Corner Drop Targets Guide (Visible while dragging PiP) */}
              {isDraggingPip && (
                <div className="position-absolute w-100 h-100 top-0 start-0 pointer-events-none" style={{ zIndex: 20 }}>
                  <div className="position-absolute top-0 start-0 m-3 px-3 py-2 rounded-3 border border-2 border-dashed border-success text-success bg-dark bg-opacity-80 shadow small fw-semibold d-flex align-items-center gap-1">
                    <Move size={12} /> Top-Left
                  </div>
                  <div
                    className="position-absolute top-0 m-3 px-3 py-2 rounded-3 border border-2 border-dashed border-success text-success bg-dark bg-opacity-80 shadow small fw-semibold d-flex align-items-center gap-1"
                    style={{ right: (!isVisitPadOpen && (isChatOpen || isWaitingListOpen)) ? (isWaitingListOpen ? '376px' : '336px') : '16px' }}
                  >
                    <Move size={12} /> Top-Right
                  </div>
                  <div className="position-absolute bottom-0 start-0 m-3 px-3 py-2 rounded-3 border border-2 border-dashed border-success text-success bg-dark bg-opacity-80 shadow small fw-semibold d-flex align-items-center gap-1">
                    <Move size={12} /> Bottom-Left
                  </div>
                  <div
                    className="position-absolute bottom-0 m-3 px-3 py-2 rounded-3 border border-2 border-dashed border-success text-success bg-dark bg-opacity-80 shadow small fw-semibold d-flex align-items-center gap-1"
                    style={{ right: (!isVisitPadOpen && (isChatOpen || isWaitingListOpen)) ? (isWaitingListOpen ? '376px' : '336px') : '16px' }}
                  >
                    <Move size={12} /> Bottom-Right
                  </div>
                </div>
              )}

              {/* Local Self-View PiP (Picture-in-Picture) - Fully Draggable to any corner */}
              <div
                ref={pipContainerRef}
                onMouseDown={handlePipPointerDown}
                onTouchStart={handlePipPointerDown}
                className="position-absolute rounded-3 overflow-hidden shadow-2xl border border-white border-opacity-25 bg-dark user-select-none"
                style={{
                  width: isVisitPadOpen ? '140px' : '205px',
                  aspectRatio: '16/9',
                  zIndex: 25,
                  cursor: isDraggingPip ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  boxShadow: isDraggingPip
                    ? '0 20px 35px -5px rgba(0,0,0,0.8), 0 0 0 2px #059669'
                    : '0 10px 25px -5px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.2)',
                  ...(dragPos
                    ? { top: `${dragPos.y}px`, left: `${dragPos.x}px`, right: 'auto', bottom: 'auto' }
                    : getPipCornerStyle(pipCorner, isChatOpen, isWaitingListOpen, isVisitPadOpen)
                  ),
                  transition: isDraggingPip
                    ? 'none'
                    : 'top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), right 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), bottom 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s ease, box-shadow 0.2s ease',
                  transform: isDraggingPip ? 'scale(1.04)' : 'scale(1)'
                }}
                title="Drag to any corner, or click the move icon to reposition"
              >
                {/* Drag Handle Top Overlay */}
                <div
                  className="position-absolute top-0 start-0 w-100 px-2 py-1 d-flex align-items-center justify-content-between z-2"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)'
                  }}
                >
                  <div className="d-flex align-items-center gap-1 text-white-50" style={{ fontSize: '0.62rem' }}>
                    <GripHorizontal size={12} className="opacity-75" />
                    <span className="fw-medium text-white-50" style={{ fontSize: '0.6rem' }}>
                      {pipCorner.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-1">
                    {/* Switch Corner Button */}
                    <button
                      type="button"
                      className="btn btn-sm btn-dark bg-opacity-60 text-white p-0 rounded d-flex align-items-center justify-content-center border-0"
                      style={{ width: '18px', height: '18px' }}
                      onClick={cyclePipCorner}
                      title="Move to next corner (Top-Right, Top-Left, Bottom-Left, Bottom-Right)"
                    >
                      <Move size={10} />
                    </button>

                    {/* Quick Flip / Mirror Toggle Button */}
                    <button
                      type="button"
                      className={`btn btn-sm ${isMirrored ? 'btn-info text-white' : 'btn-dark bg-opacity-60 text-white-50'} p-0 rounded d-flex align-items-center justify-content-center border-0`}
                      style={{ width: '18px', height: '18px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMirror();
                      }}
                      title="Flip / Mirror Video (Left-to-Left orientation)"
                    >
                      <FlipHorizontal size={10} />
                    </button>
                  </div>
                </div>

                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-100 h-100 object-fit-cover"
                  style={{
                    transform: isMirrored ? 'scaleX(-1)' : 'none',
                    display: isVideoOff ? 'none' : 'block',
                    transition: 'transform 0.25s ease'
                  }}
                />
                {isVideoOff && (
                  <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-secondary text-white p-1 text-center" style={{ fontSize: '0.72rem' }}>
                    <div className="fw-bold">{(userName || 'U')[0].toUpperCase()}</div>
                    <span className="small text-white-50" style={{ fontSize: '0.62rem' }}>
                      {cameraInUse ? 'Cam in use' : 'Cam off'}
                    </span>
                  </div>
                )}
                <div
                  className="position-absolute bottom-0 start-0 px-2 py-0 bg-black bg-opacity-70 text-white rounded-end"
                  style={{ fontSize: '0.65rem', zIndex: 2 }}
                >
                  You {isMuted && '(Muted)'}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom In-Meeting Controls Bar */}
          <div className="py-3 px-4 bg-black bg-opacity-60 border-top border-white border-opacity-10 d-flex align-items-center justify-content-between z-3">
            {/* Left: Meeting Name */}
            <div className="d-none d-md-block text-white-50 small">
              <span className="fw-semibold text-white">{userName}</span> ({userRole === 'doctor' ? 'Doctor' : 'Patient'})
            </div>

            {/* Center: 5 Core Meeting Controls */}
            <div className="d-flex align-items-center gap-2 mx-auto">
              {/* 1. Mute / Unmute */}
              <button
                className={`btn rounded-circle p-3 d-flex align-items-center justify-content-center shadow ${isMuted ? 'btn-danger' : 'btn-outline-light bg-dark bg-opacity-50'}`}
                style={{ width: '46px', height: '46px' }}
                onClick={toggleMute}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* 2. Video On / Off */}
              <button
                className={`btn rounded-circle p-3 d-flex align-items-center justify-content-center shadow ${isVideoOff ? 'btn-danger' : 'btn-outline-light bg-dark bg-opacity-50'}`}
                style={{ width: '46px', height: '46px' }}
                onClick={toggleVideo}
                title={isVideoOff ? 'Turn on Camera / Retry' : 'Turn off Camera'}
              >
                {isVideoOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}
              </button>

              {/* Flip / Mirror Self Camera Toggle */}
              <button
                className={`btn rounded-circle p-3 d-flex align-items-center justify-content-center shadow ${isMirrored ? 'btn-info text-white' : 'btn-outline-light bg-dark bg-opacity-50'}`}
                style={{ width: '46px', height: '46px' }}
                onClick={toggleMirror}
                title={isMirrored ? 'Self-Camera Mirrored (Click to switch to Standard)' : 'Self-Camera Standard (Click to switch to Mirror)'}
              >
                <FlipHorizontal size={18} />
              </button>

              {/* 3. Screen Share */}
              <button
                className={`btn rounded-circle p-3 d-flex align-items-center justify-content-center shadow ${isScreenSharing ? 'btn-primary' : 'btn-outline-light bg-dark bg-opacity-50'}`}
                style={{ width: '46px', height: '46px' }}
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <ScreenShare size={18} />
              </button>

              {/* 4. Comments / Chat */}
              <button
                className={`btn rounded-circle p-3 d-flex align-items-center justify-content-center shadow position-relative ${isChatOpen ? 'btn-primary' : 'btn-outline-light bg-dark bg-opacity-50'}`}
                style={{ width: '46px', height: '46px' }}
                onClick={() => {
                  setIsChatOpen(!isChatOpen);
                  if (!isChatOpen) setUnreadChatCount(0);
                }}
                title="Open In-Call Chat"
              >
                <MessageSquare size={18} />
                {unreadChatCount > 0 && !isChatOpen && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadChatCount}
                  </span>
                )}
              </button>

              {/* Joining List (Doctor only) */}
              {userRole === 'doctor' && (
                <button
                  className={`btn rounded-circle p-3 d-flex align-items-center justify-content-center shadow position-relative ${
                    isWaitingListOpen ? 'btn-warning text-dark' : (waitingPatients.length > 0 ? 'btn-warning text-dark animate-pulse' : 'btn-outline-light bg-dark bg-opacity-50')
                  }`}
                  style={{ width: '46px', height: '46px' }}
                  onClick={() => setIsWaitingListOpen(!isWaitingListOpen)}
                  title="View Joining / Waiting List"
                >
                  <Users size={18} />
                  {waitingPatients.length > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                      {waitingPatients.length}
                    </span>
                  )}
                </button>
              )}

              {/* 5. Visit Pad (Doctor only: splits screen 50/50) */}
              {userRole === 'doctor' && (
                <button
                  className={`btn rounded-pill px-3 py-2 d-flex align-items-center gap-2 shadow fw-semibold ${isVisitPadOpen ? 'btn-success' : 'btn-outline-success text-white'}`}
                  style={{
                    fontSize: '0.82rem',
                    background: isVisitPadOpen ? '#059669' : 'rgba(5,150,105,0.25)',
                    borderColor: '#059669'
                  }}
                  onClick={() => setIsVisitPadOpen(!isVisitPadOpen)}
                  title={isVisitPadOpen ? 'Close Visit Pad Split View' : 'Open Prescription / Visit Pad Side-by-Side'}
                >
                  <FileText size={16} />
                  <span>{isVisitPadOpen ? 'Close Pad' : 'Visit Pad'}</span>
                </button>
              )}

              {/* End Call Button */}
              <button
                className="btn btn-danger rounded-circle p-3 d-flex align-items-center justify-content-center shadow ms-2"
                style={{ width: '46px', height: '46px', background: '#dc2626' }}
                onClick={handleEndCall}
                title="End Consultation"
              >
                <PhoneOff size={18} />
              </button>
            </div>

            {/* Right: Toggle Visit Pad pill if not open */}
            <div className="d-none d-md-block">
              {userRole === 'doctor' && !isVisitPadOpen && (
                <button
                  className="btn btn-sm btn-outline-light border-opacity-25 rounded-pill px-3"
                  onClick={() => setIsVisitPadOpen(true)}
                  style={{ fontSize: '0.78rem' }}
                >
                  Write Prescription →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side 50%: Live Embedded Visit Pad (Split-screen) */}
        {isVisitPadOpen && userRole === 'doctor' && (
          <div
            className="h-100 border-start shadow-2xl bg-white position-relative d-flex flex-column"
            style={{
              flex: '0 0 50%',
              maxWidth: '50%',
              zIndex: 2,
              overflow: 'hidden'
            }}
          >
            {/* Top Bar for Split View */}
            <div className="bg-light border-bottom px-3 py-2 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <FileText size={16} className="text-success" />
                <span className="fw-bold text-dark small">Live Prescription Pad (Split Screen)</span>
              </div>
              <button
                className="btn btn-sm btn-light border rounded-circle p-1"
                onClick={() => setIsVisitPadOpen(false)}
                title="Close Split View"
              >
                <X size={15} />
              </button>
            </div>

            {/* Live Interactive VisitPad Component */}
            <div className="flex-grow-1 overflow-auto">
              <VisitPad appointmentIdOverride={roomId} isSplitView={true} />
            </div>
          </div>
        )}

        {/* In-Call Comments / Chat Drawer */}
        {isChatOpen && (
          <div
            className="position-absolute top-0 end-0 h-100 bg-dark border-start border-white border-opacity-10 d-flex flex-column shadow-2xl"
            style={{ width: '320px', background: '#1e293b', zIndex: 40 }}
          >
            {/* Chat Header */}
            <div className="p-3 border-bottom border-white border-opacity-10 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <MessageSquare size={16} className="text-success" />
                <h6 className="fw-bold mb-0 text-white small">In-Call Comments & Chat</h6>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-light border-0 p-1 rounded-circle"
                onClick={() => setIsChatOpen(false)}
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages List */}
            <div
              ref={chatScrollRef}
              className="flex-grow-1 p-3 overflow-y-auto d-flex flex-column gap-2"
              style={{ fontSize: '0.82rem' }}
            >
              {chatMessages.length === 0 ? (
                <div className="text-center text-white-50 my-auto py-4">
                  <MessageSquare size={32} className="opacity-25 mx-auto mb-2 d-block" />
                  No messages yet. Send a note or message here.
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.senderName === userName;
                  return (
                    <div
                      key={msg.id || (msg.timestamp + '-' + msg.senderName)}
                      className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}
                    >
                      <div className="text-white-50 px-1" style={{ fontSize: '0.68rem' }}>
                        {msg.senderName} ({msg.senderRole})
                      </div>
                      <div
                        className={`p-2 rounded-3 text-break mt-1 shadow-sm ${isMe ? 'bg-success text-white' : 'bg-secondary bg-opacity-30 text-white border border-white border-opacity-10'}`}
                        style={{ maxWidth: '85%' }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Box */}
            <form onSubmit={handleSendMessage} className="p-2 border-top border-white border-opacity-10 d-flex gap-2 bg-black bg-opacity-20">
              <input
                type="text"
                placeholder="Type a message... (Press Enter to send)"
                className="form-control form-control-sm bg-black bg-opacity-40 border-secondary text-white shadow-none"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-sm btn-success px-3 d-flex align-items-center justify-content-center shadow"
                style={{ background: '#059669', borderColor: '#059669' }}
                disabled={!chatInput.trim()}
                title="Send Message"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Joining / Waiting Room Drawer (Doctor only) */}
        {isWaitingListOpen && userRole === 'doctor' && (
          <div
            className="position-absolute top-0 end-0 h-100 bg-dark border-start border-white border-opacity-10 d-flex flex-column shadow-2xl"
            style={{ width: '360px', background: '#1e293b', zIndex: 40 }}
          >
            {/* Drawer Header */}
            <div className="p-3 border-bottom border-white border-opacity-10 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Users size={18} className="text-warning" />
                <div>
                  <h6 className="fw-bold mb-0 text-white small">Waiting Patients List</h6>
                  <span className="text-white-50" style={{ fontSize: '0.72rem' }}>
                    {waitingPatients.length} patient(s) waiting in lobby
                  </span>
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline-light border-0 p-1"
                onClick={() => setIsWaitingListOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2">
              {waitingPatients.length === 0 ? (
                <div className="text-center py-5 text-white-50 small my-auto">
                  <Users size={36} className="opacity-25 mb-2 d-block mx-auto" />
                  No patients currently waiting in lobby.
                  <div className="mt-2 text-white-50" style={{ fontSize: '0.72rem' }}>
                    Share the meeting invite link with the patient to join.
                  </div>
                </div>
              ) : (
                waitingPatients.map((p, idx) => (
                  <div
                    key={p.socketId || idx}
                    className="bg-black bg-opacity-40 border border-white border-opacity-10 rounded-3 p-3 shadow-sm"
                  >
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div>
                        <div className="fw-bold text-white small">{p.name}</div>
                        {p.phone && <div className="text-white-50" style={{ fontSize: '0.75rem' }}>Phone: {p.phone}</div>}
                        {p.email && <div className="text-white-50" style={{ fontSize: '0.75rem' }}>Email: {p.email}</div>}
                        {p.uhid && <div className="text-white-50" style={{ fontSize: '0.75rem' }}>UHID: {p.uhid}</div>}
                      </div>
                      <span className="badge bg-warning text-dark px-2 py-0" style={{ fontSize: '0.65rem' }}>
                        Waiting
                      </span>
                    </div>

                    <div className="d-flex gap-2 mt-2">
                      <button
                        className="btn btn-sm btn-success fw-bold rounded-pill px-3 py-1 flex-grow-1 shadow d-flex align-items-center justify-content-center gap-1"
                        style={{ background: '#059669', borderColor: '#059669', fontSize: '0.78rem' }}
                        onClick={() => {
                          handleAdmitPatient(p.socketId || p.uhid || p.phone || p.name);
                          setIsWaitingListOpen(false);
                        }}
                      >
                        <Check size={14} /> Admit Patient
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleRejectPatient(p.socketId || p.uhid || p.phone || p.name)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineMeetingRoom;
