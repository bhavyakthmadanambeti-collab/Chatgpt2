# Multi-stage Dockerfile for ChatGPT Pro
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source files
COPY . .

# Build frontend production bundle
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm install --only=production && npm install -g tsx

COPY --from=base /app/dist ./dist
COPY --from=base /app/server ./server
COPY --from=base /app/server.ts ./server.ts
COPY --from=base /app/index.html ./index.html

# Data & Uploads persistence volumes
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000

CMD ["tsx", "server.ts"]
