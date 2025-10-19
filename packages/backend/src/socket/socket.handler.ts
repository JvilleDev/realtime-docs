import { Server as SocketIOServer, Socket } from 'socket.io';
import { Database } from 'bun:sqlite';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userInfo?: {
    id: number;
    username: string;
    display_name: string;
    avatar_color: string;
    is_admin: boolean;
  };
  isGuest?: boolean;
  guestId?: number;
}

interface CursorPosition {
  userId: number;
  userInfo: {
    display_name: string;
    avatar_color: string;
    is_admin?: boolean;
  };
  position: {
    anchor: number;
    head: number;
  };
  timestamp: number;
  isGuest?: boolean;
}

interface DocumentPresence {
  [documentId: string]: {
    [userId: string]: CursorPosition & {
      lastPing?: number;
    };
  };
}

const documentPresence: DocumentPresence = {};
let guestCounter = 0;

// Cleanup interval for inactive users
let cleanupInterval: NodeJS.Timeout | null = null;

// Start cleanup interval if not already running
const startCleanupInterval = (io: SocketIOServer) => {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const timeoutMs = 5000; // 5 seconds
    
    Object.keys(documentPresence).forEach(documentId => {
      const documentUsers = documentPresence[documentId];
      
      Object.keys(documentUsers).forEach(userId => {
        const user = documentUsers[userId];
        if (user.lastPing && (now - user.lastPing) > timeoutMs) {
          // User timed out
          delete documentUsers[userId];
          
          // Broadcast user left due to timeout
          io.to(`document:${documentId}`).emit('presence:update', {
            type: 'user_left',
            userId: user.userId,
            reason: 'timeout',
            isGuest: user.isGuest
          });
        }
      });
      
      // Clean up empty documents
      if (Object.keys(documentUsers).length === 0) {
        delete documentPresence[documentId];
      }
    });
  }, 2000); // Check every 2 seconds
};

// Stop cleanup interval
const stopCleanupInterval = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

export function setupSocketHandlers(io: SocketIOServer, db: Database) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const isGuest = socket.handshake.auth.guest === true;

      const authInfo = {
        token: token ? `${token.substring(0, 10)}...` : 'none',
        isGuest,
        socketId: socket.id
      };

      if (isGuest) {
        socket.isGuest = true;
        socket.guestId = ++guestCounter;
        return next();
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const session = db.query(`
        SELECT s.user_id, u.username, u.display_name, u.avatar_color, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `).get(token) as {
        user_id: number;
        username: string;
        display_name: string;
        avatar_color: string;
        is_admin: boolean;
      } | null;

      if (!session) {
        return next(new Error('Invalid or expired token'));
      }

      socket.userId = session.user_id;
      socket.userInfo = {
        id: session.user_id,
        username: session.username,
        display_name: session.display_name,
        avatar_color: session.avatar_color,
        is_admin: session.is_admin
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const connectionInfo = {
      headers: socket.handshake.headers,
      auth: socket.handshake.auth,
      address: socket.handshake.address
    };

    // Join document room
    socket.on('document:join', (documentId: string) => {
      try {
        socket.join(`document:${documentId}`);

        // Initialize presence for this document if not exists
        if (!documentPresence[documentId]) {
          documentPresence[documentId] = {};
        }

        // Add user to presence (authenticated users only - guests don't get cursors)
        if (socket.isGuest && socket.guestId) {
          // Guest user - only add to presence list, no cursor tracking
          const guestKey = `guest_${socket.guestId}`;
          documentPresence[documentId][guestKey] = {
            userId: socket.guestId,
            userInfo: {
              display_name: `Guest ${socket.guestId}`,
              avatar_color: '#6B7280'
            },
            position: { anchor: 0, head: 0 },
            timestamp: Date.now(),
            isGuest: true,
            lastPing: Date.now()
          };

          // Broadcast guest joined to all users in the document
          socket.to(`document:${documentId}`).emit('presence:update', {
            type: 'user_joined',
            userId: socket.guestId,
            userInfo: {
              display_name: `Guest ${socket.guestId}`,
              avatar_color: '#6B7280'
            },
            isGuest: true
          });
        } else if (socket.userId && socket.userInfo) {
          // Authenticated user
          documentPresence[documentId][socket.userId.toString()] = {
            userId: socket.userId,
            userInfo: {
              display_name: socket.userInfo.display_name,
              avatar_color: socket.userInfo.avatar_color,
              is_admin: socket.userInfo.is_admin
            },
            position: { anchor: 0, head: 0 },
            timestamp: Date.now(),
            isGuest: false,
            lastPing: Date.now()
          };

          // Broadcast updated presence to all users in the document
          socket.to(`document:${documentId}`).emit('presence:update', {
            type: 'user_joined',
            userId: socket.userId,
            userInfo: socket.userInfo,
            isGuest: false
          });
        }

        // Send current presence to the joining user
        socket.emit('presence:init', documentPresence[documentId]);
        
        // Start cleanup interval if not already running
        startCleanupInterval(io);

      } catch (error) {
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Leave document room
    socket.on('document:leave', (documentId: string) => {
      try {
        socket.leave(`document:${documentId}`);

        // Remove from presence (authenticated or guest)
        if (socket.isGuest && socket.guestId && documentPresence[documentId]) {
          const guestKey = `guest_${socket.guestId}`;
          delete documentPresence[documentId][guestKey];

          // Broadcast guest left to all users in the document
          socket.to(`document:${documentId}`).emit('presence:update', {
            type: 'user_left',
            userId: socket.guestId,
            isGuest: true
          });
        } else if (socket.userId && documentPresence[documentId]) {
          delete documentPresence[documentId][socket.userId.toString()];

          // Broadcast user left to all users in the document
          socket.to(`document:${documentId}`).emit('presence:update', {
            type: 'user_left',
            userId: socket.userId,
            isGuest: false
          });
        }

      } catch (error) {
      }
    });

    // Document content updates are now handled by Hocuspocus/Yjs
    // This event is kept for backward compatibility but does nothing
    socket.on('document:update', (data: { documentId: string; content: any; changeData?: any }) => {
      console.log('📝 Document update received (handled by Hocuspocus):', {
        documentId: data.documentId,
        userId: socket.userId,
        isGuest: socket.isGuest
      });
      // Document updates are now handled by Hocuspocus/Yjs collaboration
      // No need to broadcast or store here
    });

    // Handle cursor position updates (authenticated users only)
    socket.on('cursor:move', (data: { documentId: string; position: { anchor: number; head: number } }) => {
      try {
        const { documentId, position } = data;

        // Skip cursor updates for guests - they don't have cursors
        if (socket.isGuest) {
          return;
        }

        // Update presence with new cursor position for authenticated users only
        if (documentPresence[documentId] && socket.userId && socket.userInfo) {
          // Authenticated user cursor update
          documentPresence[documentId][socket.userId.toString()] = {
            userId: socket.userId,
            userInfo: {
              display_name: socket.userInfo.display_name,
              avatar_color: socket.userInfo.avatar_color,
              is_admin: socket.userInfo.is_admin
            },
            position,
            timestamp: Date.now(),
            isGuest: false,
            lastPing: Date.now()
          };

          // Broadcast cursor update to all other users in the document
          socket.to(`document:${documentId}`).emit('cursor:move', {
            userId: socket.userId,
            userInfo: socket.userInfo,
            position,
            timestamp: Date.now(),
            isGuest: false
          });
        }
      } catch (error) {
        console.error('Error handling cursor move:', error);
      }
    });

    // Handle user typing status
    socket.on('typing:start', (documentId: string) => {
      if (socket.userId && socket.userInfo) {
        socket.to(`document:${documentId}`).emit('typing:start', {
          userId: socket.userId,
          userInfo: socket.userInfo
        });
      }
    });

    socket.on('typing:stop', (documentId: string) => {
      if (socket.userId && socket.userInfo) {
        socket.to(`document:${documentId}`).emit('typing:stop', {
          userId: socket.userId,
          userInfo: socket.userInfo
        });
      }
    });

    // Handle ping/heartbeat
    socket.on('presence:ping', (documentId: string) => {
      try {
        if (documentPresence[documentId]) {
          if (socket.isGuest && socket.guestId) {
            const guestKey = `guest_${socket.guestId}`;
            if (documentPresence[documentId][guestKey]) {
              documentPresence[documentId][guestKey].lastPing = Date.now();
            }
          } else if (socket.userId) {
            if (documentPresence[documentId][socket.userId.toString()]) {
              documentPresence[documentId][socket.userId.toString()].lastPing = Date.now();
            }
          }
        }
      } catch (error) {
        console.error('Error handling ping:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Clean up presence for all documents this user was in
      if (socket.userId || (socket.isGuest && socket.guestId)) {
        Object.keys(documentPresence).forEach(documentId => {
          if (socket.isGuest && socket.guestId) {
            // Clean up guest presence
            const guestKey = `guest_${socket.guestId}`;
            if (documentPresence[documentId][guestKey]) {
              delete documentPresence[documentId][guestKey];

              // Broadcast guest left to all users in the document
              socket.to(`document:${documentId}`).emit('presence:update', {
                type: 'user_left',
                userId: socket.guestId,
                isGuest: true
              });
            }
          } else if (socket.userId) {
            // Clean up authenticated user presence
            if (documentPresence[documentId][socket.userId.toString()]) {
              delete documentPresence[documentId][socket.userId.toString()];

              // Broadcast user left to all users in the document
              socket.to(`document:${documentId}`).emit('presence:update', {
                type: 'user_left',
                userId: socket.userId,
                isGuest: false
              });
            }
          }
        });
      }
      
      // Stop cleanup interval if no more users
      const hasUsers = Object.values(documentPresence).some(doc => Object.keys(doc).length > 0);
      if (!hasUsers) {
        stopCleanupInterval();
      }
    });
  });
}
