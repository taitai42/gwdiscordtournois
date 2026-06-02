# Official Node.js LTS image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install production dependencies from the lockfile for reproducible builds.
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

# Run as a dedicated non-root user.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "index.js"]
