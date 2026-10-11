/**
 * app.ts — Express application setup
 *
 * This file creates and configures the Express app.
 * It does NOT start the server — that is done in server.ts.
 *
 * Separation of app from server allows:
 * - Easier testing (import app without starting server)
 * - Cleaner responsibility boundaries
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

const app = express()

// ── Security ────────────────────────────────────────────────────────
// helmet sets sensible security headers (X-Frame-Options, HSTS, etc.)
app.use(helmet())

// ── CORS ─────────────────────────────────────────────────────────────
// Allow requests from the frontend dev server (Vite on 5173)
// credentials: true is required for HttpOnly cookies to be sent
app.use(
  cors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// ── Request Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))  // parse JSON bodies, cap at 10kb
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())                   // parse cookies (for JWT HttpOnly cookie)

// ── Logging ──────────────────────────────────────────────────────────
// 'dev' format: colored output with method, url, status, response time
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('dev'))
}

// ── Health Check ──────────────────────────────────────────────────────
// Simple endpoint to verify the server is running
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'vyapar-link-api',
    timestamp: new Date().toISOString(),
  })
})

// ── API Routes ────────────────────────────────────────────────────────
import authRouter from './modules/auth/routes'

app.use('/api/v1/auth', authRouter)
import shopRouter from './modules/shop/routes'
import customerRouter from './modules/customer/routes'
import transactionRouter from './modules/transaction/routes'
import dashboardRouter from './modules/dashboard/routes'

app.use('/api/v1/shop', shopRouter)
app.use('/api/v1/customers', customerRouter)
app.use('/api/v1/transactions', transactionRouter)
app.use('/api/v1/dashboard', dashboardRouter)

import inventoryRouter from './modules/inventory/routes'
app.use('/api/v1/inventory', inventoryRouter)

import supplierRouter from './modules/supplier/routes'
app.use('/api/v1/suppliers', supplierRouter)

import purchaseOrderRouter from './modules/purchaseOrder/routes'
app.use('/api/v1/purchase-orders', purchaseOrderRouter)


// ── 404 Handler ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  })
})

// ── Global Error Handler ──────────────────────────────────────────────
// Must have 4 parameters for Express to recognise it as an error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[ERROR]', err.message)

    const statusCode = res.statusCode !== 200 ? res.statusCode : 500

    res.status(statusCode).json({
      status: 'error',
      message:
        process.env['NODE_ENV'] === 'production'
          ? 'Internal server error'
          : err.message,
    })
  }
)

export default app
