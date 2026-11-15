/**
 * middleware/requireAdmin.ts — Role authorization guard for Platform Admin
 */

import type { Request, Response, NextFunction } from 'express'

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== 'PLATFORM_ADMIN') {
    res.status(403).json({ status: 'error', message: 'Access denied: Requires platform administrator privileges' })
    return
  }
  next()
}
