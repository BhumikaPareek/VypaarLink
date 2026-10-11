# VypaarLink

**A responsive web platform for local kirana stores and small retailers.**

VypaarLink helps local shopkeepers manage customer credit (udhaar), payments, transaction records, inventory, and everyday business activities from one place — moving from paper notebooks to a reliable digital system.

---

## Problem Statement

Many local retailers still manage customer credit, payments, and business records through notebooks, memory, or disconnected methods. This leads to:

- Disputed transactions due to unclear records
- Difficulties tracking payment history
- Limited visibility into outstanding credit
- Time-consuming manual record keeping

---

## Solution

VypaarLink provides a shared, verified digital ledger between shopkeeper and customer. Key to the approach is **mutual transaction confirmation** — both parties see and can confirm the same record, helping reduce disputes through a shared record.

---

## Current Stage

> **Stage 0 — Foundation**
> 
> Project structure, architecture, development tooling, and database foundation have been established. Core business features are being developed incrementally.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| Data Fetching | TanStack Query v5 |
| Backend | Node.js, Express, TypeScript |
| Validation | Zod |
| Authentication | JWT (HttpOnly cookies) |
| Database | PostgreSQL + Prisma ORM |

---

## Project Structure

```
VypaarLink/
├── frontend/          # React + Vite application
├── backend/           # Express API server
├── docs/              # Technical documentation
├── .gitignore
├── package.json       # Root monorepo config
└── README.md
```

---

## Development Setup

### Prerequisites

- Node.js >= 20
- PostgreSQL >= 16
- npm >= 10

### 1. Clone the repository

```bash
git clone https://github.com/BhumikaPareek/VypaarLink.git
cd VypaarLink
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL credentials
```

### 4. Set up the database

```bash
cd backend
npx prisma migrate dev
```

### 5. Start development servers

```bash
# From project root
npm run dev
```

Frontend → http://localhost:5173  
Backend API → http://localhost:3000

---

## Development Roadmap

- [x] **Stage 0** — Foundation: project structure, tooling, architecture
- [x] **Stage 1** — Core MVP: authentication, shop/customer management, ledger, transactions, payments, mutual confirmation, basic dashboard
- [ ] **Stage 2** — Inventory: products, stock, pricing, alerts
- [ ] **Stage 3** — Supplier Workflow: suppliers, orders, restock
- [ ] **Stage 4** — Business Intelligence: trends, analytics, insights
- [ ] **Stage 5** — Intelligent Assistant: AI-powered business queries
- [ ] **Stage 6** — Production Refinement: security, testing, deployment

---

## License

This project is currently under development. License to be determined.

---

*Built as a real-world software project for learning, portfolio, and practical use.*
