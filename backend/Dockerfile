# Production Dockerfile for Isaiyon Backend on Render
FROM node:22-bookworm-slim

# Install system dependencies: FFmpeg, Python3, and curl for yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the latest standalone yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify installed binaries
RUN yt-dlp --version && ffmpeg -version

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source code
COPY . .

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

# Health check matching Render settings
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/status || exit 1

CMD ["npm", "start"]
