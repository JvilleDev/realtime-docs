# Realtime Docs Monorepo

A real-time collaborative document editing application built with Bun, TypeScript, Socket.IO, Nuxt 4, PrimeVue, and Tiptap.

## Features

- **Real-time Collaboration**: Multiple users can edit documents simultaneously with live cursor tracking
- **Guest Access**: Published documents can be viewed by guests in read-only mode
- **User Management**: Admin can create users and reclaim documents
- **Document Publishing**: Documents can be published for public access
- **Modern UI**: Clean, Notion-like interface built with PrimeVue
- **Persistent Storage**: SQLite database with Docker volume persistence

## Architecture

- **Backend**: Bun + TypeScript + Socket.IO + SQLite
- **Frontend**: Nuxt 4 + PrimeVue + Tiptap
- **Database**: SQLite with bun:sqlite
- **Real-time**: Socket.IO for WebSocket communication
- **Containerization**: Docker with docker-compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Using Docker (Recommended)

1. Clone the repository
2. Run the application:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

4. Default admin credentials:
   - Username: `admin`
   - Password: `admin123`

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend:
   ```bash
   npm run dev:backend
   ```

3. Start the frontend:
   ```bash
   npm run dev:frontend
   ```

## Project Structure

```
realtime-docs/
├── packages/
│   ├── backend/          # Bun + TypeScript + Socket.IO
│   │   ├── src/
│   │   │   ├── db/       # Database schema and initialization
│   │   │   ├── auth/     # Authentication service
│   │   │   ├── documents/# Document CRUD operations
│   │   │   ├── socket/   # Socket.IO event handlers
│   │   │   └── index.ts  # Main server file
│   │   └── Dockerfile
│   └── frontend/         # Nuxt 4 + PrimeVue + Tiptap
│       ├── pages/        # Application pages
│       ├── components/   # Vue components
│       ├── composables/ # Vue composables
│       ├── layouts/     # Layout components
│       └── Dockerfile
├── data/                # SQLite database storage
├── docker-compose.yml
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify session token
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/create-user` - Create new user (admin only)

### Documents
- `GET /api/documents` - Get user's documents
- `GET /api/documents/published` - Get published documents
- `GET /api/documents/:id` - Get single document
- `POST /api/documents` - Create document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/reclaim` - Reclaim document (admin only)

## Socket.IO Events

### Client to Server
- `document:join` - Join document editing session
- `document:leave` - Leave document
- `document:update` - Send document content updates
- `cursor:move` - Send cursor position updates
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

### Server to Client
- `presence:init` - Initialize user presence
- `presence:update` - User joined/left document
- `cursor:move` - Cursor position update
- `document:update` - Document content update
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

## Database Schema

### Users
- `id` - Primary key
- `username` - Unique username
- `password_hash` - Bcrypt hashed password
- `display_name` - User's display name
- `avatar_color` - Hex color for avatar
- `is_admin` - Admin flag
- `created_at` - Creation timestamp

### Documents
- `id` - Primary key
- `title` - Document title
- `content` - JSON content (Tiptap format)
- `owner_id` - Foreign key to users
- `is_published` - Published flag
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Document Changes
- `id` - Primary key
- `document_id` - Foreign key to documents
- `user_id` - Foreign key to users
- `change_data` - JSON change data
- `timestamp` - Change timestamp

### Sessions
- `id` - Primary key
- `user_id` - Foreign key to users
- `token` - Session token
- `expires_at` - Expiration timestamp

## Development

### Backend Development

The backend uses Bun with TypeScript. Key features:

- SQLite database with bun:sqlite
- Socket.IO for real-time communication
- Bcrypt for password hashing
- Express for REST API

### Frontend Development

The frontend uses Nuxt 4 with:

- PrimeVue for UI components
- Tiptap for rich text editing
- Socket.IO client for real-time features
- Vue 3 Composition API

### Adding New Features

1. Backend: Add routes in appropriate service files
2. Frontend: Add pages/components as needed
3. Socket.IO: Add event handlers for real-time features
4. Database: Update schema if needed

## Deployment

The application is containerized and ready for deployment:

1. **Docker Compose**: Use the provided docker-compose.yml
2. **Kubernetes**: Convert docker-compose to Kubernetes manifests
3. **Cloud Platforms**: Deploy containers to AWS ECS, Google Cloud Run, etc.

### Environment Variables

- `DATABASE_PATH` - Path to SQLite database file
- `PORT` - Backend server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- `BACKEND_URL` - Backend URL for frontend

## Security Considerations

- Passwords are hashed with bcrypt
- Session tokens are used for authentication
- CORS is configured for frontend-backend communication
- SQL injection protection through parameterized queries
- Input validation on all endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
