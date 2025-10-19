import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { Database as SQLiteDatabase } from 'bun:sqlite'
import * as Y from 'yjs'

interface AuthenticatedContext {
  userId?: number
  userInfo?: {
    id: number
    username: string
    display_name: string
    avatar_color: string
    is_admin: boolean
  }
  isGuest?: boolean
  guestId?: number
}

let guestCounter = 0

export function createHocuspocusServer(db: SQLiteDatabase) {
  const server = new Server({
    name: 'realtime-docs-server',
    
    extensions: [
      new Database({
        fetch: async ({ documentName, context }) => {
          try {
            const documentId = parseInt(documentName)
            if (isNaN(documentId)) {
              return null
            }

            // Get document from database
            const document = db.query(`
              SELECT d.*, u.display_name as owner_name, u.avatar_color as owner_color
              FROM documents d
              JOIN users u ON d.owner_id = u.id
              WHERE d.id = ?
            `).get(documentId) as any

            if (!document) {
              return null
            }

            // Check access permissions
            const authContext = context as AuthenticatedContext
            if (authContext.isGuest && !document.is_published) {
              return null // Guest cannot access unpublished document
            }

            // If user is authenticated, check if they have access
            if (!authContext.isGuest && authContext.userId) {
              if (document.owner_id !== authContext.userId && !document.is_published) {
                return null // User cannot access unpublished document they don't own
              }
            }

            // Return existing Yjs state if available, otherwise convert from JSON
            if (document.yjs_state) {
              return document.yjs_state
            } else if (document.content) {
              // Convert TipTap JSON to Yjs document
              const ydoc = new Y.Doc()
              const ytext = ydoc.getText('content')
              
              // Convert TipTap JSON to plain text for now
              // This is a simplified conversion - in production you'd want more sophisticated conversion
              const content = JSON.parse(document.content)
              const plainText = extractPlainText(content)
              ytext.insert(0, plainText)
              
              return Y.encodeStateAsUpdate(ydoc)
            }

            return null
          } catch (error) {
            console.error('Error fetching document:', error)
            return null
          }
        },
        
        store: async ({ documentName, state, context }) => {
          try {
            const documentId = parseInt(documentName)
            if (isNaN(documentId)) {
              return
            }

            // Only authenticated users can store documents
            const authContext = context as AuthenticatedContext
            if (authContext.isGuest || !authContext.userId) {
              return
            }

            // Store Yjs state in database
            db.exec(`
              UPDATE documents 
              SET yjs_state = ?, updated_at = datetime('now')
              WHERE id = ?
            `, [state, documentId])

            // Also update the content field as backup
            const ydoc = new Y.Doc()
            Y.applyUpdate(ydoc, state)
            const ytext = ydoc.getText('content')
            const plainText = ytext.toString()
            
            // Convert plain text back to TipTap JSON format
            const tipTapContent = {
              type: 'doc',
              content: plainText ? [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: plainText
                    }
                  ]
                }
              ] : []
            }

            db.exec(`
              UPDATE documents 
              SET content = ?, updated_at = datetime('now')
              WHERE id = ?
            `, [JSON.stringify(tipTapContent), documentId])

          } catch (error) {
            console.error('Error storing document:', error)
          }
        }
      })
    ],

    async onAuthenticate({ connection, token, documentName }) {
      try {
        const authContext: AuthenticatedContext = {}

        // Check if this is a guest connection
        if (token === 'guest') {
          authContext.isGuest = true
          authContext.guestId = ++guestCounter
          return authContext
        }

        if (!token) {
          throw new Error('Authentication required')
        }

        // Validate session token
        const session = db.query(`
          SELECT s.user_id, u.username, u.display_name, u.avatar_color, u.is_admin
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token = ? AND s.expires_at > datetime('now')
        `).get(token) as {
          user_id: number
          username: string
          display_name: string
          avatar_color: string
          is_admin: boolean
        } | null

        if (!session) {
          throw new Error('Invalid or expired token')
        }

        authContext.userId = session.user_id
        authContext.userInfo = {
          id: session.user_id,
          username: session.username,
          display_name: session.display_name,
          avatar_color: session.avatar_color,
          is_admin: session.is_admin
        }
        authContext.isGuest = false

        return authContext
      } catch (error) {
        console.error('Authentication error:', error)
        throw error
      }
    },

    async onConnect({ connection, context }) {
      const authContext = context as AuthenticatedContext
      console.log(`🔌 User connected to document:`, {
        userId: authContext.userId,
        guestId: authContext.guestId,
        isGuest: authContext.isGuest,
        documentName: connection.documentName
      })
    },

    async onDisconnect({ connection, context }) {
      const authContext = context as AuthenticatedContext
      console.log(`🔌 User disconnected from document:`, {
        userId: authContext.userId,
        guestId: authContext.guestId,
        isGuest: authContext.isGuest,
        documentName: connection.documentName
      })
    },

    async onLoadDocument({ documentName, context }) {
      const authContext = context as AuthenticatedContext
      console.log(`📄 Loading document ${documentName} for user:`, {
        userId: authContext.userId,
        guestId: authContext.guestId,
        isGuest: authContext.isGuest
      })
    },

    async onStoreDocument({ documentName, context }) {
      const authContext = context as AuthenticatedContext
      console.log(`💾 Storing document ${documentName} for user:`, {
        userId: authContext.userId,
        guestId: authContext.guestId,
        isGuest: authContext.isGuest
      })
    }
  })

  return server
}

// Helper function to extract plain text from TipTap JSON
function extractPlainText(content: any): string {
  if (typeof content === 'string') {
    return content
  }
  
  if (content && typeof content === 'object') {
    if (content.type === 'text' && content.text) {
      return content.text
    }
    
    if (content.content && Array.isArray(content.content)) {
      return content.content.map(extractPlainText).join('')
    }
  }
  
  return ''
}
