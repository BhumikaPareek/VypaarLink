import { Request, Response, NextFunction } from 'express'
import * as customerService from './service'
import { addCustomerSchema, updateCustomerSchema } from './schemas'
import { prisma } from '../../lib/prisma'

const getShop = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not set up yet')
  return shop
}

export const listCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const customers = await customerService.getShopCustomers(shop.id)
    res.json({ status: 'success', data: { customers } })
  } catch (err) {
    if (err instanceof Error && err.message.includes('not set up')) {
      res.status(404).json({ status: 'error', message: err.message }); return
    }
    next(err)
  }
}

export const addCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const data = addCustomerSchema.parse(req.body)
    const shopCustomer = await customerService.addCustomerToShop(shop.id, req.userId!, data)
    res.json({ status: 'success', data: { customer: shopCustomer } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('not set up')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
      if (err.message.includes('already connected')) {
        res.status(409).json({ status: 'error', message: err.message }); return
      }
      if (err.message.includes('registered as a shopkeeper')) {
        res.status(403).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export const getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const data = await customerService.getCustomerDetail(shop.id, (req.params.customerId as string))
    res.json({ status: 'success', data: { customer: data } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('not set up') || err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const data = updateCustomerSchema.parse(req.body)
    
    const existing = await prisma.shopCustomer.findUnique({
      where: { shopId_customerId: { shopId: shop.id, customerId: (req.params.customerId as string) } }
    })
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Customer not found' }); return
    }
    
    await prisma.user.update({
      where: { id: (req.params.customerId as string) },
      data: { name: data.name }
    })
    
    res.json({ status: 'success', data: { message: 'Customer updated successfully' } })
  } catch (err) {
    if (err instanceof Error && err.message.includes('not set up')) {
      res.status(404).json({ status: 'error', message: err.message }); return
    }
    next(err)
  }
}

export const removeCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    await customerService.disconnectCustomer(shop.id, (req.params.customerId as string))
    res.json({ status: 'success', data: { message: 'Customer disconnected' } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('not set up') || err.message.includes('not connected')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}
