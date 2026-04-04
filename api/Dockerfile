FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy source
COPY . .

# Expose API port
EXPOSE 4000

# Start via tsx (same as local dev, avoids a build step for simulation purposes)
CMD ["npx", "tsx", "src/index.ts"]
