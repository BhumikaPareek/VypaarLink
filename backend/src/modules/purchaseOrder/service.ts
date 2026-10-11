import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  recordGoodsReceiptSchema,
  recordSupplierPaymentSchema,
} from './schemas'

export const getShopForKeeper = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not found')
  return shop
}

/**
 * Generate human-readable order number: PO-YYYYMMDD-XXXX
 */
const generateOrderNumber = async (shopId: string): Promise<string> => {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.purchaseOrder.count({ where: { shopId } })
  const seq = String(count + 1).padStart(4, '0')
  return `PO-${dateStr}-${seq}`
}

export const createPurchaseOrder = async (
  shopId: string,
  data: z.infer<typeof createPurchaseOrderSchema>
) => {
  // 1. Verify supplier belongs to this shop and is active
  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, shopId, isActive: true },
  })
  if (!supplier) throw new Error('Supplier not found or is archived')

  // 2. Verify all products belong to this shop and are active
  const productIds = data.items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, shopId, isActive: true },
  })
  if (products.length !== productIds.length) {
    throw new Error('One or more selected products are invalid, inactive, or archived')
  }

  // 3. Calculate line totals and overall total
  let totalAmount = new Prisma.Decimal(0)
  const itemsData = data.items.map((item) => {
    const unitCost = new Prisma.Decimal(item.unitCost)
    const lineTotal = unitCost.mul(item.quantityOrdered)
    totalAmount = totalAmount.plus(lineTotal)
    return {
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: 0,
      unitCost,
      totalCost: lineTotal,
    }
  })

  const orderNumber = await generateOrderNumber(shopId)

  return prisma.purchaseOrder.create({
    data: {
      shopId,
      supplierId: data.supplierId,
      orderNumber,
      orderDate: data.orderDate || new Date(),
      expectedDate: data.expectedDate || null,
      status: 'DRAFT',
      totalAmount,
      paidAmount: new Prisma.Decimal(0),
      notes: data.notes || null,
      items: {
        create: itemsData,
      },
    },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
  })
}

export const listPurchaseOrders = async (
  shopId: string,
  filters: {
    supplierId?: string
    status?: string
    search?: string
  } = {}
) => {
  const where: Prisma.PurchaseOrderWhereInput = { shopId }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId
  }

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status as any
  }

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: 'insensitive' } },
      { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
    ]
  }

  return prisma.purchaseOrder.findMany({
    where,
    orderBy: { orderDate: 'desc' },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, unit: true } },
        },
      },
      _count: { select: { receipts: true, payments: true } },
    },
  })
}

export const getPurchaseOrder = async (shopId: string, orderId: string) => {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, shopId },
    include: {
      supplier: true,
      items: {
        include: {
          product: { select: { id: true, name: true, unit: true, quantity: true, price: true } },
        },
      },
      receipts: {
        orderBy: { receivedDate: 'desc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  })
  if (!order) throw new Error('Purchase order not found')
  return order
}

export const updatePurchaseOrder = async (
  shopId: string,
  orderId: string,
  data: z.infer<typeof updatePurchaseOrderSchema>
) => {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, shopId },
    include: { items: true },
  })
  if (!order) throw new Error('Purchase order not found')
  if (order.status !== 'DRAFT') {
    throw new Error('Only DRAFT purchase orders can be edited')
  }

  return prisma.$transaction(async (tx) => {
    let totalAmount = order.totalAmount

    if (data.items && data.items.length > 0) {
      // Validate products
      const productIds = data.items.map((i) => i.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, shopId, isActive: true },
      })
      if (products.length !== productIds.length) {
        throw new Error('One or more selected products are invalid or inactive')
      }

      // Delete existing items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: orderId },
      })

      // Recalculate total and create new items
      totalAmount = new Prisma.Decimal(0)
      for (const item of data.items) {
        const unitCost = new Prisma.Decimal(item.unitCost)
        const lineTotal = unitCost.mul(item.quantityOrdered)
        totalAmount = totalAmount.plus(lineTotal)

        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: orderId,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitCost,
            totalCost: lineTotal,
          },
        })
      }
    }

    return tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        totalAmount,
        expectedDate: data.expectedDate !== undefined ? data.expectedDate : order.expectedDate,
        notes: data.notes !== undefined ? data.notes : order.notes,
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
      },
    })
  })
}

export const placePurchaseOrder = async (shopId: string, orderId: string) => {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, shopId } })
  if (!order) throw new Error('Purchase order not found')
  if (order.status !== 'DRAFT') {
    throw new Error('Only DRAFT purchase orders can be placed')
  }

  return prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: 'PLACED' },
  })
}

export const cancelPurchaseOrder = async (shopId: string, orderId: string) => {
  const order = await prisma.purchaseOrder.findFirst({ where: { id: orderId, shopId } })
  if (!order) throw new Error('Purchase order not found')
  if (order.status === 'RECEIVED') {
    throw new Error('Cannot cancel an order that has already been fully received')
  }
  if (order.status === 'CANCELLED') {
    throw new Error('Order is already cancelled')
  }

  return prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
  })
}

/**
 * Record Goods Received against a purchase order.
 * Atomically increments inventory stock, logs STOCK_IN movements, updates PO item received quantities,
 * and updates overall PO status.
 */
export const recordGoodsReceipt = async (
  shopId: string,
  orderId: string,
  data: z.infer<typeof recordGoodsReceiptSchema>
) => {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, shopId },
    include: { items: true },
  })
  if (!order) throw new Error('Purchase order not found')
  if (order.status === 'DRAFT') {
    throw new Error('Cannot receive goods for a DRAFT order. Please place the order first.')
  }
  if (order.status === 'CANCELLED') {
    throw new Error('Cannot receive goods for a CANCELLED order')
  }
  if (order.status === 'RECEIVED') {
    throw new Error('This order has already been fully received')
  }

  return prisma.$transaction(async (tx) => {
    // 1. Create goods receipt parent
    const receipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId: orderId,
        shopId,
        receivedDate: data.receivedDate || new Date(),
        notes: data.notes || null,
      },
    })

    // 2. Validate and process each received item line
    for (const itemInput of data.items) {
      const orderItem = order.items.find((i) => i.id === itemInput.purchaseOrderItemId)
      if (!orderItem) {
        throw new Error(`Order item not found: ${itemInput.purchaseOrderItemId}`)
      }

      const remainingOrdered = orderItem.quantityOrdered - orderItem.quantityReceived
      if (itemInput.quantityReceived > remainingOrdered) {
        throw new Error(
          `Cannot receive ${itemInput.quantityReceived} units. Only ${remainingOrdered} units remaining on order.`
        )
      }

      // Record receipt item
      await tx.goodsReceiptItem.create({
        data: {
          goodsReceiptId: receipt.id,
          purchaseOrderItemId: orderItem.id,
          productId: orderItem.productId,
          quantityReceived: itemInput.quantityReceived,
        },
      })

      // Update order item received quantity
      await tx.purchaseOrderItem.update({
        where: { id: orderItem.id },
        data: {
          quantityReceived: orderItem.quantityReceived + itemInput.quantityReceived,
        },
      })

      // Update product inventory stock
      const product = await tx.product.findFirst({
        where: { id: orderItem.productId, shopId },
      })
      if (!product) throw new Error(`Product not found: ${orderItem.productId}`)

      await tx.product.update({
        where: { id: orderItem.productId },
        data: {
          quantity: product.quantity + itemInput.quantityReceived,
        },
      })

      // Record STOCK_IN movement audit log with PO reference
      await tx.stockMovement.create({
        data: {
          productId: orderItem.productId,
          shopId,
          type: 'STOCK_IN',
          quantity: itemInput.quantityReceived,
          note: `Received against ${order.orderNumber}`,
        },
      })
    }

    // 3. Recalculate overall order status
    const allItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: orderId },
    })

    const allFullyReceived = allItems.every(
      (i) => i.quantityReceived >= i.quantityOrdered
    )
    const someReceived = allItems.some((i) => i.quantityReceived > 0)

    const newStatus = allFullyReceived
      ? 'RECEIVED'
      : someReceived
      ? 'PARTIALLY_RECEIVED'
      : order.status

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
    })

    return receipt
  })
}

/**
 * Record a payment to supplier against a purchase order.
 */
export const recordSupplierPayment = async (
  shopId: string,
  orderId: string,
  data: z.infer<typeof recordSupplierPaymentSchema>
) => {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, shopId },
  })
  if (!order) throw new Error('Purchase order not found')
  if (order.status === 'CANCELLED') {
    throw new Error('Cannot record payments for a CANCELLED order')
  }

  const outstandingBalance = order.totalAmount.minus(order.paidAmount)
  const paymentAmount = new Prisma.Decimal(data.amount)

  if (paymentAmount.greaterThan(outstandingBalance)) {
    throw new Error(
      `Payment amount ₹${paymentAmount.toFixed(2)} exceeds outstanding balance ₹${outstandingBalance.toFixed(2)}`
    )
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.create({
      data: {
        shopId,
        supplierId: order.supplierId,
        purchaseOrderId: orderId,
        amount: paymentAmount,
        paymentDate: data.paymentDate || new Date(),
        paymentMethod: data.paymentMethod,
        reference: data.reference || null,
        notes: data.notes || null,
      },
    })

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        paidAmount: order.paidAmount.plus(paymentAmount),
      },
    })

    return payment
  })
}
