interface DocumentPresence {
  [documentId: string]: {
    [userId: string]: {
      userId: string;
      userInfo: {
        display_name: string;
        avatar_color: string;
        isGuest?: boolean;
      };
      position: {
        anchor: number;
        head: number;
      };
      timestamp: number;
    };
  };
}

interface CursorPosition {
  userId: string;
  userInfo: {
    display_name: string;
    avatar_color: string;
    isGuest?: boolean;
  };
  position: {
    anchor: number;
    head: number;
  };
  timestamp: number;
}

const documentPresence: DocumentPresence = {};
const connectedPeers = new Map<string, any>();
let guestCounter = 0;

export default defineWebSocketHandler({
  open(peer) {
    connectedPeers.set(peer.id, peer);
    
    // Send welcome message
    try {
      peer.send(JSON.stringify({
        type: 'connected',
        peerId: peer.id,
        timestamp: Date.now()
      }));
    } catch (error) {
    }
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text());

      switch (data.type) {
        case 'document:join':
          handleDocumentJoin(peer, data);
          break;
        case 'document:leave':
          handleDocumentLeave(peer, data);
          break;
        case 'document:update':
          handleDocumentUpdate(peer, data);
          break;
        case 'cursor:move':
          handleCursorMove(peer, data);
          break;
        case 'typing:start':
          handleTypingStart(peer, data);
          break;
        case 'typing:stop':
          handleTypingStop(peer, data);
          break;
        default:
      }
    } catch (error) {
      peer.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  },

  close(peer, event) {
    connectedPeers.delete(peer.id);
    
    // Clean up presence for all documents this peer was in
    Object.keys(documentPresence).forEach(documentId => {
      if (documentPresence[documentId][peer.id]) {
        const userInfo = documentPresence[documentId][peer.id].userInfo;
        delete documentPresence[documentId][peer.id];
        
        // Broadcast user left to all other peers in the document
        broadcastToDocument(documentId, {
          type: 'presence:update',
          data: {
            type: 'user_left',
            userId: peer.id,
            isGuest: userInfo?.isGuest || false
          }
        }, peer.id);
      }
    });
  },

  error(peer, error) {
  },
});

function handleDocumentJoin(peer: any, data: any) {
  const { documentId, userInfo } = data;
  
  try {
    // Initialize presence for this document if not exists
    if (!documentPresence[documentId]) {
      documentPresence[documentId] = {};
    }

    // Determine if this is a guest and assign appropriate info
    let finalUserInfo;
    if (userInfo?.isGuest) {
      const guestNumber = ++guestCounter;
      finalUserInfo = {
        display_name: `Guest ${guestNumber}`,
        avatar_color: '#6B7280',
        isGuest: true
      };
    } else {
      finalUserInfo = userInfo || {
        display_name: `User ${peer.id.substring(0, 8)}`,
        avatar_color: generateAvatarColor(peer.id),
        isGuest: false
      };
    }

    // Add user to presence
    documentPresence[documentId][peer.id] = {
      userId: peer.id,
      userInfo: finalUserInfo,
      position: { anchor: 0, head: 0 },
      timestamp: Date.now()
    };

    // Send current presence to the joining peer
    peer.send(JSON.stringify({
      type: 'presence:init',
      data: documentPresence[documentId]
    }));

    // Broadcast user joined to all other peers in the document
    broadcastToDocument(documentId, {
      type: 'presence:update',
      data: {
        type: 'user_joined',
        userId: peer.id,
        userInfo: finalUserInfo,
        isGuest: finalUserInfo.isGuest
      }
    }, peer.id);

  } catch (error) {
    peer.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join document'
    }));
  }
}

function handleDocumentLeave(peer: any, data: any) {
  const { documentId } = data;
  
  try {
    // Remove from presence if exists
    if (documentPresence[documentId] && documentPresence[documentId][peer.id]) {
      const userInfo = documentPresence[documentId][peer.id].userInfo;
      delete documentPresence[documentId][peer.id];

      // Broadcast user left to all other peers in the document
      broadcastToDocument(documentId, {
        type: 'presence:update',
        data: {
          type: 'user_left',
          userId: peer.id,
          isGuest: userInfo?.isGuest || false
        }
      }, peer.id);
    }

  } catch (error) {
  }
}

function handleDocumentUpdate(peer: any, data: any) {
  const { documentId, content, changeData } = data;
  
  try {
    // Broadcast update to all other peers in the document with different event name
    broadcastToDocument(documentId, {
      type: 'document:remote-update', // Different event name for remote updates
      data: {
        content,
        userId: peer.id,
        userInfo: documentPresence[documentId]?.[peer.id]?.userInfo,
        timestamp: Date.now(),
        changeData
      }
    }, peer.id);

  } catch (error) {
    peer.send(JSON.stringify({
      type: 'error',
      message: 'Failed to update document'
    }));
  }
}

function handleCursorMove(peer: any, data: any) {
  const { documentId, position } = data;
  
  try {
    // Update presence with new cursor position
    if (documentPresence[documentId] && documentPresence[documentId][peer.id]) {
      documentPresence[documentId][peer.id].position = position;
      documentPresence[documentId][peer.id].timestamp = Date.now();

      // Broadcast cursor update to all other peers in the document
      broadcastToDocument(documentId, {
        type: 'cursor:move',
        data: {
          userId: peer.id,
          userInfo: documentPresence[documentId][peer.id].userInfo,
          position,
          timestamp: Date.now(),
          isGuest: documentPresence[documentId][peer.id].userInfo?.isGuest || false
        }
      }, peer.id);
    }
  } catch (error) {
  }
}

function handleTypingStart(peer: any, data: any) {
  const { documentId } = data;
  
  if (documentPresence[documentId]?.[peer.id]) {
    broadcastToDocument(documentId, {
      type: 'typing:start',
      data: {
        userId: peer.id,
        userInfo: documentPresence[documentId][peer.id].userInfo
      }
    }, peer.id);
  }
}

function handleTypingStop(peer: any, data: any) {
  const { documentId } = data;
  
  if (documentPresence[documentId]?.[peer.id]) {
    broadcastToDocument(documentId, {
      type: 'typing:stop',
      data: {
        userId: peer.id,
        userInfo: documentPresence[documentId][peer.id].userInfo
      }
    }, peer.id);
  }
}

function broadcastToDocument(documentId: string, message: any, excludePeerId?: string) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  let errorCount = 0;
  
  connectedPeers.forEach((peer, peerId) => {
    if (peerId !== excludePeerId && 
        documentPresence[documentId] && 
        documentPresence[documentId][peerId]) {
      try {
        peer.send(messageStr);
        sentCount++;
      } catch (error) {
        errorCount++;
        
        // Remove the peer from presence if sending fails
        if (documentPresence[documentId][peerId]) {
          delete documentPresence[documentId][peerId];
        }
      }
    }
  });
  
  if (sentCount > 0 || errorCount > 0) {
  }
}

function generateAvatarColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
