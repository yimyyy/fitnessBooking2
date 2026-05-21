# AWS Architecture Overview

## High-Level Architecture

```
                        ┌─────────────────────────────────────────────────────┐
                        │                    AWS Cloud                         │
                        │                                                      │
  Users ──────────────► │  ┌──────────────┐    ┌──────────────────────────┐  │
  (browsers)            │  │  CloudFront  │    │   Elastic Beanstalk      │  │
                        │  │  (CDN/HTTPS) │    │   (Node.js Platform)     │  │
                        │  │              │    │                          │  │
                        │  │  Origin:     │    │  ┌────────────────────┐  │  │
                        │  │  S3 Bucket   │    │  │ Express API Server  │  │  │
                        │  │  (React SPA) │    │  │ managed by PM2     │  │  │
                        │  └──────────────┘    │  └────────────────────┘  │  │
                        │         │            │           │               │  │
                        │         ▼            └───────────┼───────────────┘  │
                        │  ┌──────────────┐               │                   │
                        │  │  S3 Bucket   │               │  Private Subnet   │
                        │  │  (static     │               ▼                   │
                        │  │   assets)    │  ┌────────────────────────────┐   │
                        │  └──────────────┘  │     RDS PostgreSQL         │   │
                        │                    │     (private subnet,       │   │
                        │                    │      not public)           │   │
                        │                    └────────────────────────────┘   │
                        │                                                      │
                        │  ┌──────────────────────────────────────────────┐   │
                        │  │              AWS SES (email)                 │   │
                        │  │  - Booking confirmations                     │   │
                        │  │  - Cancellation confirmations               │   │
                        │  │  - Waitlist promotion notifications         │   │
                        │  │  - 24h class reminders (via node-cron)      │   │
                        │  └──────────────────────────────────────────────┘   │
                        └─────────────────────────────────────────────────────┘
```

## VPC Layout

```
VPC (10.0.0.0/16)
│
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)
│   └── Elastic Beanstalk EC2 instances (Node.js API)
│       - Internet-facing load balancer
│       - Port 80/443 open to internet
│
└── Private Subnets (10.0.3.0/24, 10.0.4.0/24)
    └── RDS PostgreSQL
        - Port 5432 open only to EB security group
        - No public IP, no internet access
```

## Security Groups

| Resource | Inbound | Outbound |
|----------|---------|----------|
| EB Load Balancer | 80, 443 from 0.0.0.0/0 | All |
| EB EC2 instances | 8080 from Load Balancer SG | All |
| RDS PostgreSQL | 5432 from EB EC2 SG only | None |

## Data Flow

### User books a class:
```
Browser → CloudFront → S3 (serves React app)
Browser → Elastic Beanstalk API (/api/v1/bookings POST)
  → Express validates JWT
  → bookingService.createBooking()
  → Prisma → RDS PostgreSQL (INSERT booking)
  → sesEmailService.sendBookingConfirmation()
  → AWS SES → user's inbox
```

### 24h reminder cron:
```
node-cron (hourly) → reminderCron.ts
  → Prisma → RDS (query classes starting in 24-25h)
  → For each confirmed booking:
    → AWS SES → user's inbox
    → Prisma → RDS (INSERT notification record)
```

## Services Summary

| Service | Purpose | Tier |
|---------|---------|------|
| CloudFront | CDN, HTTPS termination for React SPA | Public |
| S3 | Static file hosting (React build) | Public |
| Elastic Beanstalk | Node.js/Express API hosting | Public (load balanced) |
| RDS PostgreSQL | Primary database | Private |
| AWS SES | Transactional email delivery | Managed |
| PM2 | Process manager within EB EC2 instance | Internal |
| Route 53 | DNS (optional) | Public |

## Deployment Process

1. GitHub Actions runs tests on every PR
2. On merge to `main`:
   - Frontend: `npm run build` → `aws s3 sync` → CloudFront invalidation
   - Backend: `npm run build` → `eb deploy` (triggers `.ebextensions` hooks)
3. EB hooks (`.ebextensions/02_migrate.config`) run `prisma migrate deploy` before app starts
4. PM2 (`ecosystem.config.js`) manages the Node process lifecycle
