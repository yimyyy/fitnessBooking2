# Fitness Booking App

A production-ready fitness class booking platform built with React, Node.js/Express, PostgreSQL (Prisma), JWT auth, and AWS SES email — designed for deployment on AWS Elastic Beanstalk + S3/CloudFront.

## Features

- **Calendar view** (monthly + weekly) of all fitness classes
- **Booking system** with waitlist auto-promotion
- **Roles**: admin, instructor, student (JWT-based)
- **Payment tracking** (pending / paid / refunded)
- **Email notifications** via AWS SES (confirmation, cancellation, waitlist, 24h reminders)
- **Internationalization** (English + French)
- **Admin dashboard**: manage classes, view bookings, update payments, stats
- **OpenAPI/Swagger** docs at `GET /api/docs`
- **Full test coverage**: Jest + Supertest (backend), Vitest + RTL (frontend)

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- AWS CLI (for deployment)
- EB CLI (`pip install awsebcli`) for Elastic Beanstalk deployment

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd fitness-booking

# Install backend deps
cd server && npm install && cd ..

# Install frontend deps
cd client && npm install && cd ..
```

### 2. Set up environment variables

```bash
# Backend
cp server/.env.example server/.env
# Edit server/.env with your local PostgreSQL credentials

# Frontend
cp client/.env.example client/.env
# client/.env: VITE_API_URL=http://localhost:8080
```

### 3. Set up the database

```bash
cd server

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed sample data
npm run prisma:seed
```

Seed creates:
- `admin@fitness.com` / `Admin123!`
- `instructor@fitness.com` / `Instructor123!`
- `student@fitness.com` / `Student123!`

### 4. Start the servers

```bash
# Terminal 1 — Backend (http://localhost:8080)
cd server && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client && npm run dev
```

Swagger UI: http://localhost:8080/api/docs  
Health check: http://localhost:8080/health

---

## Running Tests

### Backend

```bash
cd server

npm test                  # all tests
npm run test:unit         # unit tests only
npm run test:integration  # integration tests only
npm run test:coverage     # with coverage report
```

Coverage thresholds: 80% statements, 75% branches, 80% functions, 80% lines.

### Frontend

```bash
cd client

npm test                  # run all tests
npm run test:coverage     # with coverage report
```

---

## Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Dev only | Separate test database URL |
| `JWT_SECRET` | ✅ | Secret for signing JWTs (use a strong random string) |
| `JWT_EXPIRES_IN` | ✅ | Token expiry, e.g. `7d` |
| `PORT` | ✅ | Server port (EB sets automatically; default 8080) |
| `NODE_ENV` | ✅ | `development`, `test`, or `production` |
| `AWS_REGION` | ✅ | AWS region for SES, e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Prod | IAM key with SES permissions (prefer IAM role on EB) |
| `AWS_SECRET_ACCESS_KEY` | Prod | IAM secret key |
| `SES_FROM_EMAIL` | ✅ | Verified SES sender address |
| `FRONTEND_URL` | ✅ | CloudFront URL for CORS allowlist |
| `CANCELLATION_WINDOW_HOURS` | ✅ | Min hours before class for cancellation (e.g. `24`) |

### Frontend (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend URL (EB environment URL or custom domain) |

---

## AWS Deployment Guide

### Step 1: Create RDS PostgreSQL

1. Open AWS RDS console → **Create database**
2. Engine: PostgreSQL 15, Template: Production
3. Instance class: `db.t3.micro` (or larger)
4. **VPC**: Select your VPC
5. **Subnet group**: Create a DB subnet group using **private subnets only**
6. **Public access**: **No**
7. Create a security group for RDS (inbound: port 5432 from EB SG only — configure after EB setup)
8. Note the endpoint hostname for `DATABASE_URL`

### Step 2: Create Elastic Beanstalk environment

```bash
# Initialize EB in project root
eb init fitness-booking-api --region us-east-1 --platform "Node.js 18"

# Create environment
eb create fitness-booking-prod \
  --instance-type t3.small \
  --vpc.id vpc-xxxxxxxx \
  --vpc.ec2subnets subnet-public-1,subnet-public-2 \
  --vpc.elbsubnets subnet-public-1,subnet-public-2
```

After creating:
- Update the RDS security group to allow port 5432 **inbound from the EB EC2 security group**

### Step 3: Set environment variables in EB console

Go to EB Console → Your environment → **Configuration** → **Software** → **Environment properties**

Set all variables from the Backend table above. Use the RDS endpoint for `DATABASE_URL`:
```
postgresql://postgres:yourpassword@your-rds-endpoint.rds.amazonaws.com:5432/fitness_booking
```

### Step 4: Deploy backend

```bash
cd <project-root>
npm run build  # builds server/dist
eb deploy
```

EB will automatically:
1. Install dependencies (`02_migrate.config`: step 1)
2. Build TypeScript (`02_migrate.config`: step 2)
3. Run `prisma migrate deploy` (leader instance only)
4. Start app via `ecosystem.config.js` (PM2)

### Step 5: Deploy frontend

```bash
# Build React app
cd client
VITE_API_URL=https://your-eb-env.elasticbeanstalk.com npm run build

# Create S3 bucket (if not exists)
aws s3 mb s3://your-bucket-name --region us-east-1
aws s3 website s3://your-bucket-name --index-document index.html --error-document index.html

# Upload build
aws s3 sync dist/ s3://your-bucket-name --delete
```

### Step 6: Create CloudFront distribution

1. Open CloudFront → **Create distribution**
2. Origin: your S3 bucket (use S3 website endpoint, not REST endpoint)
3. Viewer Protocol Policy: **Redirect HTTP to HTTPS**
4. Default root object: `index.html`
5. Create a custom error page: 403/404 → `/index.html` with 200 status (for React Router)
6. Note the CloudFront URL (`d1234.cloudfront.net`) → set as `FRONTEND_URL` in EB

### Step 7: Verify SES

```bash
# Verify sender email
aws ses verify-email-identity --email-address noreply@yourdomain.com --region us-east-1

# Or verify entire domain (recommended for production)
aws ses verify-domain-identity --domain yourdomain.com --region us-east-1

# Request production access (removes sandbox restrictions)
# Go to: SES console → Account dashboard → Request production access
```

### Step 8: Point Route 53 (optional)

1. Create hosted zone for your domain
2. A record → CloudFront distribution (frontend)
3. CNAME → EB URL (API, if using custom domain)
4. Add SES DKIM records for email deliverability

---

## GitHub Actions Secrets Required

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user for CI/CD deployments |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `S3_BUCKET` | Frontend S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `EB_APP_NAME` | EB application name |
| `EB_ENV_NAME` | EB environment name |
| `EB_API_URL` | EB URL (used as `VITE_API_URL` at build time) |

---

## Project Structure

```
fitness-booking/
├── client/                 # React + TypeScript + Tailwind (→ S3/CloudFront)
│   ├── src/
│   │   ├── api/            # Axios API clients
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # AuthContext, LanguageContext
│   │   ├── hooks/          # useAuth, useBooking, useClasses
│   │   ├── i18n/           # en.json, fr.json translations
│   │   └── pages/          # Route-level pages
│   └── src/__tests__/      # Vitest + RTL tests
│
├── server/                 # Express + TypeScript (→ Elastic Beanstalk)
│   ├── src/
│   │   ├── errors/         # AppError, typed HTTP errors
│   │   ├── middleware/      # auth, errorHandler
│   │   ├── prisma/         # Prisma client + seed
│   │   ├── routes/         # Express route handlers
│   │   └── services/       # authService, bookingService, sesEmailService, reminderCron
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── src/__tests__/      # Jest + Supertest tests
│
├── .ebextensions/          # EB configuration (Node version, migrations)
├── ecosystem.config.js     # PM2 process manager config
├── docs/                   # Architecture, API reference, ADRs
└── .github/workflows/      # CI/CD pipeline
```
