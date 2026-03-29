const WebSocket = require('ws');

let wss;
const clients = new Map(); // userId -> Set of WebSocket connections

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    ws.isAlive = true;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'AUTH' && message.userId) {
          // Register this connection for the user
          if (!clients.has(message.userId)) {
            clients.set(message.userId, new Set());
          }
          clients.get(message.userId).add(ws);
          ws.userId = message.userId;
          ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', message: 'Connected to real-time updates' }));
        }
      } catch (e) {
        // Ignore invalid messages
      }
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      if (ws.userId && clients.has(ws.userId)) {
        clients.get(ws.userId).delete(ws);
        if (clients.get(ws.userId).size === 0) {
          clients.delete(ws.userId);
        }
      }
    });
  });

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  console.log('✅ WebSocket server initialized');
};

// Notify a specific user
const notifyUser = (userId, data) => {
  const userClients = clients.get(userId?.toString());
  if (!userClients) return;
  const payload = JSON.stringify(data);
  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
};

// Broadcast to all connected clients
const broadcast = (data) => {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
};

module.exports = { initWebSocket, notifyUser, broadcast };
