/**
 * modules/admin/dashboard/service.ts — Service layer for Platform Admin Dashboard
 */

import { prisma } from '../../../lib/prisma'

export async function getPlatformMetrics() {
  const [
    totalShops,
    activeShops,
    totalCustomers,
    totalShopkeepers,
    totalTransactions,
    pendingTransactions,
    confirmedTransactions,
    flaggedTransactions,
  ] = await Promise.all([
    prisma.shop.count(),
    prisma.shop.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'SHOPKEEPER' } }),
    prisma.transaction.count({ where: { deletedAt: null } }),
    prisma.transaction.count({ where: { status: 'PENDING', deletedAt: null } }),
    prisma.transaction.count({ where: { status: 'CONFIRMED', deletedAt: null } }),
    prisma.transaction.count({ where: { status: 'FLAGGED', deletedAt: null } }),
  ])

  return {
    shops: {
      total: totalShops,
      active: activeShops,
      inactive: totalShops - activeShops,
    },
    users: {
      totalCustomers,
      totalShopkeepers,
      totalUsers: totalCustomers + totalShopkeepers,
    },
    transactions: {
      total: totalTransactions,
      pending: pendingTransactions,
      confirmed: confirmedTransactions,
      flagged: flaggedTransactions,
    },
  }
}

export async function getShopsDirectory(options: { page?: number; limit?: number; search?: string } = {}) {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const skip = (page - 1) * limit

  const where: any = {}
  if (options.search && options.search.trim()) {
    const query = options.search.trim()
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
      { address: { contains: query, mode: 'insensitive' } },
      { owner: { name: { contains: query, mode: 'insensitive' } } },
      { owner: { phone: { contains: query, mode: 'insensitive' } } },
    ]
  }

  const [total, shops] = await Promise.all([
    prisma.shop.count({ where }),
    prisma.shop.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            customers: { where: { isActive: true } },
            transactions: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ])

  const formattedShops = shops.map((shop) => ({
    id: shop.id,
    name: shop.name,
    description: shop.description,
    address: shop.address,
    phone: shop.phone,
    isActive: shop.isActive,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    owner: shop.owner,
    customerCount: shop._count.customers,
    transactionCount: shop._count.transactions,
  }))

  return {
    shops: formattedShops,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

export async function getFlaggedTransactions(options: { page?: number; limit?: number } = {}) {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const skip = (page - 1) * limit

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({
      where: { status: 'FLAGGED', deletedAt: null },
    }),
    prisma.transaction.findMany({
      where: { status: 'FLAGGED', deletedAt: null },
      skip,
      take: limit,
      orderBy: { flaggedAt: 'desc' },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        note: true,
        flagReason: true,
        flaggedAt: true,
        transactionDate: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customerId: true,
        recordedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    }),
  ])

  const customerIds = Array.from(new Set(transactions.map((t) => t.customerId)))
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true },
  })
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  const items = transactions.map((t) => ({
    id: t.id,
    amount: t.amount.toString(),
    type: t.type,
    status: t.status,
    note: t.note,
    flagReason: t.flagReason || 'No reason provided',
    flaggedAt: t.flaggedAt || t.createdAt,
    transactionDate: t.transactionDate,
    shop: t.shop,
    customer: customerMap.get(t.customerId) || { id: t.customerId, name: 'Unknown Customer', phone: '' },
    recordedBy: t.recordedBy,
  }))

  return {
    complaints: items,
    disputes: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}
