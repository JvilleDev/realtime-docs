import { Database } from 'bun:sqlite';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import expressWs from 'express-ws';
import { initDatabase } from './db/schema';
import { setupSocketHandlers } from './socket/socket.handler';
import { createAuthService } from './auth/auth.service';
import { createDocumentService } from './documents/document.service';
import { createHocuspocusServer } from './hocuspocus/hocuspocus.server';

const app = express();
const server = createServer(app);

// Setup express-ws for WebSocket support
const { app: wsApp } = expressWs(app, server);

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow localhost for development
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow Tunnelmole domains
      if (origin.includes('tunnelmole.net')) {
        return callback(null, true);
      }
      
      // Allow any subdomain of tunnelmole.net
      if (origin.match(/^https?:\/\/[a-zA-Z0-9-]+-ip-[0-9-]+\.tunnelmole\.net$/)) {
        return callback(null, true);
      }
      
      // Allow specific frontend URL if set
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost for development
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Tunnelmole domains
    if (origin.includes('tunnelmole.net')) {
      return callback(null, true);
    }
    
    // Allow any subdomain of tunnelmole.net
    if (origin.match(/^https?:\/\/[a-zA-Z0-9-]+-ip-[0-9-]+\.tunnelmole\.net$/)) {
      return callback(null, true);
    }
    
    // Allow specific frontend URL if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Initialize database
const db = initDatabase();

// Initialize Hocuspocus server
const hocuspocusServer = createHocuspocusServer(db);

// Routes
app.use('/api/auth', createAuthService(db));
app.use('/api/documents', createDocumentService(db));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.IO handlers (for presence and cursors)
setupSocketHandlers(io, db);

const PORT = process.env.PORT || 3001;
const HOCUSPOCUS_PORT = process.env.HOCUSPOCUS_PORT || 3002;

// Start the main Express server
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database initialized at ${process.env.DATABASE_PATH || './data/realtime-docs.db'}`);
  console.log(`🔌 Socket.IO server available at http://localhost:${PORT}/socket.io/`);
  
  // Start the Hocuspocus server
  try {
    await hocuspocusServer.listen(HOCUSPOCUS_PORT);
    console.log(`🤝 Hocuspocus collaboration server running on port ${HOCUSPOCUS_PORT}`);
  } catch (error) {
    console.error('Failed to start Hocuspocus server:', error);
  }
});

export { db };
