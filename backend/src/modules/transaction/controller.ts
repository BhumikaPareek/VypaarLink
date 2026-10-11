import { Request, Response, NextFunction } from 'express'
import * as transactionService from './service'
import { createCreditSchema, createPaymentSchema, flagTransactionSchema } from './schemas'
import { prisma } from '../../lib/prisma'

const getShop = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not set up yet')
  return shop
}

export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const filters = {
      customerId: typeof req.query.customerId === 'string' ? req.query.customerId : undefined,
      type: typeof req.query.type === 'string' ? req.query.type as 'CREDIT' | 'PAYMENT' : undefined,
      page: typeof req.query.page === 'string' ? parseInt(req.query.page) : 1,
      limit: typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 20
    }
    const result = await transactionService.getShopTransactions(shop.id, filters)
    res.json({ status: 'success', data: result })
  } catch (err) {
    if (err instanceof Error && err.message.includes('not set up')) {
      res.status(404).json({ status: 'error', message: err.message }); return
    }
    next(err)
  }
}

export const createCredit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const data = createCreditSchema.parse(req.body)
    const transaction = await transactionService.createCreditTransaction(shop.id, req.userId!, data)
    res.json({ status: 'success', data: { transaction } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('not set up') || err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export const createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const data = createPaymentSchema.parse(req.body)
    const transaction = await transactionService.createPaymentTransaction(shop.id, req.userId!, data)
    res.json({ status: 'success', data: { transaction } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('not set up') || err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export const getCustomerTransactionsRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shop = await getShop(req.userId!)
    const transactions = await transactionService.getCustomerTransactions(shop.id, (req.params.customerId as string), {
      type: typeof req.query.type === 'string' ? req.query.type as 'CREDIT' | 'PAYMENT' : undefined
    })
    res.json({ status: 'success', data: { transactions } })
  } catch (err) {
    if (err instanceof Error && err.message.includes('not set up')) {
      res.status(404).json({ status: 'error', message: err.message }); return
    }
    next(err)
  }
}

export const confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await transactionService.confirmTransaction((req.params.id as string), req.userId!)
    res.json({ status: 'success', data: { transaction } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Access denied')) {
        res.status(403).json({ status: 'error', message: err.message }); return
      }
      if (err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
      if (err.message.includes('Only PENDING')) {
        res.status(400).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export const flag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = flagTransactionSchema.parse(req.body)
    const transaction = await transactionService.flagTransaction((req.params.id as string), req.userId!, data.flagReason)
    res.json({ status: 'success', data: { transaction } })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('Access denied')) {
        res.status(403).json({ status: 'error', message: err.message }); return
      }
      if (err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message }); return
      }
      if (err.message.includes('cannot be flagged')) {
        res.status(400).json({ status: 'error', message: err.message }); return
      }
    }
    next(err)
  }
}

export const getMyTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transactions = await transactionService.getCustomerTransactions((req.params.shopId as string), req.userId!, {
      type: typeof req.query.type === 'string' ? req.query.type as 'CREDIT' | 'PAYMENT' : undefined
    })
    res.json({ status: 'success', data: { transactions } })
  } catch (err) {
    if (err instanceof Error && err.message.includes('not connected')) {
      res.status(403).json({ status: 'error', message: err.message }); return
    }
    next(err)
  }
}
