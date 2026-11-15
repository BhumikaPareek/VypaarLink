/**
 * modules/admin/auth/controller.ts — HTTP handlers for Platform Admin auth
 */

import type { Request, Response, NextFunction } from 'express'
import { adminLoginSchema } from './schemas'
import { loginAdmin, ADMIN_COOKIE_NAME } from './service'
import { getUserById } from '../../auth/service'

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
}

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = adminLoginSchema.safeParse(req.body)
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

    const { user, token } = await loginAdmin(parseResult.data)

    res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions)

    res.status(200).json({
      status: 'success',
      data: { user },
    })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Invalid') || err.message.includes('deactivated')) {
        res.status(401).json({ status: 'error', message: err.message })
        return
      }
      if (err.message.includes('Access denied')) {
        res.status(403).json({ status: 'error', message: err.message })
        return
      }
    }
    next(err)
  }
}

export async function adminLogout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' })
  res.status(200).json({
    status: 'success',
    message: 'Administrator logged out successfully',
  })
}

export async function adminMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Not authenticated as administrator' })
      return
    }

    const user = await getUserById(userId)
    if (!user || user.role !== 'PLATFORM_ADMIN' || !user.isActive) {
      res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' })
      res.status(401).json({ status: 'error', message: 'Administrator session invalid or expired' })
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
