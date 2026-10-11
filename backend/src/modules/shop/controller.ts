import { Request, Response, NextFunction } from 'express'
import * as shopService from './service'
import { setupShopSchema, updateShopSchema } from './schemas'

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await shopService.getShopByOwnerId(req.userId!)
    res.json({ status: 'success', data: { shop } })
  } catch (err) {
    next(err)
  }
}

export const setupShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = setupShopSchema.parse(req.body)
    const shop = await shopService.createShop(req.userId!, data)
    res.json({ status: 'success', data: { shop } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('already exists')) {
        res.status(409).json({ status: 'error', message: err.message })
        return
      }
    }
    next(err)
  }
}

export const updateShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = updateShopSchema.parse(req.body)
    const shop = await shopService.getShopByOwnerId(req.userId!)
    if (!shop) {
      res.status(404).json({ status: 'error', message: 'Shop not found' })
      return
    }
    const updatedShop = await shopService.updateShop(shop.id, req.userId!, data)
    res.json({ status: 'success', data: { shop: updatedShop } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Access denied')) {
        res.status(403).json({ status: 'error', message: err.message })
        return
      }
      if (err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message })
        return
      }
    }
    next(err)
  }
}
