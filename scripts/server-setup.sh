#!/bin/bash
# ZippGo Production Server Setup Script
# Run once on a fresh Ubuntu 24.04 Hetzner CCX13 server as root
#
# Usage:
#   ssh root@YOUR_SERVER_IP
#   curl -fsSL https://raw.githubusercontent.com/delivery-gjilan/delivery-gjilan/main/scripts/server-setup.sh | bash
#
# Or copy this file to the server and run:
#   bash server-setup.sh

set -e

echo "=== ZippGo Production Server Setup ==="
echo ""

# ── 1. System update ─────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ────────────────────────────────────────
echo "[2/8] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Add a non-root deploy user (optional but good practice)
# useradd -m -s /bin/bash deploy
# usermod -aG docker deploy

# ── 3. Create directory structure ────────────────────────────
echo "[3/8] Creating directory structure..."
mkdir -p /opt/zippgo/{api,observability,backups}
cd /opt/zippgo

# ── 4. Install GitHub CLI for pulling from GHCR ─────────────
echo "[4/8] Installing GitHub CLI..."
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt-get update -qq && apt-get install gh -y -qq

# ── 5. Create swap file (safety net for OOM) ─────────────────
echo "[5/8] Creating 2GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap created."
else
    echo "Swap already exists, skipping."
fi

# ── 6. Set up automatic security updates ─────────────────────
echo "[6/8] Enabling automatic security updates..."
apt-get install -y -qq unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

# ── 7. Harden SSH ────────────────────────────────────────────
echo "[7/8] Hardening SSH (disable password auth)..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd

# ── 8. Set up daily DB backup cron ───────────────────────────
echo "[8/8] Setting up daily database backup..."
cat > /opt/zippgo/backup.sh << 'BACKUP'
#!/bin/bash
# Daily Postgres backup — runs via cron
set -e

BACKUP_DIR="/opt/zippgo/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-$DATE.sql.gz"
KEEP_DAYS=7

# Source env to get DB credentials
source /opt/zippgo/api/.env.prod

# Dump
docker exec zippgo-db pg_dump -U "${DB_USER:-zippgo}" "${DB_NAME:-zippgo}" | gzip > "$BACKUP_FILE"

# Delete backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
BACKUP

chmod +x /opt/zippgo/backup.sh

# Add to cron — runs at 2am daily
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/zippgo/backup.sh >> /opt/zippgo/backups/backup.log 2>&1") | crontab -

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Copy your config files to the server:"
echo "   scp api/docker-compose.prod.yml root@YOUR_IP:/opt/zippgo/api/"
echo "   scp api/Caddyfile root@YOUR_IP:/opt/zippgo/api/"
echo "   scp -r observability/ root@YOUR_IP:/opt/zippgo/"
echo ""
echo "2. Create your .env.prod file on the server:"
echo "   nano /opt/zippgo/api/.env.prod"
echo "   (see .env.example for required variables)"
echo ""
echo "3. Log in to GitHub Container Registry:"
echo "   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin"
echo ""
echo "4. Pull and start:"
echo "   cd /opt/zippgo/api"
echo "   IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Run migrations:"
echo "   docker compose -f docker-compose.prod.yml exec api node dist/migrate.js"
echo ""
echo "6. Start observability stack:"
echo "   cd /opt/zippgo/observability"
echo "   docker compose up -d"
echo ""
echo "7. Update Caddyfile with your real domain then reload:"
echo "   docker compose -f /opt/zippgo/api/docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile"
