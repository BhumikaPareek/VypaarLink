/**
 * lib/prisma.ts — Prisma Client singleton
 *
 * Exporting a single shared PrismaClient instance prevents the common
 * mistake of creating a new connection pool on every request, which
 * would exhaust the database connection limit quickly.
 *
 * In development, tsx watch re-evaluates modules on save, which would
 * create duplicate instances. The globalThis trick keeps one instance
 * alive across hot reloads during development.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
