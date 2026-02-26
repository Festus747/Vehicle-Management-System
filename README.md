# Vehicle Mileage Tracking System (VMTS) v3.0

An enterprise-grade Vehicle Mileage Tracking System with a production-ready RESTful backend powered by PostgreSQL, Prisma ORM, and a Progressive Web App frontend. Built for fleet governance, audit-readiness, and cloud deployment on Vercel.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [Business Rules](#business-rules)
- [API Reference](#api-reference)
- [Security & RBAC](#security--rbac)
- [Deploying to Vercel](#deploying-to-vercel)
- [Sample API Requests](#sample-api-requests)
- [Legacy Backend](#legacy-backend)

---

## Architecture Overview

```
┌──────────────────┐     HTTPS/JWT     ┌──────────────────────────────┐
│   Frontend PWA   │ ◄──────────────► │   Express.js API (src/)       │
│   (public/)      │                   │   ├─ Middleware (auth, rbac)  │
│   HTML/CSS/JS    │                   │   ├─ Routes                   │
│   Chart.js       │                   │   ├─ Services (business logic)│
│   Service Worker │                   │   ├─ Validators               │
└──────────────────┘                   │   └─ Prisma ORM              │
                                       └───────────┬──────────────────┘
                                                    │
                                                    ▼
                                       ┌──────────────────────────────┐
                                       │   PostgreSQL Database         │
                                       │   (Neon / Supabase / Local)   │
                                       │   ├─ users                    │
                                       │   ├─ vehicles                 │
                                       │   ├─ mileage_records          │
                                       │   ├─ alerts                   │
                                       │   └─ maintenance_records      │
                                       └──────────────────────────────┘
```

**Request flow:**
1. Client sends request with JWT in `Authorization: Bearer <token>` header
2. `authenticate` middleware verifies JWT, attaches `req.user`
3. `authorize` middleware checks user role against allowed roles
4. `validate` middleware validates request body against schema
5. Route handler calls service layer
6. Service executes business logic inside Prisma transactions
7. Response returned with consistent JSON structure

---

## Features

| Feature | Description |
|---------|-------------|
| **Vehicle Registry** | CRUD with soft-delete, driver assignment, registration_number uniqueness |
| **Immutable Mileage Records** | Append-only log — records can never be updated or deleted |
| **Automatic Status Transitions** | Vehicle status updates automatically: ACTIVE → NEAR_LIMIT → LIMIT_EXCEEDED |
| **One-Time Alert Triggers** | Alerts fire exactly once per threshold crossing; retained for audit |
| **Role-Based Access Control** | ADMIN, MANAGER, DRIVER roles enforced at route level |
| **Mileage Tampering Prevention** | Monotonic enforcement — new mileage must exceed current value |
| **Audit-Ready Reports** | Mileage summary and violations reports with full traceability |
| **Maintenance Tracking** | Service records linked to vehicles with mileage-at-service |
| **Configurable Thresholds** | Mileage limit (5000) and warning threshold (200) via environment variables |
| **Cloud-Native** | Deploys to Vercel with PostgreSQL (Neon/Supabase) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.x |
| **Database** | PostgreSQL |
| **ORM** | Prisma 6.x |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Frontend** | Vanilla HTML/CSS/JS, Chart.js, SheetJS |
| **Deployment** | Vercel Serverless Functions |

---

## Project Structure

```
vehicle-mileage-tracker/
├── api/
│   └── index.js                 # Vercel serverless entry point
├── prisma/
│   ├── schema.prisma            # Database schema (normalized, relational)
│   └── seed.js                  # Database seeder
├── src/                         # ★ PRODUCTION BACKEND (v3.0)
│   ├── app.js                   # Express app setup & route mounting
│   ├── server.js                # Local dev server entry point
│   ├── config/
│   │   ├── index.js             # Environment configuration
│   │   └── constants.js         # Business rule constants
│   ├── lib/
│   │   └── prisma.js            # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── rbac.js              # Role-based access control
│   │   ├── validate.js          # Input validation middleware
│   │   └── errorHandler.js      # Centralized error handler
│   ├── routes/
│   │   ├── auth.js              # POST /auth/register, /auth/login
│   │   ├── vehicles.js          # CRUD + mileage recording
│   │   ├── alerts.js            # GET alerts, PATCH acknowledge
│   │   ├── reports.js           # Mileage summary, violations
│   │   └── maintenance.js       # Maintenance records
│   ├── services/                # ★ SOLID service layer
│   │   ├── auth.service.js      # Registration, login, profiles
│   │   ├── vehicle.service.js   # Vehicle CRUD + soft delete
│   │   ├── mileage.service.js   # Mileage recording + threshold enforcement
│   │   ├── alert.service.js     # Alert queries + acknowledgment
│   │   ├── report.service.js    # Summary + violation reports
│   │   └── maintenance.service.js
│   ├── validators/
│   │   ├── auth.js              # Register/login input validation
│   │   ├── vehicle.js           # Vehicle create/update validation
│   │   ├── mileage.js           # Mileage input validation
│   │   └── maintenance.js       # Maintenance input validation
│   └── types/                   # (Reserved for TypeScript migration)
├── server/                      # Legacy backend (v2.0, sql.js)
├── public/                      # Frontend PWA
├── package.json
├── vercel.json                  # Vercel deployment config
├── .env.example                 # Environment template
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** database (local, or cloud: Neon, Supabase, etc.)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd vehicle-mileage-tracker
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vmts?schema=public
JWT_SECRET=your-very-strong-secret-key
```

### 3. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Create tables (push schema to database)
npx prisma db push

# Seed default users and vehicles
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@ghanagas.com | admin123 | ADMIN |
| manager@ghanagas.com | manager123 | MANAGER |
| kwame@ghanagas.com | driver123 | DRIVER |
| ama@ghanagas.com | driver123 | DRIVER |

---

## Database Schema

### Entity Relationship

```
User (1) ─── (0..1) Vehicle ─── (*) MileageRecord
                     │
                     ├─── (*) Alert
                     │
                     └─── (*) MaintenanceRecord
```

### Models

| Model | Key Fields | Constraints |
|-------|-----------|-------------|
| **User** | id (UUID), name, email, password_hash, role | email UNIQUE, role ENUM (ADMIN, DRIVER, MANAGER) |
| **Vehicle** | id (UUID), registration_number, assigned_driver_id, mileage_limit, current_mileage, status, deleted_at | registration_number UNIQUE, soft-delete via deleted_at |
| **MileageRecord** | id (UUID), vehicle_id, recorded_mileage, recorded_at, recorded_by | **IMMUTABLE** — never update or delete |
| **Alert** | id (UUID), vehicle_id, alert_type, message, triggered_at, acknowledged | alert_type ENUM (NEAR_LIMIT, LIMIT_EXCEEDED) |
| **MaintenanceRecord** | id (UUID), vehicle_id, description, mileage_at_service, service_date | FK to vehicle |

---

## Business Rules

### Mileage Policy

| Rule | Value |
|------|-------|
| Maximum mileage per vehicle | **5,000 miles** |
| Early warning threshold | **4,800 miles** (5000 - 200) |
| Mileage direction | Cumulative, monotonic (only increases) |

### Automatic Status Enforcement

```
if mileage < 4,800          → status = ACTIVE
if mileage ≥ 4,800 and < 5,000 → status = NEAR_LIMIT
if mileage ≥ 5,000          → status = LIMIT_EXCEEDED
```

Status transitions are **automatic** — triggered by mileage recording, not manual input.

### Alert Rules

- **NEAR_LIMIT** alert: fires once when a vehicle first crosses 4,800 miles
- **LIMIT_EXCEEDED** alert: fires once when a vehicle first crosses 5,000 miles
- Alerts are **never deleted** — they form part of the audit trail
- Alerts can be **acknowledged** but remain in the database

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login, receive JWT |
| GET | `/api/auth/me` | Bearer | Get current user profile |

### Vehicles

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/api/vehicles` | Bearer | ADMIN, MANAGER | Create vehicle |
| GET | `/api/vehicles` | Bearer | All | List vehicles |
| GET | `/api/vehicles/:id` | Bearer | All | Get vehicle details |
| PATCH | `/api/vehicles/:id` | Bearer | ADMIN, MANAGER | Update vehicle |
| DELETE | `/api/vehicles/:id` | Bearer | ADMIN | Soft-delete vehicle |

### Mileage

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/vehicles/:id/mileage` | Bearer | Record mileage (triggers status + alerts) |
| GET | `/api/vehicles/:id/mileage-history` | Bearer | Get mileage history (paginated) |

### Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/alerts` | Bearer | List alerts (filterable) |
| PATCH | `/api/alerts/:id/acknowledge` | Bearer | Acknowledge an alert |

### Reports

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/reports/mileage-summary` | Bearer | ADMIN, MANAGER | Fleet mileage summary |
| GET | `/api/reports/violations` | Bearer | ADMIN, MANAGER | Vehicles at/above limit |

### Maintenance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/maintenance` | Bearer | List maintenance records |
| GET | `/api/maintenance/:id` | Bearer | Get single record |
| POST | `/api/maintenance` | Bearer | Create maintenance record |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | System health check |

---

## Security & RBAC

| Concern | Implementation |
|---------|---------------|
| **Password Storage** | bcrypt with 12 rounds |
| **Authentication** | JWT with configurable expiry (default 24h) |
| **Authorization** | Role-based middleware on every protected route |
| **Data Integrity** | Mileage records are immutable (no UPDATE/DELETE) |
| **Tamper Prevention** | Monotonic mileage enforcement (new > current) |
| **Soft Delete** | Vehicles are never hard-deleted; `deleted_at` timestamp |
| **Error Handling** | Centralized handler; no stack traces in production |
| **Sensitive Data** | password_hash never returned in API responses |

### Role Permissions Matrix

| Action | ADMIN | MANAGER | DRIVER |
|--------|:-----:|:-------:|:------:|
| Create vehicle | ✅ | ✅ | ❌ |
| Update vehicle | ✅ | ✅ | ❌ |
| Delete vehicle | ✅ | ❌ | ❌ |
| Record mileage | ✅ | ✅ | ✅ |
| View vehicles | ✅ | ✅ | ✅ |
| View mileage history | ✅ | ✅ | ✅ |
| View alerts | ✅ | ✅ | ✅ |
| Acknowledge alerts | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |
| Create maintenance | ✅ | ✅ | ✅ |

---

## Deploying to Vercel

### Step 1: Set Up a PostgreSQL Database

Choose one of these free-tier providers:

**Option A: Neon (recommended)**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/vmts?sslmode=require`

**Option B: Supabase**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database → Connection string (URI)

### Step 2: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 3: Link Project

```bash
vercel
```

Follow prompts to link your project.

### Step 4: Set Environment Variables

```bash
vercel env add DATABASE_URL        # Your PostgreSQL connection string
vercel env add JWT_SECRET          # A strong random secret
vercel env add NODE_ENV production
vercel env add MILEAGE_LIMIT 5000
vercel env add WARNING_THRESHOLD 200
```

Or set them in the Vercel Dashboard → Settings → Environment Variables.

### Step 5: Deploy

```bash
# First deployment (creates database tables)
vercel --prod
```

### Step 6: Run Migrations on Production

After deployment, run the migration against your production database:

```bash
# Set DATABASE_URL to your production database locally
DATABASE_URL="your-production-connection-string" npx prisma db push
DATABASE_URL="your-production-connection-string" node prisma/seed.js
```

### Vercel Configuration

The `vercel.json` routes all `/api/*` requests to the serverless function and serves static files from `public/`:

```json
{
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/api/index.js" }
  ]
}
```

---

## Sample API Requests

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePass123",
    "role": "DRIVER"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ghanagas.com",
    "password": "admin123"
  }'
```

### Create a Vehicle

```bash
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "registration_number": "GR-7890-24",
    "mileage_limit": 5000
  }'
```

### Record Mileage

```bash
curl -X POST http://localhost:3000/api/vehicles/<VEHICLE_ID>/mileage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "recorded_mileage": 4850
  }'
```

### Get Mileage History

```bash
curl http://localhost:3000/api/vehicles/<VEHICLE_ID>/mileage-history \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Get Alerts

```bash
curl http://localhost:3000/api/alerts \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Acknowledge Alert

```bash
curl -X PATCH http://localhost:3000/api/alerts/<ALERT_ID>/acknowledge \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Get Violations Report

```bash
curl http://localhost:3000/api/reports/violations \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Legacy Backend

The original v2.0 backend (SQLite/sql.js) is preserved in `server/` for reference. To run it:

```bash
npm run start:legacy
```

The v3.0 backend in `src/` is the production system. The legacy backend is not used in Vercel deployments.

---

## License

MIT

