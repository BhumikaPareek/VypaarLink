import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import * as service from './service'
import { createProductSchema, updateProductSchema, adjustStockSchema } from './schemas'

const handleError = (res: Response, err: unknown) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', errors: err.errors })
  }
  if (err instanceof Error) {
    const statusMap: Record<string, number> = {
      'Product not found': 404,
      'Shop not found': 404,
      'Insufficient stock': 400,
    }
    const status = statusMap[err.message]
    if (status) {
      return res.status(status).json({ status: 'error', message: err.message })
    }
    console.error('[INVENTORY ERROR]', err)
    return res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
  return res.status(500).json({ status: 'error', message: 'Internal server error' })
}

export const getStats = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const stats = await service.getInventoryStats(shop.id)
    res.json({ status: 'success', data: stats })
  } catch (err) { handleError(res, err) }
}

export const listProducts = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const { search, category, stockStatus, isActive } = req.query as {
      search?: string
      category?: string
      stockStatus?: 'low' | 'out' | 'all'
      isActive?: string
    }
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined
    const products = await service.listProducts(shop.id, { search, category, stockStatus, isActive: isActiveBool })
    res.json({ status: 'success', data: { products } })
  } catch (err) { handleError(res, err) }
}

export const createProduct = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = createProductSchema.parse(req.body)
    const product = await service.createProduct(shop.id, data)
    res.status(201).json({ status: 'success', data: { product } })
  } catch (err) { handleError(res, err) }
}

export const getProduct = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const product = await service.getProduct(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { product } })
  } catch (err) { handleError(res, err) }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = updateProductSchema.parse(req.body)
    const product = await service.updateProduct(shop.id, req.params['id'] as string, data)
    res.json({ status: 'success', data: { product } })
  } catch (err) { handleError(res, err) }
}

export const archiveProduct = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const product = await service.archiveProduct(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { product } })
  } catch (err) { handleError(res, err) }
}

export const restoreProduct = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const product = await service.restoreProduct(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { product } })
  } catch (err) { handleError(res, err) }
}

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const { type, quantity, note } = adjustStockSchema.parse(req.body)
    const product = await service.adjustStock(shop.id, req.params['id'] as string, type, quantity, note)
    res.json({ status: 'success', data: { product } })
  } catch (err) { handleError(res, err) }
}

export const getMovements = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const movements = await service.getStockMovements(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { movements } })
  } catch (err) { handleError(res, err) }
}
