import { Database } from 'bun:sqlite';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_color: string;
  is_admin: boolean;
  created_at: string;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  owner_id: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentChange {
  id: number;
  document_id: number;
  user_id: number;
  change_data: string; // JSON string
  timestamp: string;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
}

export function initDatabase(): Database {
  const dbPath = process.env.DATABASE_PATH || '/Users/johann/Development/realtime-docs/data/realtime-docs.db';
  
  // Ensure the directory exists
  const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  try {
    Bun.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
  
  const db = new Database(dbPath, { create: true });

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#3B82F6',
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
      owner_id INTEGER NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS document_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      change_data TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
    CREATE INDEX IF NOT EXISTS idx_documents_published ON documents(is_published);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Initialize admin user if no users exist
  const userCount = db.query('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const adminPassword = 'admin123'; // Default admin password
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    db.exec(`
      INSERT INTO users (username, password_hash, display_name, avatar_color, is_admin)
      VALUES ('admin', '${hashedPassword}', 'Administrator', '#EF4444', TRUE)
    `);
    
    console.log('🔐 Admin user created:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Please change the password after first login!');
  }

  return db;
}
