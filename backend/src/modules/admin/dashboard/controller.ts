/**
 * modules/admin/dashboard/controller.ts — Controller for Platform Admin Dashboard endpoints
 */

import type { Request, Response, NextFunction } from 'express'
import * as adminService from './service'

export async function getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getPlatformMetrics()
    res.status(200).json({ status: 'success', data })
  } catch (err) {
    next(err)
  }
}

export async function getShops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = typeof req.query['page'] === 'string' ? parseInt(req.query['page'], 10) : 1
    const limit = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 20
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined

    const data = await adminService.getShopsDirectory({ page, limit, search })
    res.status(200).json({ status: 'success', data })
  } catch (err) {
    next(err)
  }
}

export async function getComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = typeof req.query['page'] === 'string' ? parseInt(req.query['page'], 10) : 1
    const limit = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 20

    const data = await adminService.getFlaggedTransactions({ page, limit })
    res.status(200).json({ status: 'success', data })
  } catch (err) {
    next(err)
  }
}
