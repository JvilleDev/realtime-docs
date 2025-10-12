import { Router } from 'express';
import type { Document, DocumentChange } from '../db/schema';
import type { Database } from 'bun:sqlite';

const router = Router();

export function createDocumentService(db: Database) {
  // Get all documents (for authenticated users)
  router.get('/', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = db.query(`
        SELECT user_id FROM sessions
        WHERE token = ? AND expires_at > datetime('now')
      `).get(token) as { user_id: number } | null;

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const documents = db.query(`
        SELECT d.*, u.display_name as owner_name, u.avatar_color as owner_color
        FROM documents d
        JOIN users u ON d.owner_id = u.id
        ORDER BY d.updated_at DESC
      `).all() as (Document & { owner_name: string; owner_color: string })[];

      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get published documents (for guests)
  router.get('/published', async (req, res) => {
    try {
      const documents = db.query(`
        SELECT d.*, u.display_name as owner_name, u.avatar_color as owner_color
        FROM documents d
        JOIN users u ON d.owner_id = u.id
        WHERE d.is_published = TRUE
        ORDER BY d.updated_at DESC
      `).all() as (Document & { owner_name: string; owner_color: string })[];

      res.json(documents);
    } catch (error) {
      console.error('Get published documents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single document
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      const isGuest = req.query.guest === 'true' || !token; // Treat as guest if no token

      // If no token, treat as guest automatically
      if (!token) {
        console.log(`📄 Accessing document ${id} as guest (no token provided)`);
      }

      const document = db.query(`
        SELECT d.*, u.display_name as owner_name, u.avatar_color as owner_color
        FROM documents d
        JOIN users u ON d.owner_id = u.id
        WHERE d.id = ?
      `).get(id) as (Document & { owner_name: string; owner_color: string }) | null;

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if guest can access published document
      if (isGuest && !document.is_published) {
        return res.status(403).json({ error: 'Document is not published' });
      }

      // If authenticated user, check if they have access (owner or document is published)
      if (!isGuest && token) {
        const session = db.query(`
          SELECT user_id FROM sessions
          WHERE token = ? AND expires_at > datetime('now')
        `).get(token!) as { user_id: number } | null;

        if (!session) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Allow access if user is owner OR document is published
        if (document.owner_id !== session.user_id && !document.is_published) {
          return res.status(403).json({ error: 'Access denied. Document is not published and you are not the owner.' });
        }
      }

      res.json(document);
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create document
  router.post('/', async (req, res) => {
    try {
      const { title, content } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = db.query(`
        SELECT user_id FROM sessions
        WHERE token = ? AND expires_at > datetime('now')
      `).get(token) as { user_id: number } | null;

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const docContent = content || '{"type":"doc","content":[]}';

      const result = db.exec(`
        INSERT INTO documents (title, content, owner_id)
        VALUES (?, ?, ?)
      `, [title, docContent, session.user_id]);

      const documentId = db.query('SELECT last_insert_rowid() as id').get() as { id: number };

      res.json({ id: documentId.id, message: 'Document created successfully' });
    } catch (error) {
      console.error('Create document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update document
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, is_published } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = db.query(`
        SELECT user_id FROM sessions
        WHERE token = ? AND expires_at > datetime('now')
      `).get(token) as { user_id: number } | null;

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const updates = [];
      const params = [];
      
      if (title !== undefined) {
        updates.push(`title = ?`);
        params.push(title);
      }
      if (content !== undefined) {
        updates.push(`content = ?`);
        params.push(content);
      }
      if (is_published !== undefined) {
        updates.push(`is_published = ?`);
        params.push(is_published ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      updates.push(`updated_at = datetime('now')`);
      params.push(id);

      db.exec(`
        UPDATE documents SET ${updates.join(', ')}
        WHERE id = ?
      `, params);

      res.json({ message: 'Document updated successfully' });
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete document
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = db.query(`
        SELECT user_id FROM sessions
        WHERE token = ? AND expires_at > datetime('now')
      `).get(token) as { user_id: number } | null;

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      db.exec(`DELETE FROM documents WHERE id = ?`, [id]);

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin: Reclaim document
  router.post('/:id/reclaim', async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = db.query(`
        SELECT u.is_admin FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `).get(token) as { is_admin: boolean } | null;

      if (!session || !session.is_admin) {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      const adminUserId = db.query(`
        SELECT s.user_id FROM sessions s
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `).get(token) as { user_id: number };

      db.exec(`
        UPDATE documents SET owner_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [adminUserId.user_id, id]);

      res.json({ message: 'Document reclaimed successfully' });
    } catch (error) {
      console.error('Reclaim document error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get document changes history
  router.get('/:id/changes', async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = db.query(`
        SELECT user_id FROM sessions
        WHERE token = ? AND expires_at > datetime('now')
      `).get(token) as { user_id: number } | null;

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const changes = db.query(`
        SELECT dc.*, u.display_name, u.avatar_color
        FROM document_changes dc
        JOIN users u ON dc.user_id = u.id
        WHERE dc.document_id = ?
        ORDER BY dc.timestamp DESC
        LIMIT 100
      `).all(id) as (DocumentChange & { display_name: string; avatar_color: string })[];

      res.json(changes);
    } catch (error) {
      console.error('Get document changes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export { router as documentRoutes };
