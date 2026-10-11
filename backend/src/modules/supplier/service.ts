import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type { createSupplierSchema, updateSupplierSchema } from './schemas'

export const getShopForKeeper = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not found')
  return shop
}

export const createSupplier = async (
  shopId: string,
  data: z.infer<typeof createSupplierSchema>
) => {
  return prisma.supplier.create({
    data: {
      shopId,
      name: data.name,
      contactPerson: data.contactPerson || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      gstin: data.gstin || null,
      notes: data.notes || null,
      isActive: true,
    },
  })
}

export const listSuppliers = async (
  shopId: string,
  filters: {
    search?: string
    isActive?: boolean
  } = {}
) => {
  const where: Prisma.SupplierWhereInput = { shopId }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive
  } else {
    where.isActive = true
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { contactPerson: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
      { gstin: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          purchaseOrders: true,
          payments: true,
        },
      },
    },
  })

  return suppliers
}

export const getSupplier = async (shopId: string, supplierId: string) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, shopId },
    include: {
      purchaseOrders: {
        orderBy: { orderDate: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
    },
  })
  if (!supplier) throw new Error('Supplier not found')
  return supplier
}

export const updateSupplier = async (
  shopId: string,
  supplierId: string,
  data: z.infer<typeof updateSupplierSchema>
) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, shopId } })
  if (!supplier) throw new Error('Supplier not found')

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.gstin !== undefined && { gstin: data.gstin || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  })
}

export const archiveSupplier = async (shopId: string, supplierId: string) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, shopId } })
  if (!supplier) throw new Error('Supplier not found')

  return prisma.supplier.update({
    where: { id: supplierId },
    data: { isActive: false },
  })
}

export const restoreSupplier = async (shopId: string, supplierId: string) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, shopId } })
  if (!supplier) throw new Error('Supplier not found')

  return prisma.supplier.update({
    where: { id: supplierId },
    data: { isActive: true },
  })
}

export const getSupplierStats = async (shopId: string) => {
  const activeSuppliersCount = await prisma.supplier.count({
    where: { shopId, isActive: true },
  })

  const openOrdersCount = await prisma.purchaseOrder.count({
    where: {
      shopId,
      status: { in: ['PLACED', 'PARTIALLY_RECEIVED'] },
    },
  })

  // Pending deliveries count
  const pendingDeliveriesCount = await prisma.purchaseOrder.count({
    where: {
      shopId,
      status: { in: ['PLACED', 'PARTIALLY_RECEIVED'] },
    },
  })

  // Total outstanding across all non-cancelled orders
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      shopId,
      status: { not: 'CANCELLED' },
    },
    select: {
      totalAmount: true,
      paidAmount: true,
    },
  })

  let totalOutstanding = new Prisma.Decimal(0)
  for (const o of orders) {
    const balance = o.totalAmount.minus(o.paidAmount)
    if (balance.greaterThan(0)) {
      totalOutstanding = totalOutstanding.plus(balance)
    }
  }

  return {
    totalSuppliers: activeSuppliersCount,
    openOrdersCount,
    pendingDeliveriesCount,
    totalOutstanding: totalOutstanding.toFixed(2),
  }
}
