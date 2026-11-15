/**
 * modules/auth/service.ts — Authentication business logic
 *
 * This layer contains only business logic — no HTTP concepts (req/res).
 * It can be called from controllers or tested independently.
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { env } from '../../config/env'
import type { RegisterInput, LoginInput, SendOtpInput, VerifyRegisterInput, CustomerLoginInput } from './schemas'
import type { UserRole } from '@prisma/client'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Safe user object — never includes passwordHash */
export type SafeUser = {
  id: string
  name: string
  phone: string
  email: string | null
  role: UserRole
  isActive: boolean
  createdAt: Date
}

/** Payload stored inside the JWT */
type JwtPayload = {
  userId: string
  role: UserRole
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip passwordHash and return a safe user object */
function toSafeUser(user: {
  id: string
  name: string
  phone: string
  email: string | null
  role: UserRole
  isActive: boolean
  createdAt: Date
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }
}

/** Sign a JWT with the user's id and role */
function signToken(userId: string, role: UserRole): string {
  const payload: JwtPayload = { userId, role }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Throws a descriptive error string on failure (controller maps these to HTTP responses).
 */

export async function sendOtp(input: SendOtpInput): Promise<{ message: string }> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('SMS delivery provider is not configured for production environment.')
  }
  const { phone, intent } = input
  const existingUser = await prisma.user.findUnique({ where: { phone } })
  
  if (intent === 'CUSTOMER_LOGIN') {
    if (!existingUser || existingUser.role !== 'CUSTOMER') {
      throw new Error('Customer account not found. Please ask your shopkeeper to add you.')
    }
  } else {
    if (existingUser && existingUser.isClaimed) {
      throw new Error('An account with this phone number already exists')
    }
  }

  const existingVerification = await prisma.phoneVerification.findUnique({ where: { phone } })
  const now = new Date()
  if (existingVerification) {
    const diffSeconds = (now.getTime() - existingVerification.lastSentAt.getTime()) / 1000
    if (diffSeconds < 60) {
      throw new Error(`Please wait ${Math.ceil(60 - diffSeconds)} seconds before requesting a new OTP`)
    }
    if (existingVerification.attempts >= 5 && diffSeconds < 3600) {
       throw new Error('Too many verification attempts. Please try again later.')
    }
  }
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)
  await prisma.phoneVerification.upsert({
    where: { phone },
    update: { otpHash, expiresAt, attempts: 0, lastSentAt: now, verified: false },
    create: { phone, otpHash, expiresAt, lastSentAt: now }
  })
  console.log(`[DEV ONLY] OTP for ${phone}: ${otp}`)
  return { message: 'OTP sent successfully' }
}

export async function verifyAndRegisterUser(input: VerifyRegisterInput): Promise<{ user: SafeUser; token: string }> {
  const { phone, otp, name, email, password, role } = input
  const verification = await prisma.phoneVerification.findUnique({ where: { phone } })
  if (!verification) throw new Error('No OTP request found for this phone number')
  if (verification.verified) throw new Error('OTP has already been verified')
  if (verification.attempts >= 5) throw new Error('Maximum verification attempts exceeded. Please request a new OTP.')
  if (new Date() > verification.expiresAt) throw new Error('OTP has expired. Please request a new one.')

  const isValid = await bcrypt.compare(otp, verification.otpHash)
  if (!isValid) {
    await prisma.phoneVerification.updateMany({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } }
    })
    throw new Error('Invalid OTP')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.phoneVerification.updateMany({
      where: { id: verification.id, verified: false, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { verified: true }
    })
    if (updated.count === 0) throw new Error('OTP has already been verified, expired, or max attempts reached.')

    const existingUser = await tx.user.findUnique({ where: { phone } })
    if (existingUser) {
      if (existingUser.isClaimed) throw new Error('An account with this phone number already exists')
      return tx.user.update({
        where: { id: existingUser.id },
        data: { name, email: email || null, passwordHash, isClaimed: true }
      })
    } else {
      if (email) {
        const existingByEmail = await tx.user.findUnique({ where: { email } })
        if (existingByEmail) throw new Error('An account with this email already exists')
      }
      return tx.user.create({
        data: { name, phone, email: email || null, passwordHash, role: role as import('@prisma/client').UserRole, isClaimed: true }
      })
    }
  })
  const token = signToken(result.id, result.role)
  return { user: toSafeUser(result), token }
}

export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
  const { phone, password } = input

  // Find user by phone — include passwordHash for comparison
  const user = await prisma.user.findUnique({ where: { phone } })

  // Use a constant-time comparison path to avoid timing attacks.
  // Even when user is not found, we still call bcrypt.compare with a dummy hash
  // so the response time is the same whether the account exists or not.
  const dummyHash = '$2a$12$invalidhashfortimingneutralisation000000000000000000'
  const hashToCompare = user?.passwordHash ?? dummyHash

  const passwordValid = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordValid) {
    throw new Error('Invalid phone number or password')
  }

  if (user.role === 'PLATFORM_ADMIN') {
    throw new Error('Platform administrators must log in via the administrator portal.')
  }

  if (!user.isClaimed) {
    throw new Error('This account has not been activated yet. Please complete registration to claim your account.')
  }

  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Please contact support.')
  }

  const token = signToken(user.id, user.role)
  return { user: toSafeUser(user), token }
}

/**
 * Find a user by ID — used by the /me endpoint and auth middleware.
 * Returns null if user not found or inactive.
 */
export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.isActive || !user.isClaimed) return null
  return toSafeUser(user)
}

/** Verify a JWT token and return its payload, or null if invalid */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export async function verifyCustomerOtpLogin(input: CustomerLoginInput): Promise<{ user: SafeUser; token: string }> {
  const { phone, otp } = input
  
  const verification = await prisma.phoneVerification.findUnique({ where: { phone } })
  if (!verification || verification.verified) {
    throw new Error('Please request a new OTP first.')
  }
  
  if (verification.expiresAt < new Date()) {
    throw new Error('OTP has expired. Please request a new one.')
  }
  
  if (verification.attempts >= 5) {
    throw new Error('Too many failed attempts. Please request a new OTP.')
  }
  
  const isValid = await bcrypt.compare(otp, verification.otpHash)
  if (!isValid) {
    await prisma.phoneVerification.update({
      where: { phone },
      data: { attempts: { increment: 1 } }
    })
    throw new Error('Invalid OTP')
  }
  
  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.phoneVerification.updateMany({
      where: { phone, verified: false },
      data: { verified: true }
    })
    if (consumed.count === 0) {
      throw new Error('OTP has already been verified or expired.')
    }
    
    let user = await tx.user.findUnique({ where: { phone } })
    if (!user || user.role !== 'CUSTOMER') {
      throw new Error('Customer account not found.')
    }
    
    if (!user.isClaimed) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { isClaimed: true }
      })
    }
    
    return user
  })
  
  const token = signToken(result.id, result.role)
  return { user: toSafeUser(result), token }
}
