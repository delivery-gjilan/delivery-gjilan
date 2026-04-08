#!/bin/bash
# ZippGo Production Server Setup Script
# Run once on a fresh Ubuntu 24.04 Hetzner CCX13 server as root
set -e

echo "=== ZippGo Production Server Setup ==="
echo ""

# 1. System update
echo "[1/8] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install Docker
echo "[2/8] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 3. Create directory structure
echo "[3/8] Creating directory structure..."
mkdir -p /opt/zippgo/api
mkdir -p /opt/zippgo/observability
mkdir -p /opt/zippgo/backups

# 4. Skipped (GitHub CLI not needed)
echo "[4/8] Skipped."

# 5. Create swap file
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

# 6. Automatic security updates
echo "[6/8] Enabling automatic security updates..."
apt-get install -y -qq unattended-upgrades

# 7. Harden SSH
echo "[7/8] Hardening SSH (disable password auth)..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd

# 8. Daily DB backup cron
echo "[8/8] Setting up daily database backup..."
cat > /opt/zippgo/backup.sh << 'BACKUP'
#!/bin/bash
set -e
BACKUP_DIR="/opt/zippgo/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-$DATE.sql.gz"
KEEP_DAYS=7
source /opt/zippgo/api/.env.prod
docker exec zippgo-db pg_dump -U "${DB_USER:-zippgo}" "${DB_NAME:-zippgo}" | gzip > "$BACKUP_FILE"
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "Backup completed: $BACKUP_FILE"
BACKUP

chmod +x /opt/zippgo/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/zippgo/backup.sh >> /opt/zippgo/backups/backup.log 2>&1") | crontab -

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next: copy config files to the server, create .env.prod, then deploy."