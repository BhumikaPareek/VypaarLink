import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import * as service from './service'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  recordGoodsReceiptSchema,
  recordSupplierPaymentSchema,
} from './schemas'

const handleError = (res: Response, err: unknown) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ status: 'error', message: 'Validation failed', errors: err.errors })
  }
  if (err instanceof Error) {
    const statusMap: Record<string, number> = {
      'Purchase order not found': 404,
      'Supplier not found or is archived': 400,
      'Shop not found': 404,
    }
    const status = statusMap[err.message] ?? 400
    return res.status(status).json({ status: 'error', message: err.message })
  }
  return res.status(500).json({ status: 'error', message: 'Internal server error' })
}

export const listPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const { supplierId, status, search } = req.query as {
      supplierId?: string
      status?: string
      search?: string
    }
    const orders = await service.listPurchaseOrders(shop.id, { supplierId, status, search })
    res.json({ status: 'success', data: { purchaseOrders: orders } })
  } catch (err) { handleError(res, err) }
}

export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = createPurchaseOrderSchema.parse(req.body)
    const order = await service.createPurchaseOrder(shop.id, data)
    res.status(201).json({ status: 'success', data: { purchaseOrder: order } })
  } catch (err) { handleError(res, err) }
}

export const getPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const order = await service.getPurchaseOrder(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { purchaseOrder: order } })
  } catch (err) { handleError(res, err) }
}

export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = updatePurchaseOrderSchema.parse(req.body)
    const order = await service.updatePurchaseOrder(shop.id, req.params['id'] as string, data)
    res.json({ status: 'success', data: { purchaseOrder: order } })
  } catch (err) { handleError(res, err) }
}

export const placePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const order = await service.placePurchaseOrder(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { purchaseOrder: order } })
  } catch (err) { handleError(res, err) }
}

export const cancelPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const order = await service.cancelPurchaseOrder(shop.id, req.params['id'] as string)
    res.json({ status: 'success', data: { purchaseOrder: order } })
  } catch (err) { handleError(res, err) }
}

export const recordGoodsReceipt = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = recordGoodsReceiptSchema.parse(req.body)
    const receipt = await service.recordGoodsReceipt(shop.id, req.params['id'] as string, data)
    res.status(201).json({ status: 'success', data: { receipt } })
  } catch (err) { handleError(res, err) }
}

export const recordSupplierPayment = async (req: Request, res: Response) => {
  try {
    const shop = await service.getShopForKeeper(req.userId!)
    const data = recordSupplierPaymentSchema.parse(req.body)
    const payment = await service.recordSupplierPayment(shop.id, req.params['id'] as string, data)
    res.status(201).json({ status: 'success', data: { payment } })
  } catch (err) { handleError(res, err) }
}
