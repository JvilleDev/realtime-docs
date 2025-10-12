import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Database, User, Session } from '../db/schema';

const router = Router();

export function createAuthService(db: Database) {
  // Login endpoint
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.query('SELECT * FROM users WHERE username = ?').get(username) as User | null;
      
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create session
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      db.exec(`
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (${user.id}, '${token}', '${expiresAt.toISOString()}')
      `);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_color: user.avatar_color,
          is_admin: user.is_admin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  router.post('/logout', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (token) {
        db.exec(`DELETE FROM sessions WHERE token = '${token}'`);
      }
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify session endpoint
  router.get('/verify', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const session = db.query(`
        SELECT s.*, u.username, u.display_name, u.avatar_color, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `).get(token) as (Session & User) | null;

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      res.json({
        user: {
          id: session.user_id,
          username: session.username,
          display_name: session.display_name,
          avatar_color: session.avatar_color,
          is_admin: session.is_admin
        }
      });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create user endpoint (admin only)
  router.post('/create-user', async (req, res) => {
    try {
      const { username, password, display_name, avatar_color } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify admin session
      const session = db.query(`
        SELECT u.is_admin FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `).get(token) as { is_admin: boolean } | null;

      if (!session || !session.is_admin) {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      if (!username || !password || !display_name) {
        return res.status(400).json({ error: 'Username, password, and display name are required' });
      }

      // Check if username already exists
      const existingUser = db.query('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const color = avatar_color || '#3B82F6';

      db.exec(`
        INSERT INTO users (username, password_hash, display_name, avatar_color)
        VALUES ('${username}', '${hashedPassword}', '${display_name}', '${color}')
      `);

      res.json({ message: 'User created successfully' });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user profile
  router.put('/profile', async (req, res) => {
    try {
      const { display_name, avatar_color } = req.body;
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
      if (display_name) updates.push(`display_name = '${display_name}'`);
      if (avatar_color) updates.push(`avatar_color = '${avatar_color}'`);

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      db.exec(`
        UPDATE users SET ${updates.join(', ')}
        WHERE id = ${session.user_id}
      `);

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export { router as authRoutes };
