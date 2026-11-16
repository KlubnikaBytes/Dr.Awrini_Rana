const { WebSocketServer } = require('ws');
const crypto = require('crypto');

let wss = null;
const clients = new Set();

// Map of roomId -> Map<socketId, participantData>
// participantData: { ws, socketId, role, name, uhid, phone, email, isAdmitted, joinedAt }
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function cleanEmptyRoom(roomId) {
  const room = rooms.get(roomId);
  if (room && room.size === 0) {
    rooms.delete(roomId);
  }
}

// Persistent lobby store: roomId -> Map<patientKey, patientData>
// Ensures patients who knocked are NEVER lost even during WS drops/reconnects
const waitingLobby = new Map();

function registerLobbyPatient(roomId, patientData) {
  if (!waitingLobby.has(roomId)) {
    waitingLobby.set(roomId, new Map());
  }
  const lobby = waitingLobby.get(roomId);
  const key = patientData.uhid || patientData.phone || patientData.name || patientData.socketId;
  lobby.set(key, {
    ...patientData,
    isAdmitted: false,
    lastHeartbeat: Date.now()
  });
}

function checkPatientAdmitted(roomId, uhid, phone, name, socketId) {
  if (!waitingLobby.has(roomId)) return false;
  const lobby = waitingLobby.get(roomId);
  const identifiers = [uhid, phone, name, socketId].filter(Boolean);
  for (const [key, p] of lobby.entries()) {
    if (identifiers.includes(key) || identifiers.includes(p.socketId) || identifiers.includes(p.uhid)) {
      if (p.isAdmitted) return true;
    }
  }
  return false;
}

function admitLobbyPatient(roomId, socketIdOrKey) {
  if (!waitingLobby.has(roomId)) return;
  const lobby = waitingLobby.get(roomId);
  for (const [key, p] of lobby.entries()) {
    if (p.socketId === socketIdOrKey || key === socketIdOrKey || p.uhid === socketIdOrKey || p.phone === socketIdOrKey || p.name === socketIdOrKey) {
      p.isAdmitted = true;
      p.admittedAt = Date.now();
    }
  }
}

function rejectLobbyPatient(roomId, socketIdOrKey) {
  if (!waitingLobby.has(roomId)) return;
  const lobby = waitingLobby.get(roomId);
  for (const [key, p] of lobby.entries()) {
    if (p.socketId === socketIdOrKey || key === socketIdOrKey || p.uhid === socketIdOrKey || p.phone === socketIdOrKey || p.name === socketIdOrKey) {
      lobby.delete(key);
    }
  }
}

function findParticipant(roomId, identifier) {
  if (!rooms.has(roomId) || !identifier) return null;
  const room = rooms.get(roomId);
  if (room.has(identifier)) return room.get(identifier);
  for (const p of room.values()) {
    if (p.socketId === identifier || p.uhid === identifier || p.phone === identifier || p.name === identifier) {
      return p;
    }
  }
  return null;
}

function connectAdmittedPeers(roomId) {
  if (!rooms.has(roomId)) return;
  const room = rooms.get(roomId);
  const doctors = Array.from(room.values()).filter(p => p.role === 'doctor' && p.ws.readyState === p.ws.OPEN);
  const admittedPatients = Array.from(room.values()).filter(p => p.role === 'patient' && p.isAdmitted && p.ws.readyState === p.ws.OPEN);

  if (doctors.length > 0 && admittedPatients.length > 0) {
    doctors.forEach(doc => {
      admittedPatients.forEach(patient => {
        // Doctor initiates WebRTC offer to Patient
        doc.ws.send(JSON.stringify({
          type: 'PEER_JOINED',
          payload: {
            socketId: patient.socketId,
            role: 'patient',
            name: patient.name,
            shouldInitiateOffer: true
          }
        }));

        // Patient receives Doctor's info and prepares to answer
        patient.ws.send(JSON.stringify({
          type: 'PEER_JOINED',
          payload: {
            socketId: doc.socketId,
            role: 'doctor',
            name: doc.name || 'Doctor',
            shouldInitiateOffer: false
          }
        }));
      });
    });
  }
}

function admitPatientInRoom(roomId, socketIdOrKey) {
  admitLobbyPatient(roomId, socketIdOrKey);
  const patient = findParticipant(roomId, socketIdOrKey);
  if (patient) {
    patient.isAdmitted = true;
    if (patient.ws.readyState === patient.ws.OPEN) {
      patient.ws.send(JSON.stringify({
        type: 'PATIENT_ADMITTED',
        payload: { roomId }
      }));
    }
  }
  // Patient will re-announce ROOM_JOIN after media is acquired, triggering connectAdmittedPeers.
  // We also schedule a fallback trigger to guarantee connection starts.
  setTimeout(() => connectAdmittedPeers(roomId), 1000);

  // Broadcast updated waiting list to doctors in room
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    const waitingList = getWaitingPatients(roomId);
    room.forEach(p => {
      if (p.role === 'doctor' && p.ws.readyState === p.ws.OPEN) {
        p.ws.send(JSON.stringify({
          type: 'WAITING_ROOM_UPDATE',
          payload: { roomId, waitingPatients: waitingList }
        }));
      }
    });
  }
}

function rejectPatientInRoom(roomId, socketIdOrKey, reason) {
  rejectLobbyPatient(roomId, socketIdOrKey);
  const patient = findParticipant(roomId, socketIdOrKey);
  if (patient) {
    if (patient.ws.readyState === patient.ws.OPEN) {
      patient.ws.send(JSON.stringify({
        type: 'PATIENT_REJECTED',
        payload: {
          roomId,
          reason: reason || 'The doctor is unavailable at the moment.'
        }
      }));
    }
    const room = rooms.get(roomId);
    if (room) room.delete(patient.socketId);
  }

  // Broadcast updated waiting list to doctors in room
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    const waitingList = getWaitingPatients(roomId);
    room.forEach(p => {
      if (p.role === 'doctor' && p.ws.readyState === p.ws.OPEN) {
        p.ws.send(JSON.stringify({
          type: 'WAITING_ROOM_UPDATE',
          payload: { roomId, waitingPatients: waitingList }
        }));
      }
    });
  }
}

function getWaitingPatients(roomId) {
  const result = new Map();
  const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes window

  // 1. Check live WebSocket room
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.forEach((p) => {
      if (!p.isAdmitted && p.role === 'patient') {
        const key = p.uhid || p.phone || p.name || p.socketId;
        result.set(key, {
          socketId: p.socketId,
          name: p.name,
          uhid: p.uhid,
          phone: p.phone,
          email: p.email,
          joinedAt: p.joinedAt
        });
      }
    });
  }

  // 2. Check persistent waitingLobby
  if (waitingLobby.has(roomId)) {
    const lobby = waitingLobby.get(roomId);
    lobby.forEach((p, key) => {
      if (!p.isAdmitted && p.lastHeartbeat > cutoff) {
        if (!result.has(key)) {
          result.set(key, {
            socketId: p.socketId || key,
            name: p.name,
            uhid: p.uhid,
            phone: p.phone,
            email: p.email,
            joinedAt: p.joinedAt || p.lastHeartbeat
          });
        }
      }
    });
  }

  return Array.from(result.values());
}

/**
 * Initialize the WebSocket server attached to an http.Server instance.
 */
function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    // Generate a unique socketId for this client
    ws.socketId = crypto.randomUUID();
    clients.add(ws);

    // Keep connection alive with ping/pong
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      clients.delete(ws);

      // Handle room cleanup if client was in a meeting room
      if (ws.roomId && rooms.has(ws.roomId)) {
        const room = rooms.get(ws.roomId);
        const participant = room.get(ws.socketId);
        room.delete(ws.socketId);

        if (participant) {
          if (participant.isAdmitted) {
            // Notify remaining admitted participants that peer left
            room.forEach((p) => {
              if (p.isAdmitted && p.ws.readyState === p.ws.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'PEER_LEFT',
                  payload: {
                    socketId: ws.socketId,
                    name: participant.name,
                    role: participant.role
                  }
                }));
              }
            });
          } else {
            // Patient connection closed while waiting in lobby; send updated waiting list from lobby store
            const waitingList = getWaitingPatients(ws.roomId);

            room.forEach((p) => {
              if (p.role === 'doctor' && p.ws.readyState === p.ws.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'WAITING_ROOM_UPDATE',
                  payload: { roomId: ws.roomId, waitingPatients: waitingList }
                }));
              }
            });
          }
        }
        cleanEmptyRoom(ws.roomId);
      }
    });

    ws.on('error', () => {
      clients.delete(ws);
    });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (!data || !data.type) return;

        // Authenticate with JWT_SECRET as a simple key to prevent unauthorized reloads
        if (data.type === 'ADMIN_RELOAD' && data.key === process.env.JWT_SECRET) {
          broadcast('FORCE_RELOAD');
          return;
        }

        // ─────────────────────────────────────────────────────────
        // Video Consultation & Telehealth Signaling Protocol
        // ─────────────────────────────────────────────────────────
        const { type, payload = {} } = data;
        const { roomId } = payload;

        switch (type) {
          case 'ROOM_JOIN': {
            if (!roomId) return;
            const room = getRoom(roomId);
            const socketId = ws.socketId;
            const role = payload.role || 'patient';
            const name = payload.name || (role === 'doctor' ? 'Doctor' : 'Patient');
            const uhid = payload.uhid || '';
            const phone = payload.phone || '';
            const email = payload.email || '';
            const isDoctor = role === 'doctor';

            ws.roomId = roomId;
            ws.role = role;
            ws.userName = name;
            ws.uhid = uhid;

            // Check if patient was already admitted (via lobby or explicit admission)
            const isAdmitted = isDoctor || Boolean(payload.isAdmitted) || checkPatientAdmitted(roomId, uhid, phone, name, socketId);

            const participant = {
              ws,
              socketId,
              role,
              name,
              uhid,
              phone,
              email,
              isAdmitted,
              joinedAt: Date.now()
            };

            room.set(socketId, participant);

            // Notify this user of successful room entry
            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomId,
                socketId,
                role,
                name,
                isAdmitted: participant.isAdmitted
              }
            }));

            if (isDoctor) {
              // Send doctor the list of any patients currently waiting in lobby
              const waitingList = getWaitingPatients(roomId);

              ws.send(JSON.stringify({
                type: 'WAITING_ROOM_UPDATE',
                payload: { roomId, waitingPatients: waitingList }
              }));

              // If an admitted peer is already in room, connect them
              connectAdmittedPeers(roomId);
            } else {
              if (isAdmitted) {
                // Patient is already admitted -> connect to doctor immediately
                connectAdmittedPeers(roomId);
              } else {
                // Register in persistent lobby so doctor always sees patient
                registerLobbyPatient(roomId, {
                  socketId,
                  name,
                  uhid,
                  phone,
                  email,
                  joinedAt: participant.joinedAt
                });

                // Patient joined -> Notify doctor(s) in this room
                const waitingList = getWaitingPatients(roomId);
                const doctors = Array.from(room.values()).filter(p => p.role === 'doctor');
                doctors.forEach(doc => {
                  if (doc.ws.readyState === doc.ws.OPEN) {
                    doc.ws.send(JSON.stringify({
                      type: 'PATIENT_WAITING',
                      payload: {
                        roomId,
                        patient: {
                          socketId,
                          name,
                          uhid,
                          phone,
                          email,
                          joinedAt: participant.joinedAt
                        }
                      }
                    }));
                    doc.ws.send(JSON.stringify({
                      type: 'WAITING_ROOM_UPDATE',
                      payload: { roomId, waitingPatients: waitingList }
                    }));
                  }
                });

                // Tell patient they are in waiting room
                ws.send(JSON.stringify({
                  type: 'WAITING_FOR_HOST',
                  payload: {
                    roomId,
                    message: 'Waiting for the doctor to admit you to the consultation room...'
                  }
                }));
              }
            }
            break;
          }

          case 'ADMIT_PATIENT': {
            if (!roomId || !payload.patientSocketId) return;
            admitPatientInRoom(roomId, payload.patientSocketId);
            break;
          }

          case 'REJECT_PATIENT': {
            if (!roomId || !payload.patientSocketId) return;
            rejectPatientInRoom(roomId, payload.patientSocketId, payload.reason);
            break;
          }

          // Forward WebRTC signaling (offer, answer, ICE candidates)
          case 'SIGNAL_OFFER':
          case 'SIGNAL_ANSWER':
          case 'SIGNAL_ICE': {
            if (!roomId || !payload.targetSocketId) return;
            const room = getRoom(roomId);
            const target = room.get(payload.targetSocketId);
            if (target && target.ws.readyState === target.ws.OPEN) {
              target.ws.send(JSON.stringify({
                type,
                payload: {
                  ...payload,
                  fromSocketId: ws.socketId
                }
              }));
            }
            break;
          }

          case 'CHAT_MESSAGE': {
            if (!roomId) return;
            const room = getRoom(roomId);
            const messagePayload = {
              id: payload.id || crypto.randomUUID(),
              text: payload.text || '',
              senderName: ws.userName || payload.senderName || 'Anonymous',
              senderRole: ws.role || payload.senderRole || 'guest',
              senderSocketId: ws.socketId,
              timestamp: payload.timestamp || Date.now()
            };

            // Broadcast to all admitted peers in this room
            room.forEach(p => {
              if (p.isAdmitted && p.ws.readyState === p.ws.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'CHAT_MESSAGE',
                  payload: messagePayload
                }));
              }
            });
            break;
          }

          case 'MEDIA_STATE_CHANGED': {
            if (!roomId) return;
            const room = getRoom(roomId);
            room.forEach(p => {
              if (p.socketId !== ws.socketId && p.isAdmitted && p.ws.readyState === p.ws.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'PEER_MEDIA_STATE',
                  payload: {
                    socketId: ws.socketId,
                    audio: payload.audio,
                    video: payload.video,
                    screen: payload.screen
                  }
                }));
              }
            });
            break;
          }

          case 'END_CALL': {
            if (!roomId) return;
            const room = getRoom(roomId);
            room.forEach(p => {
              if (p.ws.readyState === p.ws.OPEN) {
                p.ws.send(JSON.stringify({
                  type: 'CALL_ENDED',
                  payload: {
                    roomId,
                    endedBy: ws.userName || ws.role || 'Doctor'
                  }
                }));
              }
            });
            rooms.delete(roomId);
            break;
          }
        }
      } catch(e) {
        console.error('WS message handler error:', e);
      }
    });

    // Send a welcome message so client knows it's connected
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      payload: { ts: Date.now(), socketId: ws.socketId }
    }));
  });

  // Heartbeat: ping all clients every 30s to detect dead connections
  const heartbeat = setInterval(() => {
    clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('WebSocket server initialized with Telehealth WebRTC signaling support');
  return wss;
}

/**
 * Broadcast a typed event to all connected clients.
 * @param {string} type  - Event type string (e.g. 'APPOINTMENT_CREATED')
 * @param {object} payload - Data to send along with the event
 */
function broadcast(type, payload = {}) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload });
  clients.forEach((ws) => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    } catch (_) {
      clients.delete(ws);
    }
  });
}

module.exports = {
  initWebSocket,
  broadcast,
  getWaitingPatients,
  registerLobbyPatient,
  admitLobbyPatient,
  rejectLobbyPatient,
  admitPatientInRoom,
  rejectPatientInRoom,
  findParticipant,
  connectAdmittedPeers,
  waitingLobby
};
