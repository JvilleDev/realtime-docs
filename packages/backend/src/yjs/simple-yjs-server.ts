import * as Y from 'yjs'
import { WebSocketServer, WebSocket } from 'ws'
import { Database } from 'bun:sqlite'

// Store Y.Doc instances per document
const documentInstances = new Map<string, Y.Doc>()
const connectedClients = new Map<string, WebSocket>()

// Yjs WebSocket Protocol Message Types
const MESSAGE_SYNC = 0
const MESSAGE_SYNC_REPLY = 1
const MESSAGE_AWARENESS = 2
const MESSAGE_AWARENESS_QUERY = 3

export function createSimpleYjsServer(server: any, db: Database) {
  const wss = new WebSocketServer({ 
    server,
    path: '/yjs'
  })

  console.log('🔌 Simple Yjs WebSocket server created')

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = generateClientId()
    console.log('🔌 Client connected:', clientId)
    
    // Extract documentId from URL path
    const url = new URL(req.url!, `http://${req.headers.host}`)
    const pathParts = url.pathname.split('/')
    const documentId = pathParts[pathParts.length - 1] // Get last part of path
    
    console.log('📄 Document ID from URL:', documentId)
    
    connectedClients.set(clientId, ws)
    ;(ws as any).clientId = clientId
    ;(ws as any).currentDocumentId = documentId

    // Send initial sync immediately
    const ydoc = getOrCreateDocument(documentId)
    const stateVector = Y.encodeStateVector(ydoc)
    const update = Y.encodeStateAsUpdate(ydoc, stateVector)
    
    if (update.length > 0) {
      const syncMessage = new Uint8Array(1 + update.length)
      syncMessage[0] = MESSAGE_SYNC_REPLY
      syncMessage.set(update, 1)
      ws.send(syncMessage)
      console.log('📤 Sent initial sync for document:', documentId)
    }

    ws.on('message', (data: Buffer) => {
      try {
        if (data.length === 0) return

        // Handle binary Yjs protocol messages
        const messageType = data[0]
        const documentId = (ws as any).currentDocumentId
        
        if (!documentId) {
          console.warn('⚠️ No document ID set for client:', clientId)
          return
        }

        const ydoc = getOrCreateDocument(documentId)
        
        switch (messageType) {
          case MESSAGE_SYNC:
            handleSyncMessage(ws, ydoc, data.slice(1))
            break
          case MESSAGE_SYNC_REPLY:
            // Client handles this
            break
          case MESSAGE_AWARENESS:
            handleAwarenessMessage(ws, documentId, data.slice(1))
            break
          case MESSAGE_AWARENESS_QUERY:
            handleAwarenessQueryMessage(ws, documentId)
            break
          default:
            // Regular update
            handleUpdateMessage(ws, ydoc, data)
            break
        }
      } catch (error) {
        console.error('❌ Error handling message:', error)
      }
    })

    ws.on('close', () => {
      const clientId = (ws as any).clientId
      console.log('🔌 Client disconnected:', clientId)
      connectedClients.delete(clientId)
      cleanupEmptyDocuments()
    })

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error)
    })
  })

  return wss
}


function handleSyncMessage(ws: WebSocket, ydoc: Y.Doc, data: Buffer) {
  try {
    if (data.length === 0) {
      // Initial sync request
      const stateVector = Y.encodeStateVector(ydoc)
      const update = Y.encodeStateAsUpdate(ydoc, stateVector)
      
      const reply = new Uint8Array(1 + update.length)
      reply[0] = MESSAGE_SYNC_REPLY
      reply.set(update, 1)
      
      ws.send(reply)
      console.log('📤 Sent sync reply')
    } else {
      // State vector received
      const stateVector = data
      const update = Y.encodeStateAsUpdate(ydoc, stateVector)
      
      if (update.length > 0) {
        const reply = new Uint8Array(1 + update.length)
        reply[0] = MESSAGE_SYNC_REPLY
        reply.set(update, 1)
        ws.send(reply)
        console.log('📤 Sent missing updates')
      }
    }
  } catch (error) {
    console.error('❌ Error in sync:', error)
  }
}

function handleAwarenessMessage(ws: WebSocket, documentId: string, data: Buffer) {
  try {
    const awarenessData = JSON.parse(new TextDecoder().decode(data))
    
    // Broadcast to other clients
    broadcastAwareness(documentId, awarenessData, (ws as any).clientId)
  } catch (error) {
    console.error('❌ Error handling awareness:', error)
  }
}

function handleAwarenessQueryMessage(ws: WebSocket, documentId: string) {
  // Send empty awareness for now
  const awarenessData = []
  const message = new Uint8Array(1 + new TextEncoder().encode(JSON.stringify(awarenessData)).length)
  message[0] = MESSAGE_AWARENESS
  message.set(new TextEncoder().encode(JSON.stringify(awarenessData)), 1)
  ws.send(message)
}

function handleUpdateMessage(ws: WebSocket, ydoc: Y.Doc, data: Buffer) {
  try {
    // Apply update to Y.Doc
    Y.applyUpdate(ydoc, data)
    
    // Broadcast to other clients
    broadcastToDocument((ws as any).currentDocumentId, data, (ws as any).clientId)
    
    console.log('📝 Applied update and broadcasted')
  } catch (error) {
    console.error('❌ Error handling update:', error)
  }
}

function getOrCreateDocument(documentId: string): Y.Doc {
  if (!documentInstances.has(documentId)) {
    const ydoc = new Y.Doc()
    documentInstances.set(documentId, ydoc)
    console.log('📄 Created new document:', documentId)
  }
  return documentInstances.get(documentId)!
}

function broadcastToDocument(documentId: string, data: Buffer, excludeClientId?: string) {
  let sentCount = 0
  
  connectedClients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && (client as any).currentDocumentId === documentId) {
      try {
        client.send(data)
        sentCount++
      } catch (error) {
        console.error('❌ Error broadcasting:', error)
      }
    }
  })
  
  if (sentCount > 0) {
    console.log('📡 Broadcasted to', sentCount, 'clients')
  }
}

function broadcastAwareness(documentId: string, awarenessData: any, excludeClientId?: string) {
  const message = new Uint8Array(1 + new TextEncoder().encode(JSON.stringify(awarenessData)).length)
  message[0] = MESSAGE_AWARENESS
  message.set(new TextEncoder().encode(JSON.stringify(awarenessData)), 1)
  
  connectedClients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && (client as any).currentDocumentId === documentId) {
      try {
        client.send(message)
      } catch (error) {
        console.error('❌ Error broadcasting awareness:', error)
      }
    }
  })
}

function cleanupEmptyDocuments() {
  for (const [documentId, ydoc] of documentInstances.entries()) {
    let hasClients = false
    
    connectedClients.forEach(client => {
      if ((client as any).currentDocumentId === documentId) {
        hasClients = true
      }
    })
    
    if (!hasClients) {
      documentInstances.delete(documentId)
      console.log('🗑️ Cleaned up document:', documentId)
    }
  }
}

function generateClientId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
