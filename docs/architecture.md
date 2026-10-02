# Vyapar Link — Architecture Documentation

## Overview

Vyapar Link follows a standard layered architecture with clean separation between the frontend client, the backend API, and the database. Each layer has a single, well-defined responsibility.

## Architecture Diagram

```
┌─────────────────────────────────────┐
│           Browser / Mobile          │
│  React 19 + TypeScript + Vite       │
│  Tailwind CSS, React Router,        │
│  TanStack Query                     │
└────────────────┬────────────────────┘
                 │ HTTP REST (JSON)
                 │ /api/v1/...
                 │ Cookies (JWT auth)
┌────────────────▼────────────────────┐
│       Express API Server            │
│       Node.js + TypeScript          │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ Middleware Layer             │   │
│  │  - helmet (security headers) │   │
│  │  - cors (origin control)     │   │
│  │  - cookie-parser (JWT)       │   │
│  │  - morgan (logging)          │   │
│  │  - auth middleware (JWT)     │   │
│  │  - error handler             │   │
│  └────────────┬─────────────────┘   │
│               │                     │
│  ┌────────────▼─────────────────┐   │
│  │ Routes Layer                 │   │
│  │  /api/v1/auth                │   │
│  │  /api/v1/shops               │   │
│  │  /api/v1/transactions        │   │
│  │  /api/v1/dashboard           │   │
│  └────────────┬─────────────────┘   │
│               │                     │
│  ┌────────────▼─────────────────┐   │
│  │ Service Layer                │   │
│  │  Business logic only         │   │
│  │  No HTTP concepts here       │   │
│  └────────────┬─────────────────┘   │
│               │                     │
│  ┌────────────▼─────────────────┐   │
│  │ Data Access (Prisma ORM)     │   │
│  │  Type-safe DB queries        │   │
│  └────────────┬─────────────────┘   │
└───────────────┼─────────────────────┘
                │
┌───────────────▼──────────────────────┐
│         PostgreSQL Database           │
│                                       │
│  users, shops, shop_customers,        │
│  transactions                         │
└───────────────────────────────────────┘
```

## Monorepo Structure

```
VypaarLink/
├── frontend/                    React application
│   └── src/
│       ├── api/                 API call functions (typed with fetch)
│       ├── components/          Reusable UI components
│       │   └── ui/              Base design elements
│       ├── features/            Feature modules (auth, ledger, etc.)
│       ├── hooks/               Custom React hooks
│       ├── layouts/             Page layout wrappers
│       ├── pages/               Route-level page components
│       ├── store/               Global state (auth context)
│       ├── types/               Shared TypeScript interfaces
│       └── utils/               Helper utilities
│
├── backend/                     Express API server
│   ├── src/
│   │   ├── config/              Validated env config (Zod)
│   │   ├── middleware/          Auth, validation, error middleware
│   │   ├── modules/             Feature modules
│   │   │   ├── auth/            routes, controller, service, schemas
│   │   │   ├── shop/
│   │   │   ├── customer/
│   │   │   ├── transaction/
│   │   │   └── dashboard/
│   │   ├── utils/               Shared utilities
│   │   ├── app.ts               Express app setup
│   │   └── server.ts            Server entry point
│   └── prisma/
│       ├── schema.prisma        Database schema
│       └── migrations/          Version-controlled DB migrations
│
└── docs/                        Technical documentation
```

## Key Design Decisions

### 1. JWT with HttpOnly Cookies

Authentication uses JWT tokens stored in HttpOnly cookies, not localStorage.

**Why HttpOnly cookies:**
- JavaScript cannot access HttpOnly cookies — XSS attacks cannot steal tokens
- Cookies are automatically sent with every request to the same origin
- The backend controls the cookie lifetime

**Why not localStorage:**
- localStorage is accessible to any JavaScript on the page
- An XSS vulnerability would expose the token directly

### 2. UUID Primary Keys

All tables use UUID (`@default(uuid())`) instead of auto-increment integers.

**Why:**
- IDs cannot be guessed or enumerated (security benefit)
- Safe to expose in URLs (`/api/v1/transactions/uuid-here`)
- No collision risk if data is ever merged from multiple sources

### 3. Soft Delete on Transactions

Transactions have a `deletedAt` field instead of hard deletion.

**Why:**
- Financial records must be preserved for audit and dispute resolution
- Soft delete allows "removing" a transaction without destroying the record
- Critical for the mutual confirmation system — you cannot delete a confirmed transaction

### 4. Mutual Confirmation Pattern

Each transaction has a `status` field: `PENDING | CONFIRMED | FLAGGED`.

**Flow:**
1. Shopkeeper creates transaction → `status: PENDING`
2. Customer sees transaction in their view
3. Customer confirms → `status: CONFIRMED`, `confirmedAt` set
4. Customer disputes → `status: FLAGGED`, `flagReason` set

This creates a **shared, verified ledger** instead of a private shopkeeper record.

### 5. Zod for Validation

Request body validation uses Zod schemas defined in each module.

**Why:**
- Type-safe at runtime (TypeScript types only exist at compile time)
- Clear error messages for invalid data
- Single source of truth — Zod schema generates both the runtime validator and the TypeScript type

## API Conventions

- Base path: `/api/v1/`
- Authentication: HttpOnly cookie (`token`)
- Response format:
  ```json
  { "status": "success", "data": { ... } }
  { "status": "error", "message": "..." }
  ```
- HTTP methods:
  - `GET` — read data
  - `POST` — create resource
  - `PUT` — replace resource
  - `PATCH` — partial update
  - `DELETE` — remove (soft delete where applicable)

## Development Ports

| Service | Port | URL |
|---|---|---|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Express) | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |

Vite proxies `/api` requests to `localhost:3000` in development, so the frontend only needs to call `/api/v1/...`.
