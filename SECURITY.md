# Security and Sensitive Files Guide

## Files that should NEVER be committed to Git:

### Environment Variables
- `.env` - Contains sensitive environment variables
- `.env.local` - Local environment overrides
- `.env.development.local` - Development-specific variables
- `.env.production.local` - Production-specific variables
- `.env.test.local` - Test-specific variables

### Database Files
- `*.db` - SQLite database files
- `*.sqlite` - SQLite database files
- `*.sqlite3` - SQLite database files
- `data/` - Directory containing database files

### Authentication & Security
- `*.pem` - Private keys
- `*.key` - Private keys
- `*.crt` - Certificates
- `secrets/` - Directory containing secrets
- `JWT_SECRET` - JWT signing secrets
- `API_KEYS` - API keys and tokens

### Build Artifacts
- `node_modules/` - Dependencies (use package managers)
- `dist/` - Build output
- `.nuxt/` - Nuxt.js build cache
- `.output/` - Nuxt.js output
- `build/` - Build artifacts

### Logs and Temporary Files
- `*.log` - Log files
- `logs/` - Log directories
- `tmp/` - Temporary files
- `temp/` - Temporary files
- `*.pid` - Process ID files

### IDE and OS Files
- `.vscode/` - VS Code settings (unless shared)
- `.idea/` - IntelliJ/WebStorm settings
- `.DS_Store` - macOS system files
- `Thumbs.db` - Windows system files

### Cache and Dependencies
- `.cache/` - Cache directories
- `coverage/` - Test coverage reports
- `*.tsbuildinfo` - TypeScript build info

## What TO commit:

### Configuration Templates
- `env.example` - Environment variable template
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `nuxt.config.ts` - Nuxt.js configuration
- `docker-compose.yml` - Docker configuration

### Source Code
- `src/` - Source code
- `app/` - Application code
- `components/` - Vue components
- `composables/` - Vue composables
- `pages/` - Nuxt pages

### Documentation
- `README.md` - Project documentation
- `docs/` - Documentation files
- `*.md` - Markdown files

### Scripts
- `dev.sh` - Development scripts
- `Dockerfile` - Docker build instructions

## Security Best Practices:

1. **Never commit real credentials** - Use environment variables
2. **Use `.env.example`** - Provide template for required variables
3. **Rotate secrets regularly** - Change passwords and API keys
4. **Use different environments** - Separate dev/staging/production configs
5. **Review commits** - Check what you're committing before pushing
6. **Use git hooks** - Prevent accidental commits of sensitive files

## If you accidentally commit sensitive data:

1. **Immediately rotate/change** the exposed credentials
2. **Remove from git history** using `git filter-branch` or BFG Repo-Cleaner
3. **Force push** to update remote repository
4. **Notify team members** to pull the updated history
