/**
 * modules/auth/controller.ts — HTTP handlers for auth endpoints
 *
 * Controllers handle the HTTP layer only:
 * - Parse and validate request input
 * - Call the service layer
 * - Set cookies
 * - Return formatted responses
 *
 * No business logic lives here.
 */

import type { Request, Response, NextFunction } from 'express'
import { sendOtpSchema, verifyRegisterSchema, loginSchema, customerLoginSchema } from './schemas'
import { sendOtp, verifyAndRegisterUser, loginUser, getUserById, verifyCustomerOtpLogin } from './service'

// ── Cookie configuration ───────────────────────────────────────────────────────

const COOKIE_NAME = 'token'

/** Cookie options — HttpOnly prevents JS access, Secure in production */
const cookieOptions = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,  // 'lax' works for same-site navigation; 'none' needed for cross-site
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 */

export async function requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = sendOtpSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Validation failed', errors: parseResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) })
      return
    }
    const result = await sendOtp(parseResult.data)
    res.status(200).json({ status: 'success', data: result })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('already exists') || err.message.includes('Too many') || err.message.includes('Please wait')) {
        res.status(400).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export async function verifyAndRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = verifyRegisterSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Validation failed', errors: parseResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) })
      return
    }
    const { user, token } = await verifyAndRegisterUser(parseResult.data)
    res.cookie(COOKIE_NAME, token, cookieOptions)
    res.status(201).json({ status: 'success', data: { user } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('already exists')) { res.status(409).json({ status: 'error', message: err.message }); return }
      if (err.message.includes('OTP') || err.message.includes('attempts')) { res.status(400).json({ status: 'error', message: err.message }); return }
    }
    next(err)
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      })
      return
    }

    const { user, token } = await loginUser(parseResult.data)

    res.cookie(COOKIE_NAME, token, cookieOptions)

    res.status(200).json({
      status: 'success',
      data: { user },
    })
  } catch (err) {
    if (err instanceof Error) {
      // Invalid credentials — 401 Unauthorized
      if (err.message.includes('Invalid') || err.message.includes('deactivated')) {
        res.status(401).json({ status: 'error', message: err.message })
        return
      }
    }
    next(err)
  }
}

/**
 * GET /api/v1/auth/me
 * Returns the current authenticated user based on the cookie.
 * Used by the frontend on app load to restore session.
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.userId is set by the authenticate middleware
    const userId = (req as Request & { userId?: string }).userId

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' })
      return
    }

    const user = await getUserById(userId)
    if (!user) {
      // Token was valid but user no longer exists or is deactivated
      res.clearCookie(COOKIE_NAME, { path: '/' })
      res.status(401).json({ status: 'error', message: 'Session expired' })
      return
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/auth/logout
 * Clears the authentication cookie.
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  })
}


export async function customerLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = customerLoginSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: parseResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      })
      return
    }

    const { user, token } = await verifyCustomerOtpLogin(parseResult.data)

    res.cookie(COOKIE_NAME, token, cookieOptions)

    res.status(200).json({
      status: 'success',
      data: { user },
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('attempts') || err.message.includes('not found')) {
        res.status(401).json({ status: 'error', message: err.message })
        return
      }
    }
    next(err)
  }
}
