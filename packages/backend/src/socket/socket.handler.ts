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
    [userId: string]: CursorPosition;
  };
}

const documentPresence: DocumentPresence = {};
let guestCounter = 0;

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

        // Add user to presence (authenticated or guest)
        if (socket.isGuest && socket.guestId) {
          // Guest user
          const guestKey = `guest_${socket.guestId}`;
          documentPresence[documentId][guestKey] = {
            userId: socket.guestId,
            userInfo: {
              display_name: `Guest ${socket.guestId}`,
              avatar_color: '#6B7280'
            },
            position: { anchor: 0, head: 0 },
            timestamp: Date.now(),
            isGuest: true
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
            isGuest: false
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

    // Handle document content updates
    socket.on('document:update', (data: { documentId: string; content: any; changeData?: any }) => {
      try {
        const { documentId, content, changeData } = data;

        // Only authenticated users can update documents
        if (socket.isGuest || !socket.userId) {
          socket.emit('error', { message: 'Guests cannot edit documents' });
          return;
        }

        // Update document in database
        db.exec(`
          UPDATE documents 
          SET content = '${JSON.stringify(content)}', updated_at = datetime('now')
          WHERE id = ${documentId}
        `);

        // Log change if changeData provided
        if (changeData) {
          db.exec(`
            INSERT INTO document_changes (document_id, user_id, change_data)
            VALUES (${documentId}, ${socket.userId}, '${JSON.stringify(changeData)}')
          `);
        }

        // Broadcast update to all other users in the document
        socket.to(`document:${documentId}`).emit('document:update', {
          content,
          userId: socket.userId,
          userInfo: socket.userInfo,
          timestamp: Date.now()
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to update document' });
      }
    });

    // Handle cursor position updates
    socket.on('cursor:move', (data: { documentId: string; position: { anchor: number; head: number } }) => {
      try {
        const { documentId, position } = data;

        // Update presence with new cursor position
        if (documentPresence[documentId]) {
          if (socket.isGuest && socket.guestId) {
            // Guest cursor update
            const guestKey = `guest_${socket.guestId}`;
            documentPresence[documentId][guestKey] = {
              userId: socket.guestId,
              userInfo: {
                display_name: `Guest ${socket.guestId}`,
                avatar_color: '#6B7280'
              },
              position,
              timestamp: Date.now(),
              isGuest: true
            };

            // Broadcast guest cursor update to all other users in the document
            socket.to(`document:${documentId}`).emit('cursor:move', {
              userId: socket.guestId,
              userInfo: {
                display_name: `Guest ${socket.guestId}`,
                avatar_color: '#6B7280'
              },
              position,
              timestamp: Date.now(),
              isGuest: true
            });
          } else if (socket.userId && socket.userInfo) {
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
              isGuest: false
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
        }
      } catch (error) {
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
    });
  });
}
