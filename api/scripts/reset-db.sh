#!/bin/bash

# Database Reset Script
# This script tears down and rebuilds the database from scratch

set -e  # Exit on any error

echo "🔄 Resetting database..."

# Navigate to database directory
cd "$(dirname "$0")/../database"

# Stop and remove containers, volumes
echo "📦 Stopping and removing containers..."
docker compose down -v

# Start containers
echo "🚀 Starting containers..."
docker compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to initialize..."
sleep 1

# Return to api directory
cd ..

# Run migrations
echo "🔧 Running migrations..."
npm run db:migrate

# Run seed
echo "🌱 Seeding database..."
npm run db:seed

echo "✅ Database reset complete!"
