FROM oven/bun:1-slim
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Start the application directly with Bun (no build step needed)
CMD ["bun", "run", "src/index.ts"]