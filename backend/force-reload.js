require('dotenv').config();
const WebSocket = require('ws');

// Connect to the local WebSocket server
const ws = new WebSocket(`ws://localhost:${process.env.PORT || 5000}`);

ws.on('open', () => {
  console.log('Connected to local WebSocket server.');
  
  // Send the ADMIN_RELOAD command with the JWT_SECRET to authorize
  ws.send(JSON.stringify({
    type: 'ADMIN_RELOAD',
    key: process.env.JWT_SECRET
  }));

  console.log('Successfully sent FORCE_RELOAD broadcast to all connected clients.');
  
  // Close the connection
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 1000);
});

ws.on('error', (err) => {
  console.error('Failed to connect to the WebSocket server:', err.message);
  process.exit(1);
});
