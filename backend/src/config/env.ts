/**
 * config/env.ts — Validated environment configuration
 *
 * All environment variables the application needs are declared here.
 * Using Zod to validate env vars at startup means the server fails immediately
 * with a clear message if a required variable is missing — instead of
 * crashing later with a cryptic error.
 *
 * To be wired up in Stage 1 when we add auth and database connection.
 */

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT — will be used in Stage 1 auth implementation
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

// Parse and validate on module load
// If validation fails, print a clear error and exit
const parseResult = envSchema.safeParse(process.env)

if (!parseResult.success) {
  console.error('\n[CONFIG ERROR] Invalid environment variables:')
  parseResult.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  console.error('\nCheck your backend/.env file against backend/.env.example\n')
  process.exit(1)
}

export const env = parseResult.data
