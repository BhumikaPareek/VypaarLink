import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type { createProductSchema, updateProductSchema } from './schemas'

export const getShopForKeeper = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not found')
  return shop
}

export const createProduct = async (
  shopId: string,
  data: z.infer<typeof createProductSchema>
) => {
  const { quantity, ...rest } = data

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        shopId,
        name: rest.name,
        sku: rest.sku ?? null,
        category: rest.category ?? null,
        price: new Prisma.Decimal(rest.price),
        quantity: quantity ?? 0,
        unit: rest.unit ?? 'pcs',
        lowStockThreshold: rest.lowStockThreshold ?? 5,
      },
    })

    if ((quantity ?? 0) > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          shopId,
          type: 'OPENING_STOCK',
          quantity: quantity ?? 0,
          note: 'Initial opening stock',
        },
      })
    }

    return product
  })
}

export const listProducts = async (
  shopId: string,
  filters: {
    search?: string
    category?: string
    stockStatus?: 'low' | 'out' | 'all'
    isActive?: boolean
  } = {}
) => {
  const where: Prisma.ProductWhereInput = { shopId }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive
  } else {
    where.isActive = true
  }

  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' }
  }

  if (filters.category) {
    where.category = { equals: filters.category, mode: 'insensitive' }
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  })

  if (filters.stockStatus === 'out') {
    return products.filter((p) => p.quantity === 0)
  }
  if (filters.stockStatus === 'low') {
    return products.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold)
  }

  return products
}

export const getProduct = async (shopId: string, productId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, shopId },
    include: { movements: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!product) throw new Error('Product not found')
  return product
}

export const updateProduct = async (
  shopId: string,
  productId: string,
  data: z.infer<typeof updateProductSchema>
) => {
  const product = await prisma.product.findFirst({ where: { id: productId, shopId } })
  if (!product) throw new Error('Product not found')

  return prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.price !== undefined && { price: new Prisma.Decimal(data.price) }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
    },
  })
}

export const archiveProduct = async (shopId: string, productId: string) => {
  const product = await prisma.product.findFirst({ where: { id: productId, shopId } })
  if (!product) throw new Error('Product not found')

  return prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  })
}

export const restoreProduct = async (shopId: string, productId: string) => {
  const product = await prisma.product.findFirst({ where: { id: productId, shopId } })
  if (!product) throw new Error('Product not found')

  return prisma.product.update({
    where: { id: productId },
    data: { isActive: true },
  })
}

export const adjustStock = async (
  shopId: string,
  productId: string,
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT',
  quantity: number,
  note?: string
) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: productId, shopId } })
    if (!product) throw new Error('Product not found')

    let newQuantity: number

    if (type === 'STOCK_IN') {
      newQuantity = product.quantity + quantity
    } else if (type === 'STOCK_OUT') {
      newQuantity = product.quantity - quantity
      if (newQuantity < 0) throw new Error('Insufficient stock')
    } else {
      newQuantity = quantity
      if (newQuantity < 0) throw new Error('Quantity cannot be negative')
    }

    const updated = await tx.product.update({
      where: { id: productId },
      data: { quantity: newQuantity },
    })

    await tx.stockMovement.create({
      data: {
        productId,
        shopId,
        type,
        quantity,
        note: note ?? null,
      },
    })

    return updated
  })
}

export const getStockMovements = async (shopId: string, productId: string) => {
  const product = await prisma.product.findFirst({ where: { id: productId, shopId } })
  if (!product) throw new Error('Product not found')

  return prisma.stockMovement.findMany({
    where: { productId, shopId },
    orderBy: { createdAt: 'desc' },
  })
}

export const getInventoryStats = async (shopId: string) => {
  const products = await prisma.product.findMany({
    where: { shopId, isActive: true },
  })

  const totalProducts = products.length
  let totalStockValue = new Prisma.Decimal(0)
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const p of products) {
    totalStockValue = totalStockValue.plus(p.price.mul(p.quantity))
    if (p.quantity === 0) outOfStockCount++
    else if (p.quantity <= p.lowStockThreshold) lowStockCount++
  }

  return {
    totalProducts,
    totalStockValue: totalStockValue.toFixed(2),
    lowStockCount,
    outOfStockCount,
  }
}

export const deductStockForSale = async (
  tx: Prisma.TransactionClient,
  shopId: string,
  items: Array<{ productId: string; quantity: number }>
) => {
  for (const item of items) {
    const product = await tx.product.findFirst({
      where: { id: item.productId, shopId, isActive: true },
    })
    if (!product) throw new Error(`Product not found or inactive: ${item.productId}`)
    const newQty = product.quantity - item.quantity
    if (newQty < 0) throw new Error(`Insufficient stock for product: ${product.name} (available: ${product.quantity})`)

    await tx.product.update({
      where: { id: item.productId },
      data: { quantity: newQty },
    })

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        shopId,
        type: 'SALE',
        quantity: item.quantity,
        note: 'Credit sale',
      },
    })
  }
}
