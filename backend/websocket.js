const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Set();

/**
 * Initialize the WebSocket server attached to an http.Server instance.
 */
function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);

    // Keep connection alive with ping/pong
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });

    // Send a welcome message so client knows it's connected
    ws.send(JSON.stringify({ type: 'CONNECTED', payload: { ts: Date.now() } }));
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

  console.log('WebSocket server initialized');
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

module.exports = { initWebSocket, broadcast };
