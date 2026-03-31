# Connectivity Monitoring Module

## Overview

The Connectivity Monitoring module tracks customer internet links via ICMP ping, supports hostnames with DNS resolution, logs outages, and sends email alerts within configurable time windows.

## Enabling the Module

Set in `.env`:
```
CONNECTIVITY_MODULE_ENABLED=true
```

When `false`, connectivity routes and the monitoring engine are disabled.

## Database Migration

Run migrations to create connectivity tables:
```bash
cd backend
npx prisma migrate deploy
npm run db:seed
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| CONNECTIVITY_MODULE_ENABLED | Enable/disable module | true |
| CONNECTIVITY_PING_INTERVAL_MS | Interval between check cycles (ms) | 60000 |
| CONNECTIVITY_CONCURRENT_PINGS | Max concurrent pings | 15 |
| CONNECTIVITY_ALERT_RATE_LIMIT | Max alert emails per minute | 10 |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS | SMTP for alerts | - |
| ALERT_FROM_EMAIL | From address for alerts | SMTP_USER |

## User Roles

- **Admin**: Full access (CRUD targets, time windows, reports)
- **Viewer**: Dashboard, reports, outage log (read-only)

Create a viewer: Users → Add User → Role: viewer

## API Endpoints

- `GET /api/connectivity/dashboard` – Summary and targets
- `GET /api/connectivity/targets` – List targets
- `POST /api/connectivity/targets` – Create target (admin)
- `PUT /api/connectivity/targets/:id` – Update target (admin)
- `DELETE /api/connectivity/targets/:id` – Delete target (admin)
- `PATCH /api/connectivity/targets/:id/status` – Enable/disable (admin)
- `GET /api/connectivity/time-windows` – List time windows (admin)
- `POST /api/connectivity/time-windows` – Create/update window (admin)
- `GET /api/connectivity/reports/uptime` – Uptime report
- `GET /api/connectivity/reports/sla` – SLA report
- `GET /api/connectivity/reports/export` – CSV export
- `GET /api/connectivity/outages` – Outage log

## Frontend Routes

- `/connectivity` – Dashboard
- `/connectivity/targets` – Manage targets (admin)
- `/connectivity/reports` – Reports
- `/connectivity/outages` – Outage history
