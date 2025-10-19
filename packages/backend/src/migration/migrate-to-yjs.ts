import { Database } from 'bun:sqlite'
import * as Y from 'yjs'
import { initDatabase } from '../db/schema'

// Helper function to convert TipTap JSON to Yjs document
function convertTipTapToYjs(tipTapContent: any): Uint8Array {
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('content')
  
  if (!tipTapContent || !tipTapContent.content) {
    return Y.encodeStateAsUpdate(ydoc)
  }
  
  // Convert TipTap JSON structure to plain text
  const plainText = extractPlainText(tipTapContent)
  ytext.insert(0, plainText)
  
  return Y.encodeStateAsUpdate(ydoc)
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

// Helper function to convert Yjs document back to TipTap JSON
function convertYjsToTipTap(yjsState: Uint8Array): any {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, yjsState)
  const ytext = ydoc.getText('content')
  const plainText = ytext.toString()
  
  // Convert plain text back to TipTap JSON format
  return {
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
}

export async function migrateDocumentsToYjs() {
  console.log('🔄 Starting document migration to Yjs...')
  
  const db = initDatabase()
  
  try {
    // First, add yjs_state column if it doesn't exist
    try {
      db.exec(`
        ALTER TABLE documents ADD COLUMN yjs_state BLOB
      `)
      console.log('✅ Added yjs_state column to documents table')
    } catch (error) {
      // Column might already exist
      console.log('ℹ️ yjs_state column already exists or error adding it:', error)
    }
    
    // Get all documents that don't have yjs_state yet
    const documents = db.query(`
      SELECT id, title, content, yjs_state
      FROM documents
      WHERE yjs_state IS NULL OR yjs_state = ''
    `).all() as Array<{
      id: number
      title: string
      content: string
      yjs_state: Uint8Array | null
    }>
    
    console.log(`📄 Found ${documents.length} documents to migrate`)
    
    let migrated = 0
    let errors = 0
    
    for (const doc of documents) {
      try {
        let tipTapContent
        
        // Parse the content
        if (doc.content) {
          try {
            tipTapContent = JSON.parse(doc.content)
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse JSON for document ${doc.id}:`, parseError)
            // Create a simple document with the raw content
            tipTapContent = {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: doc.content
                    }
                  ]
                }
              ]
            }
          }
        } else {
          // Empty document
          tipTapContent = {
            type: 'doc',
            content: []
          }
        }
        
        // Convert to Yjs
        const yjsState = convertTipTapToYjs(tipTapContent)
        
        // Update the document with Yjs state
        db.exec(`
          UPDATE documents 
          SET yjs_state = ?, updated_at = datetime('now')
          WHERE id = ?
        `, [yjsState, doc.id])
        
        migrated++
        console.log(`✅ Migrated document ${doc.id}: "${doc.title}"`)
        
      } catch (error) {
        errors++
        console.error(`❌ Error migrating document ${doc.id}:`, error)
      }
    }
    
    console.log(`🎉 Migration completed!`)
    console.log(`   ✅ Migrated: ${migrated} documents`)
    console.log(`   ❌ Errors: ${errors} documents`)
    
    // Verify migration by checking a few documents
    console.log('\n🔍 Verifying migration...')
    const sampleDocs = db.query(`
      SELECT id, title, yjs_state
      FROM documents
      WHERE yjs_state IS NOT NULL
      LIMIT 3
    `).all() as Array<{
      id: number
      title: string
      yjs_state: Uint8Array
    }>
    
    for (const doc of sampleDocs) {
      try {
        const convertedBack = convertYjsToTipTap(doc.yjs_state)
        console.log(`✅ Document ${doc.id} ("${doc.title}") verification successful`)
        console.log(`   Content preview: ${JSON.stringify(convertedBack).substring(0, 100)}...`)
      } catch (error) {
        console.error(`❌ Verification failed for document ${doc.id}:`, error)
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration if this file is executed directly
if (import.meta.main) {
  migrateDocumentsToYjs()
    .then(() => {
      console.log('✅ Migration script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error)
      process.exit(1)
    })
}
