/**
 * scripts/seedAdmin.ts — Secure, idempotent CLI script for Platform Admin provisioning
 *
 * Reads administrative credentials from environment variables:
 *   - ADMIN_PHONE (required, 10-digit Indian mobile number)
 *   - ADMIN_PASSWORD (required, at least 8 characters)
 *   - ADMIN_NAME (optional, defaults to "Platform Administrator")
 *   - ADMIN_EMAIL (optional, defaults to null)
 *
 * Security rules:
 *   - Never prints passwords, tokens, or credentials
 *   - Hashes passwords using bcrypt with salt rounds = 12
 *   - Strictly idempotent: if an admin with ADMIN_PHONE already exists, it terminates cleanly without modifying or resetting password
 *   - Rejects if the phone number belongs to another role
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

// Constant lock keys for PostgreSQL transaction-level advisory lock to serialize concurrent executions
const ADVISORY_LOCK_KEY1 = 84729
const ADVISORY_LOCK_KEY2 = 10492

async function seedAdmin() {
  const phone = process.env['ADMIN_PHONE']?.trim()
  const password = process.env['ADMIN_PASSWORD']?.trim()
  const name = process.env['ADMIN_NAME']?.trim() || 'Platform Administrator'
  const email = process.env['ADMIN_EMAIL']?.trim() || null

  if (!phone || !password) {
    console.error('[ADMIN SEED ERROR] ADMIN_PHONE and ADMIN_PASSWORD environment variables are required.')
    console.error('Usage: Provide ADMIN_PHONE and ADMIN_PASSWORD via secure environment variables.')
    process.exit(1)
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    console.error('[ADMIN SEED ERROR] ADMIN_PHONE must be a valid 10-digit Indian mobile number (starts with 6–9).')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('[ADMIN SEED ERROR] ADMIN_PASSWORD must be at least 8 characters long.')
    process.exit(1)
  }

  const maskedInputPhone = `******${phone.slice(-4)}`

  let exitCode = 0

  try {
    // Hash password prior to acquiring database lock to minimize transaction hold time
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-level advisory lock in PostgreSQL to serialize concurrent executions
      await tx.$queryRaw`
        SELECT 1 AS locked
        FROM pg_advisory_xact_lock(
          ${ADVISORY_LOCK_KEY1}::integer,
          ${ADVISORY_LOCK_KEY2}::integer
        );
      `

      // 2. Global single-admin check: does ANY platform administrator already exist?
      const existingAdmin = await tx.user.findFirst({
        where: { role: 'PLATFORM_ADMIN' },
      })

      if (existingAdmin) {
        if (existingAdmin.phone === phone) {
          console.log(
            `[ADMIN SEED] Idempotency notice: Platform Administrator account already exists for phone ${maskedInputPhone}. Existing credentials preserved; no changes made.`
          )
          exitCode = 0
          return
        } else {
          const maskedExistingPhone = `******${existingAdmin.phone.slice(-4)}`
          console.error(
            `[ADMIN SEED ERROR] A Platform Administrator account already exists for phone ${maskedExistingPhone}. Multiple platform administrators are not permitted.`
          )
          exitCode = 1
          return
        }
      }

      // 3. User check: does an account already exist with this phone under another role?
      const existingUser = await tx.user.findUnique({
        where: { phone },
      })

      if (existingUser) {
        console.error(
          `[ADMIN SEED ERROR] An account already exists for phone ${maskedInputPhone} under role '${existingUser.role}'. Use a distinct phone number for the Platform Administrator.`
        )
        exitCode = 1
        return
      }

      // 4. Provision the single platform administrator
      await tx.user.create({
        data: {
          name,
          phone,
          email,
          passwordHash,
          role: 'PLATFORM_ADMIN',
          isActive: true,
          isClaimed: true,
        },
      })

      console.log(
        `[ADMIN SEED SUCCESS] Platform Administrator account successfully provisioned for phone ${maskedInputPhone}.`
      )
      exitCode = 0
    })
  } catch (err) {
    exitCode = 1
    console.error('[ADMIN SEED ERROR] An unexpected error occurred while provisioning administrator account.')
    if (err instanceof Error && process.env['NODE_ENV'] !== 'production') {
      console.error(err.message)
    }
  } finally {
    await prisma.$disconnect()
    process.exitCode = exitCode
  }
}

seedAdmin()
