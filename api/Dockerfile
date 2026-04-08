FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --ignore-scripts

COPY . .
RUN npm run build
RUN npx esbuild database/migrate.ts --bundle --platform=node --outfile=dist/migrate.js --packages=external

# ── Production image ──────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database/migrations ./database/migrations

# Logs directory for Promtail (Pino writes here in production)
RUN mkdir -p /app/logs

EXPOSE 4000

CMD ["node", "dist/index.js"]
