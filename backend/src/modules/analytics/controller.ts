import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import * as service from './service'
import { analyticsQuerySchema } from './schemas'

const handleError = (res: Response, err: unknown) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors,
    })
  }
  if (err instanceof Error) {
    const statusMap: Record<string, number> = {
      'Shop not found': 404,
    }
    const status = statusMap[err.message] ?? 400
    return res.status(status).json({ status: 'error', message: err.message })
  }
  return res.status(500).json({ status: 'error', message: 'Internal server error' })
}

export const getOverview = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const query = analyticsQuerySchema.parse(req.query)
    const data = await service.getOverview(shop.id, query)
    res.json({ status: 'success', data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getCreditAging = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = await service.getCreditAging(shop.id)
    res.json({ status: 'success', data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getCashflow = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const query = analyticsQuerySchema.parse(req.query)
    const data = await service.getCashflow(shop.id, query)
    res.json({ status: 'success', data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getInventoryInsights = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const query = analyticsQuerySchema.parse(req.query)
    const data = await service.getInventoryInsights(shop.id, query)
    res.json({ status: 'success', data })
  } catch (err) {
    handleError(res, err)
  }
}

export const getSupplierInsights = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const query = analyticsQuerySchema.parse(req.query)
    const data = await service.getSupplierInsights(shop.id, query)
    res.json({ status: 'success', data })
  } catch (err) {
    handleError(res, err)
  }
}
