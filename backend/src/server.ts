/**
 * server.ts — Server entry point
 *
 * Loads environment variables, connects to database, then starts the HTTP server.
 * Keeping this separate from app.ts means we can import 'app' in tests
 * without actually binding to a port.
 */

import 'dotenv/config'
import app from './app'

const PORT = parseInt(process.env['PORT'] ?? '3000', 10)
const HOST = process.env['HOST'] ?? 'localhost'

const server = app.listen(PORT, HOST, () => {
  console.log(`
  ┌────────────────────────────────────────┐
  │        Vyapar Link API Server          │
  ├────────────────────────────────────────┤
  │  Status:  Running                      │
  │  URL:     http://${HOST}:${PORT}           │
  │  Env:     ${(process.env['NODE_ENV'] ?? 'development').padEnd(27)}│
  └────────────────────────────────────────┘
  `)
})

// ── Graceful Shutdown ──────────────────────────────────────────────────
// When the process receives SIGTERM (e.g. from Docker, PM2, or Ctrl+C),
// close the server cleanly before exiting.
const shutdown = (signal: string) => {
  console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`)
  server.close(() => {
    console.log('[SERVER] HTTP server closed.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Handle uncaught errors — log and exit (let process manager restart)
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled promise rejection:', reason)
  process.exit(1)
})

export default server
