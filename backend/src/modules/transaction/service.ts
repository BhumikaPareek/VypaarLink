import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { createCreditSchema, createPaymentSchema, flagTransactionSchema } from './schemas'

export const getShopTransactions = async (shopId: string, filters: { customerId?: string, type?: 'CREDIT' | 'PAYMENT', page?: number, limit?: number } = {}) => {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const skip = (page - 1) * limit
  
  const where: Prisma.TransactionWhereInput = { shopId, deletedAt: null }
  if (filters.customerId) where.customerId = filters.customerId
  if (filters.type) where.type = filters.type

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      recordedBy: { select: { id: true, name: true } }
    }
  })
  
  const customerIds = [...new Set(transactions.map((t: any) => t.customerId))]
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true }
  })
  
  const total = await prisma.transaction.count({ where })
  
  return {
    transactions: transactions.map((t: any) => {
      const cust = customers.find((c: any) => c.id === t.customerId)
      return { ...t, customerName: cust?.name || 'Unknown' }
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

const verifyCustomerInShop = async (shopId: string, customerId: string) => {
  const conn = await prisma.shopCustomer.findUnique({
    where: { shopId_customerId: { shopId, customerId } }
  })
  if (!conn || !conn.isActive) {
    throw new Error('Customer not found or not connected to this shop')
  }
}

import { deductStockForSale } from '../inventory/service'

export const createCreditTransaction = async (shopId: string, recordedById: string, data: z.infer<typeof createCreditSchema>) => {
  await verifyCustomerInShop(shopId, data.customerId)

  if (data.items && data.items.length > 0) {
    const sortedItems = [...data.items].sort((a, b) => a.productId.localeCompare(b.productId))

    return prisma.$transaction(async (tx) => {
      await deductStockForSale(tx, shopId, sortedItems)

      return tx.transaction.create({
        data: {
          shopId,
          customerId: data.customerId,
          amount: new Prisma.Decimal(data.amount),
          type: 'CREDIT',
          note: data.note || null,
          recordedById,
          transactionDate: data.transactionDate || new Date(),
          dueDate: data.dueDate || null,
        }
      })
    })
  }

  return prisma.transaction.create({
    data: {
      shopId,
      customerId: data.customerId,
      amount: new Prisma.Decimal(data.amount),
      type: 'CREDIT',
      note: data.note || null,
      recordedById,
      transactionDate: data.transactionDate || new Date(),
      dueDate: data.dueDate || null,
    }
  })
}

export const createPaymentTransaction = async (shopId: string, recordedById: string, data: z.infer<typeof createPaymentSchema>) => {
  await verifyCustomerInShop(shopId, data.customerId)
  return prisma.transaction.create({
    data: {
      shopId,
      customerId: data.customerId,
      amount: new Prisma.Decimal(data.amount),
      type: 'PAYMENT',
      note: data.note || null,
      recordedById,
      transactionDate: data.transactionDate || new Date(),
      paymentMethod: data.paymentMethod || null,
      reference: data.reference || null,
    }
  })
}

export const getCustomerTransactions = async (shopId: string, customerId: string, filters: { type?: 'CREDIT' | 'PAYMENT' } = {}) => {
  await verifyCustomerInShop(shopId, customerId)
  
  const where: Prisma.TransactionWhereInput = { shopId, customerId, deletedAt: null }
  if (filters.type) where.type = filters.type
  
  return prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      recordedBy: { select: { id: true, name: true } }
    }
  })
}

export const confirmTransaction = async (transactionId: string, userId: string) => {
  const t = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!t) throw new Error('Transaction not found')
  if (t.customerId !== userId) throw new Error('Access denied')
  if (t.status !== 'PENDING') throw new Error('Only PENDING transactions can be confirmed')
  
  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date()
    }
  })
}

export const flagTransaction = async (transactionId: string, userId: string, flagReason: string) => {
  const t = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!t) throw new Error('Transaction not found')
  if (t.customerId !== userId) throw new Error('Access denied')
  if (t.status !== 'PENDING' && t.status !== 'CONFIRMED') {
    throw new Error('Transaction cannot be flagged in current status')
  }
  
  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'FLAGGED',
      flaggedAt: new Date(),
      flagReason
    }
  })
}
