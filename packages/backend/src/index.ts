import { Database } from 'bun:sqlite';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initDatabase } from './db/schema';
import { setupSocketHandlers } from './socket/socket.handler';
import { createAuthService } from './auth/auth.service';
import { createDocumentService } from './documents/document.service';
// Removed Yjs WebSocket server - using Socket.IO instead

const app = express();
const server = createServer(app);
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

// Routes
app.use('/api/auth', createAuthService(db));
app.use('/api/documents', createDocumentService(db));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.IO handlers
setupSocketHandlers(io, db);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database initialized at ${process.env.DATABASE_PATH || './data/realtime-docs.db'}`);
  console.log(`🔌 Socket.IO server available at http://localhost:${PORT}/socket.io/`);
});

export { db };
