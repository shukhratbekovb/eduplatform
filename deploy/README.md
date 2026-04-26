# EduPlatform — Production Deployment

## Architecture

```
Internet
    │
    ▼
┌──────────┐     ┌──────────────────────────────────────────────────┐
│  Nginx   │────▸│  Docker Containers                               │
│ (SSL +   │     │                                                  │
│  Proxy)  │     │  ┌─────────┐  ┌─────────┐  ┌──────────┐        │
│          │     │  │ Website │  │   CRM   │  │ Logbook  │        │
│ :80/:443 │     │  │  :3003  │  │  :3000  │  │  :3001   │        │
│          │     │  └─────────┘  └─────────┘  └──────────┘        │
│          │     │  ┌─────────┐  ┌─────────┐                      │
│          │     │  │ Student │  │   API   │──▸ PostgreSQL         │
│          │     │  │  :3002  │  │  :8000  │──▸ Redis              │
│          │     │  └─────────┘  └─────────┘──▸ RabbitMQ           │
│          │     │               ┌─────────┐──▸ MinIO              │
│          │     │               │ Worker  │                      │
│          │     │               │ + Beat  │                      │
│          │     │               └─────────┘                      │
│          │     └──────────────────────────────────────────────────┘
└──────────┘
```

## Domains

| Subdomain | Service | Port |
|-----------|---------|------|
| `shukhratbekov.uz` | Website (Landing) | 3003 |
| `crm.shukhratbekov.uz` | CRM | 3000 |
| `lms.shukhratbekov.uz` | Logbook (LMS) | 3001 |
| `student.shukhratbekov.uz` | Student Portal | 3002 |
| `api.shukhratbekov.uz` | Backend API | 8000 |

## Prerequisites

- Ubuntu 22.04 or 24.04 VPS (2+ GB RAM, 2+ CPU cores recommended)
- Domain `shukhratbekov.uz` with DNS A records pointing to VPS IP
- SSH access as root

## DNS Setup

Add these A records at your DNS provider:

```
shukhratbekov.uz          → YOUR_VPS_IP
crm.shukhratbekov.uz      → YOUR_VPS_IP
lms.shukhratbekov.uz      → YOUR_VPS_IP
student.shukhratbekov.uz   → YOUR_VPS_IP
api.shukhratbekov.uz       → YOUR_VPS_IP
```

Wait for DNS propagation (5-30 minutes).

## Deployment Steps

### 1. Clone the project on VPS

```bash
ssh root@YOUR_VPS_IP
cd /opt
git clone https://github.com/YOUR_REPO/eduplatform.git
cd eduplatform
```

### 2. Configure environment variables

```bash
cd deploy

# Infrastructure passwords
cp .env.example .env
nano .env    # Set strong passwords for PostgreSQL, Redis, RabbitMQ, MinIO

# Backend config
cp .env.backend.example .env.backend
nano .env.backend    # Set SECRET_KEY, database URLs with matching passwords
```

**Important:** Use the same passwords in `.env` and `.env.backend`. For example, if `.env` has `POSTGRES_PASSWORD=mySecurePass123`, then `.env.backend` must have `DATABASE_URL=postgresql+asyncpg://edu:mySecurePass123@postgres:5432/eduplatform`.

### 3. Run the setup script

```bash
chmod +x setup.sh
./setup.sh your-email@domain.com
```

This script:
- Installs Docker, Nginx, Certbot, UFW, fail2ban
- Configures firewall (SSH + Nginx only)
- Obtains Let's Encrypt SSL certificates for all subdomains
- Configures Nginx as reverse proxy with HTTPS
- Builds and starts all Docker containers
- Runs database migrations

### 4. Seed initial data (optional)

```bash
cd /opt/eduplatform/deploy
docker compose -f docker-compose.prod.yml exec -T api bash -c "PYTHONPATH=/app python /app/scripts/seed_full.py"
docker compose -f docker-compose.prod.yml exec -T api bash -c "PYTHONPATH=/app python /app/scripts/run_ml_scoring.py"
docker compose -f docker-compose.prod.yml exec -T api bash -c "PYTHONPATH=/app python /app/scripts/recalc_gamification.py"
```

## File Structure

```
deploy/
├── docker-compose.prod.yml    # Production Docker Compose
├── .env.example               # Infrastructure env template
├── .env.backend.example       # Backend env template
├── setup.sh                   # One-click server setup script
├── README.md                  # This file
└── nginx/
    ├── nginx.conf             # Full Nginx config (5 server blocks)
    └── ssl-params.conf        # SSL/TLS security parameters
```

## Management Commands

```bash
cd /opt/eduplatform/deploy

# View logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f crm

# Restart a service
docker compose -f docker-compose.prod.yml restart api

# Rebuild and deploy updates
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Run migrations after backend changes
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

# Database backup
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U edu eduplatform > backup_$(date +%Y%m%d).sql

# Database restore
docker compose -f docker-compose.prod.yml exec -T postgres psql -U edu eduplatform < backup.sql
```

## Security

- **Nginx**: TLS 1.2/1.3 only, HSTS enabled, modern cipher suite
- **Firewall**: UFW allows only SSH (22) and Nginx (80/443)
- **fail2ban**: Installed for brute-force protection
- **Docker ports**: All bound to `127.0.0.1` — not exposed to internet directly
- **SSL auto-renewal**: Certbot cron runs daily at 3:00 AM
- **Rate limiting**: API 30 req/s, Web 50 req/s per IP

## Nginx Configuration

The Nginx config at `nginx/nginx.conf` includes:

- HTTP → HTTPS redirect for all domains
- Let's Encrypt ACME challenge support
- Reverse proxy to 5 upstream services
- WebSocket support (Upgrade headers)
- Gzip compression
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting per zone (api + web)
- SSL session caching and OCSP stapling

## Updating SSL Certificates

Certificates auto-renew via cron. To manually renew:

```bash
certbot renew --force-renewal
systemctl reload nginx
```

## Troubleshooting

```bash
# Check if all containers are running
docker compose -f docker-compose.prod.yml ps

# Check Nginx config syntax
nginx -t

# View Nginx error log
tail -f /var/log/nginx/error.log

# Check SSL certificate expiry
certbot certificates

# Test HTTPS from outside
curl -I https://shukhratbekov.uz
curl -I https://api.shukhratbekov.uz/docs
```
