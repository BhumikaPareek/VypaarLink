import { Request, Response, NextFunction } from 'express'

export function requireRole(role: 'SHOPKEEPER' | 'CUSTOMER' | 'PLATFORM_ADMIN') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.userRole !== role) {
      res.status(403).json({ status: 'error', message: 'Access denied' })
      return
    }
    next()
  }
}
