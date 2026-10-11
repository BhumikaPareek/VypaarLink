import { Request, Response, NextFunction } from 'express'
import * as dashboardService from './service'

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await dashboardService.getDashboardData(req.userId!)
    res.json({ status: 'success', data })
  } catch (err) {
    next(err)
  }
}

export const getCustomerDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await dashboardService.getCustomerDashboardData(req.userId!)
    res.json({ status: 'success', data })
  } catch (err) {
    next(err)
  }
}
