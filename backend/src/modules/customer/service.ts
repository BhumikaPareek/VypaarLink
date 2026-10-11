import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { addCustomerSchema } from './schemas'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const getShopCustomers = async (shopId: string) => {
  const connections = await prisma.shopCustomer.findMany({
    where: { shopId, isActive: true },
    include: { customer: true }
  })

  return Promise.all(connections.map(async (conn: any) => {
    const credits = await prisma.transaction.aggregate({
      where: { shopId, customerId: conn.customerId, deletedAt: null, type: 'CREDIT' },
      _sum: { amount: true },
      _max: { createdAt: true }
    })
    const payments = await prisma.transaction.aggregate({
      where: { shopId, customerId: conn.customerId, deletedAt: null, type: 'PAYMENT' },
      _sum: { amount: true },
      _max: { createdAt: true }
    })
    
    const cr = credits._sum.amount || new Prisma.Decimal(0)
    const pr = payments._sum.amount || new Prisma.Decimal(0)
    const outstandingBalance = cr.minus(pr)
    
    const last1 = credits._max.createdAt?.getTime() || 0
    const last2 = payments._max.createdAt?.getTime() || 0
    const lastTransaction = last1 > last2 ? new Date(last1) : (last2 > 0 ? new Date(last2) : null)

    const { passwordHash, ...safeCustomer } = conn.customer

    return {
      shopCustomerId: conn.id,
      customerId: safeCustomer.id,
      name: safeCustomer.name,
      phone: safeCustomer.phone,
      email: safeCustomer.email,
      outstandingBalance,
      lastTransactionAt: lastTransaction,
      joinedAt: conn.joinedAt
    }
  }))
}

export const addCustomerToShop = async (shopId: string, shopkeeperId: string, data: z.infer<typeof addCustomerSchema>) => {
  let user = await prisma.user.findUnique({ where: { phone: data.phone } })
  
  if (user) {
    if (user.role === 'SHOPKEEPER') {
      throw new Error('This number is registered as a shopkeeper account')
    }
  } else {
    const password = crypto.randomBytes(16).toString('hex')
    const passwordHash = await bcrypt.hash(password, 10)
    user = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        passwordHash,
        role: 'CUSTOMER',
        isClaimed: false
      }
    })
  }

  const existingConn = await prisma.shopCustomer.findUnique({
    where: {
      shopId_customerId: { shopId, customerId: user.id }
    }
  })

  if (existingConn) {
    if (existingConn.isActive) {
      throw new Error('Customer is already connected to this shop')
    } else {
      return prisma.shopCustomer.update({
        where: { id: existingConn.id },
        data: { isActive: true }
      })
    }
  }

  return prisma.shopCustomer.create({
    data: {
      shopId,
      customerId: user.id
    }
  })
}

export const getCustomerDetail = async (shopId: string, customerId: string) => {
  const shopCustomer = await prisma.shopCustomer.findUnique({
    where: { shopId_customerId: { shopId, customerId } },
    include: { customer: true }
  })
  if (!shopCustomer) throw new Error('Customer not found')

  const credits = await prisma.transaction.aggregate({
    where: { shopId, customerId, type: 'CREDIT', deletedAt: null },
    _sum: { amount: true }
  })
  const payments = await prisma.transaction.aggregate({
    where: { shopId, customerId, type: 'PAYMENT', deletedAt: null },
    _sum: { amount: true }
  })
  
  const totalCredit = credits._sum.amount || new Prisma.Decimal(0)
  const totalPayments = payments._sum.amount || new Prisma.Decimal(0)

  const transactions = await prisma.transaction.findMany({
    where: { shopId, customerId, deletedAt: null },
    orderBy: { createdAt: 'desc' }
  })

  const { passwordHash, ...safeCustomer } = shopCustomer.customer

  return {
    shopCustomerId: shopCustomer.id,
    customer: safeCustomer,
    outstandingBalance: totalCredit.minus(totalPayments),
    totalCredit,
    totalPayments,
    transactions
  }
}

export const disconnectCustomer = async (shopId: string, customerId: string) => {
  const existing = await prisma.shopCustomer.findUnique({
    where: { shopId_customerId: { shopId, customerId } }
  })
  if (!existing) throw new Error('Customer not connected')

  return prisma.shopCustomer.update({
    where: { id: existing.id },
    data: { isActive: false }
  })
}

export const getCustomerBalance = async (shopId: string, customerId: string) => {
  const credits = await prisma.transaction.aggregate({
    where: { shopId, customerId, type: 'CREDIT', deletedAt: null },
    _sum: { amount: true }
  })
  const payments = await prisma.transaction.aggregate({
    where: { shopId, customerId, type: 'PAYMENT', deletedAt: null },
    _sum: { amount: true }
  })
  const cr = credits._sum.amount || new Prisma.Decimal(0)
  const pr = payments._sum.amount || new Prisma.Decimal(0)
  return cr.minus(pr)
}
