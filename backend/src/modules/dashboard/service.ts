import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export const getDashboardData = async (shopkeeperId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: shopkeeperId } })
  if (!shop) {
    return {
      shop: null,
      totalCustomers: 0,
      totalOutstanding: '0.00',
      totalPaymentsReceived: '0.00',
      totalCreditGiven: '0.00',
      recentTransactions: [],
      quickStats: { confirmedCount: 0, pendingCount: 0, flaggedCount: 0 }
    }
  }

  const totalCustomers = await prisma.shopCustomer.count({
    where: { shopId: shop.id, isActive: true }
  })

  const credits = await prisma.transaction.aggregate({
    where: { shopId: shop.id, type: 'CREDIT', deletedAt: null },
    _sum: { amount: true }
  })
  
  const payments = await prisma.transaction.aggregate({
    where: { shopId: shop.id, type: 'PAYMENT', deletedAt: null },
    _sum: { amount: true }
  })

  const cr = credits._sum.amount || new Prisma.Decimal(0)
  const pr = payments._sum.amount || new Prisma.Decimal(0)
  
  const recentTransactions = await prisma.transaction.findMany({
    where: { shopId: shop.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      recordedBy: { select: { id: true, name: true } }
    }
  })
  
  const customerIds = [...new Set(recentTransactions.map((t: any) => t.customerId))]
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true }
  })
  
  const recentWithCustomers = recentTransactions.map((t: any) => ({
    ...t,
    customerName: customers.find((c: any) => c.id === t.customerId)?.name || 'Unknown'
  }))

  const confirmedCount = await prisma.transaction.count({
    where: { shopId: shop.id, status: 'CONFIRMED', deletedAt: null }
  })
  const pendingCount = await prisma.transaction.count({
    where: { shopId: shop.id, status: 'PENDING', deletedAt: null }
  })
  const flaggedCount = await prisma.transaction.count({
    where: { shopId: shop.id, status: 'FLAGGED', deletedAt: null }
  })

  return {
    shop,
    totalCustomers,
    totalOutstanding: cr.minus(pr).toFixed(2),
    totalPaymentsReceived: pr.toFixed(2),
    totalCreditGiven: cr.toFixed(2),
    recentTransactions: recentWithCustomers,
    quickStats: { confirmedCount, pendingCount, flaggedCount }
  }
}

export const getCustomerDashboardData = async (customerId: string) => {
  const shopConnections = await prisma.shopCustomer.findMany({
    where: { customerId, isActive: true },
    include: { shop: true }
  })

  let totalOutstanding = new Prisma.Decimal(0)
  let pendingConfirmations = 0

  const shopsData = await Promise.all(shopConnections.map(async (conn) => {
    const credits = await prisma.transaction.aggregate({
      where: { shopId: conn.shopId, customerId, type: 'CREDIT', deletedAt: null },
      _sum: { amount: true }
    })
    const payments = await prisma.transaction.aggregate({
      where: { shopId: conn.shopId, customerId, type: 'PAYMENT', deletedAt: null },
      _sum: { amount: true }
    })

    const cr = credits._sum.amount || new Prisma.Decimal(0)
    const pr = payments._sum.amount || new Prisma.Decimal(0)
    const outstanding = cr.minus(pr)

    totalOutstanding = totalOutstanding.plus(outstanding)

    const pending = await prisma.transaction.count({
      where: { shopId: conn.shopId, customerId, status: 'PENDING', deletedAt: null }
    })
    pendingConfirmations += pending

    return {
      shopId: conn.shop.id,
      shopName: conn.shop.name,
      outstandingBalance: outstanding.toFixed(2),
      joinedAt: conn.joinedAt
    }
  }))

  const recentTransactions = await prisma.transaction.findMany({
    where: { customerId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: {
      shop: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } }
    }
  })

  return {
    totalOutstanding: totalOutstanding.toFixed(2),
    connectedShopsCount: shopsData.length,
    pendingConfirmations,
    shops: shopsData,
    recentTransactions
  }
}
