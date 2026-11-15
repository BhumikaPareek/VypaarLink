/**
 * modules/admin/auth/service.ts — Business logic for Platform Admin authentication
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../lib/prisma'
import { env } from '../../../config/env'
import type { AdminLoginInput } from './schemas'
import type { SafeUser } from '../../auth/service'

export const ADMIN_COOKIE_NAME = 'admin_token'

type AdminJwtPayload = {
  userId: string
  role: 'PLATFORM_ADMIN'
}

export function signAdminToken(userId: string): string {
  const payload: AdminJwtPayload = { userId, role: 'PLATFORM_ADMIN' }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export async function loginAdmin(input: AdminLoginInput): Promise<{ user: SafeUser; token: string }> {
  const { phone, password } = input

  const user = await prisma.user.findUnique({ where: { phone } })

  const dummyHash = '$2a$12$invalidhashfortimingneutralisation000000000000000000'
  const hashToCompare = user?.passwordHash ?? dummyHash

  const passwordValid = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordValid) {
    throw new Error('Invalid phone number or password')
  }

  if (user.role !== 'PLATFORM_ADMIN') {
    throw new Error('Access denied: Not a platform administrator account')
  }

  if (!user.isActive) {
    throw new Error('Your administrator account has been deactivated. Please contact the platform owner.')
  }

  const token = signAdminToken(user.id)

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }

  return { user: safeUser, token }
}
