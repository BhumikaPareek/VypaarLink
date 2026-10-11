/**
 * middleware/authenticate.ts — JWT authentication middleware
 *
 * Reads the JWT from the HttpOnly cookie, verifies it, and attaches
 * the userId to the request object. Routes that require authentication
 * use this middleware.
 *
 * Usage:
 *   router.get('/protected', authenticate, handler)
 */

import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../modules/auth/service'

// Extend Express Request type to carry userId after authentication
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
    }
  }
}

const COOKIE_NAME = 'token'

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies[COOKIE_NAME]

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Authentication required' })
    return
  }

  const payload = verifyToken(token)

  if (!payload) {
    // Token is expired or tampered — clear it
    res.clearCookie(COOKIE_NAME, { path: '/' })
    res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.' })
    return
  }

  req.userId = payload.userId
  req.userRole = payload.role
  next()
}
