import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import * as service from './service'
import { createSupplierSchema, updateSupplierSchema } from './schemas'

const handleError = (res: Response, err: unknown) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', errors: err.errors })
  }
  if (err instanceof Error) {
    const statusMap: Record<string, number> = {
      'Supplier not found': 404,
      'Shop not found': 404,
    }
    const status = statusMap[err.message]
    if (status) {
      return res.status(status).json({ status: 'error', message: err.message })
    }
    console.error('[SUPPLIER ERROR]', err)
    return res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
  return res.status(500).json({ status: 'error', message: 'Internal server error' })
}

export const getStats = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const stats = await service.getSupplierStats(shop.id)
    res.json({ status: 'success', data: stats })
  } catch (err) { handleError(res, err) }
}

export const listSuppliers = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const { search, isActive } = req.query as {
      search?: string
      isActive?: string
    }
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined
    const suppliers = await service.listSuppliers(shop.id, { search, isActive: isActiveBool })
    res.json({ status: 'success', data: { suppliers } })
  } catch (err) { handleError(res, err) }
}

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = createSupplierSchema.parse(req.body)
    const supplier = await service.createSupplier(shop.id, data)
    res.status(201).json({ status: 'success', data: { supplier } })
  } catch (err) { handleError(res, err) }
}

export const getSupplier = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const supplier = await service.getSupplier(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { supplier } })
  } catch (err) { handleError(res, err) }
}

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = updateSupplierSchema.parse(req.body)
    const supplier = await service.updateSupplier(shop.id, req.params['id'] as string, data)
    res.json({ status: 'success', data: { supplier } })
  } catch (err) { handleError(res, err) }
}

export const archiveSupplier = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const supplier = await service.archiveSupplier(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { supplier } })
  } catch (err) { handleError(res, err) }
}

export const restoreSupplier = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const supplier = await service.restoreSupplier(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { supplier } })
  } catch (err) { handleError(res, err) }
}
