require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initWebSocket } = require('./utils/websocket');

const PORT = process.env.PORT || 5000;

// Connect to database then start server
connectDB().then(() => {
  const server = http.createServer(app);
  
  // Initialize WebSocket
  initWebSocket(server);

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  });
}).catch((err) => {
  console.error('❌ Failed to connect to database:', err.message);
  process.exit(1);
});
