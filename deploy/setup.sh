#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# EduPlatform — Production Server Setup Script
# Target: Ubuntu 22.04/24.04 VPS
# Domain: shukhratbekov.uz
# ═══════════════════════════════════════════════════════════════════════════════

DOMAIN="shukhratbekov.uz"
SUBDOMAINS="crm.${DOMAIN} lms.${DOMAIN} student.${DOMAIN} api.${DOMAIN}"
ALL_DOMAINS="${DOMAIN} ${SUBDOMAINS}"
APP_DIR="/opt/eduplatform"
EMAIL="${1:-admin@${DOMAIN}}"

echo "══════════════════════════════════════════════════"
echo "  EduPlatform Production Setup"
echo "  Domain: ${DOMAIN}"
echo "  Email:  ${EMAIL}"
echo "══════════════════════════════════════════════════"

# ── 1. System packages ─────────────────────────────────────────────────────────
echo ""
echo "▸ [1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    curl git ufw fail2ban \
    nginx certbot python3-certbot-nginx \
    apt-transport-https ca-certificates gnupg lsb-release

# ── 2. Docker ──────────────────────────────────────────────────────────────────
echo "▸ [2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker compose &> /dev/null; then
    apt-get install -y -qq docker-compose-plugin
fi

echo "  Docker $(docker --version | awk '{print $3}')"

# ── 3. Firewall ────────────────────────────────────────────────────────────────
echo "▸ [3/7] Configuring firewall..."
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo "  UFW: SSH + Nginx allowed"

# ── 4. Nginx config ───────────────────────────────────────────────────────────
echo "▸ [4/7] Configuring Nginx..."

# Copy configs
cp "${APP_DIR}/deploy/nginx/ssl-params.conf" /etc/nginx/ssl-params.conf

# Temporary HTTP-only config for certbot
cat > /etc/nginx/sites-available/eduplatform <<EOF
server {
    listen 80;
    server_name ${ALL_DOMAINS};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'EduPlatform setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/eduplatform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot

nginx -t && systemctl reload nginx
echo "  Nginx: HTTP config ready"

# ── 5. SSL Certificates ───────────────────────────────────────────────────────
echo "▸ [5/7] Obtaining SSL certificates..."

CERT_DOMAINS=""
for d in ${ALL_DOMAINS}; do
    CERT_DOMAINS="${CERT_DOMAINS} -d ${d}"
done

certbot certonly --webroot \
    -w /var/www/certbot \
    ${CERT_DOMAINS} \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    --force-renewal

# Now apply the full HTTPS config
cp "${APP_DIR}/deploy/nginx/nginx.conf" /etc/nginx/nginx.conf
nginx -t && systemctl reload nginx
echo "  SSL: Certificates installed"

# Auto-renewal cron
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -

# ── 6. Application setup ──────────────────────────────────────────────────────
echo "▸ [6/7] Setting up application..."

cd "${APP_DIR}/deploy"

# Check env files exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  WARNING: Created .env from example — edit with real passwords!"
fi
if [ ! -f .env.backend ]; then
    cp .env.backend.example .env.backend
    echo "  WARNING: Created .env.backend from example — edit with real passwords!"
fi

# ── 7. Build & Start ──────────────────────────────────────────────────────────
echo "▸ [7/7] Building and starting containers..."

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "  Waiting for services to start..."
sleep 10

# Run migrations
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

echo ""
echo "══════════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Website:  https://${DOMAIN}"
echo "  CRM:      https://crm.${DOMAIN}"
echo "  LMS:      https://lms.${DOMAIN}"
echo "  Student:  https://student.${DOMAIN}"
echo "  API:      https://api.${DOMAIN}/docs"
echo ""
echo "  IMPORTANT:"
echo "  1. Edit deploy/.env with real passwords"
echo "  2. Edit deploy/.env.backend with real passwords"
echo "  3. Re-run: docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "  DNS Records needed (A records → your VPS IP):"
echo "    ${DOMAIN}          → YOUR_VPS_IP"
echo "    crm.${DOMAIN}      → YOUR_VPS_IP"
echo "    lms.${DOMAIN}      → YOUR_VPS_IP"
echo "    student.${DOMAIN}  → YOUR_VPS_IP"
echo "    api.${DOMAIN}      → YOUR_VPS_IP"
echo "══════════════════════════════════════════════════"
