/**
 * middleware/authenticateAdmin.ts — JWT authentication middleware for Platform Admin
 *
 * Reads the JWT from the separate HttpOnly 'admin_token' cookie, verifies it,
 * checks database for active status, and attaches userId and userRole to the request object.
 */

import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../modules/auth/service'
import { prisma } from '../lib/prisma'
import { ADMIN_COOKIE_NAME } from '../modules/admin/auth/service'

export async function authenticateAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: string | undefined = req.cookies[ADMIN_COOKIE_NAME]

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Administrator authentication required' })
    return
  }

  const payload = verifyToken(token)

  if (!payload) {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' })
    res.status(401).json({ status: 'error', message: 'Administrator session expired. Please log in again.' })
    return
  }

  if (payload.role !== 'PLATFORM_ADMIN') {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' })
    res.status(403).json({ status: 'error', message: 'Access denied: Requires platform administrator privileges' })
    return
  }

  // Verify against database to enforce active status and prevent revoked/deactivated admins
  const admin = await prisma.user.findUnique({ where: { id: payload.userId } })

  if (!admin || !admin.isActive || admin.role !== 'PLATFORM_ADMIN') {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' })
    res.status(403).json({ status: 'error', message: 'Administrator account is inactive or unauthorized' })
    return
  }

  req.userId = admin.id
  req.userRole = admin.role
  next()
}
