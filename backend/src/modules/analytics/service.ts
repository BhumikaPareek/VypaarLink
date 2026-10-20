import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import type { AnalyticsQueryInput } from './schemas'

export const getShopForKeeper = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not found')
  return shop
}

export const parseDateRange = (
  range: '7d' | '30d' | 'month' | 'all' | 'custom' = '30d',
  startDate?: string,
  endDate?: string
) => {
  const now = new Date()
  let start: Date | null = null
  let end: Date = now

  if (range === '7d') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (range === '30d') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  } else if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (range === 'all') {
    start = null
  } else if (range === 'custom') {
    if (startDate) start = new Date(startDate)
    if (endDate) {
      const parsedEnd = new Date(endDate)
      if (endDate.length === 10) {
        parsedEnd.setHours(23, 59, 59, 999)
      }
      end = parsedEnd
    }
  }

  return { start, end }
}

// ── 1. Overview ─────────────────────────────────────────────────────────────

export const getOverview = async (shopId: string, query: AnalyticsQueryInput) => {
  const { start, end } = parseDateRange(query.range, query.startDate, query.endDate)

  // 1. Transactions in period
  const txDateFilter: Prisma.TransactionWhereInput = {
    shopId,
    deletedAt: null,
    ...(start ? { transactionDate: { gte: start, lte: end } } : { transactionDate: { lte: end } }),
  }

  const [creditAgg, paymentAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...txDateFilter, type: 'CREDIT' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.transaction.aggregate({
      where: { ...txDateFilter, type: 'PAYMENT' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  const creditIssued = creditAgg._sum.amount ?? new Prisma.Decimal(0)
  const paymentsCollected = paymentAgg._sum.amount ?? new Prisma.Decimal(0)
  const netCreditChange = creditIssued.minus(paymentsCollected)

  // 2. All-time cumulative customer debt
  const [allCreditsAgg, allPaymentsAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { shopId, type: 'CREDIT', deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { shopId, type: 'PAYMENT', deletedAt: null },
      _sum: { amount: true },
    }),
  ])
  const totalAllTimeCredits = allCreditsAgg._sum.amount ?? new Prisma.Decimal(0)
  const totalAllTimePayments = allPaymentsAgg._sum.amount ?? new Prisma.Decimal(0)
  const currentOutstandingCustomerDebt = totalAllTimeCredits.minus(totalAllTimePayments)

  // 3. Products valuation and stock counts
  const products = await prisma.product.findMany({
    where: { shopId, isActive: true },
    select: {
      id: true,
      price: true,
      quantity: true,
      lowStockThreshold: true,
    },
  })

  // Latest PO unit cost for cost basis
  const poItems = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: { shopId, status: { not: 'CANCELLED' } },
    },
    orderBy: { purchaseOrder: { orderDate: 'desc' } },
    select: { productId: true, unitCost: true },
  })
  const latestCostMap = new Map<string, Prisma.Decimal>()
  for (const item of poItems) {
    if (!latestCostMap.has(item.productId)) {
      latestCostMap.set(item.productId, item.unitCost)
    }
  }

  let inventoryRetailValue = new Prisma.Decimal(0)
  let inventoryCostBasis = new Prisma.Decimal(0)
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const p of products) {
    const qty = p.quantity
    inventoryRetailValue = inventoryRetailValue.plus(p.price.mul(qty))
    const unitCost = latestCostMap.get(p.id) ?? p.price
    inventoryCostBasis = inventoryCostBasis.plus(unitCost.mul(qty))

    if (qty === 0) {
      outOfStockCount++
    } else if (qty <= p.lowStockThreshold) {
      lowStockCount++
    }
  }

  // 4. Supplier outstanding payables
  const activePOs = await prisma.purchaseOrder.findMany({
    where: { shopId, status: { not: 'CANCELLED' } },
    select: { totalAmount: true, paidAmount: true },
  })
  let supplierOutstandingPayable = new Prisma.Decimal(0)
  for (const po of activePOs) {
    const remaining = po.totalAmount.minus(po.paidAmount)
    if (remaining.gt(0)) {
      supplierOutstandingPayable = supplierOutstandingPayable.plus(remaining)
    }
  }

  // 5. Active entity counts
  const [activeCustomersCount, activeSuppliersCount] = await Promise.all([
    prisma.shopCustomer.count({ where: { shopId, isActive: true } }),
    prisma.supplier.count({ where: { shopId, isActive: true } }),
  ])

  return {
    creditIssued: creditIssued.toFixed(2),
    paymentsCollected: paymentsCollected.toFixed(2),
    netCreditChange: netCreditChange.toFixed(2),
    currentOutstandingCustomerDebt: currentOutstandingCustomerDebt.toFixed(2),
    creditTransactionsCount: creditAgg._count.id,
    paymentTransactionsCount: paymentAgg._count.id,
    inventoryRetailValue: inventoryRetailValue.toFixed(2),
    inventoryCostBasis: inventoryCostBasis.toFixed(2),
    lowStockCount,
    outOfStockCount,
    totalProductsCount: products.length,
    supplierOutstandingPayable: supplierOutstandingPayable.toFixed(2),
    activeCustomersCount,
    activeSuppliersCount,
    period: {
      range: query.range,
      startDate: start ? start.toISOString() : null,
      endDate: end.toISOString(),
    },
  }
}

// ── 2. Credit Aging (FIFO Allocation) ─────────────────────────────────────────

export const getCreditAging = async (shopId: string) => {
  const now = new Date()

  // Fetch all non-deleted transactions for the shop
  const [shopCustomers, transactions] = await Promise.all([
    prisma.shopCustomer.findMany({
      where: { shopId, isActive: true },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { shopId, deletedAt: null },
      select: {
        id: true,
        customerId: true,
        amount: true,
        type: true,
        transactionDate: true,
        createdAt: true,
      },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  // Map customer details
  const customerMap = new Map<string, { id: string; name: string; phone: string }>()
  for (const sc of shopCustomers) {
    customerMap.set(sc.customerId, sc.customer)
  }

  // Group transactions by customer
  const txsByCustomer = new Map<string, typeof transactions>()
  for (const tx of transactions) {
    const list = txsByCustomer.get(tx.customerId) ?? []
    list.push(tx)
    txsByCustomer.set(tx.customerId, list)
  }

  // If customer has transactions but is not in shopCustomers, fetch their info
  const missingCustomerIds = Array.from(txsByCustomer.keys()).filter((id) => !customerMap.has(id))
  if (missingCustomerIds.length > 0) {
    const extraUsers = await prisma.user.findMany({
      where: { id: { in: missingCustomerIds } },
      select: { id: true, name: true, phone: true },
    })
    for (const u of extraUsers) {
      customerMap.set(u.id, u)
    }
  }

  // Buckets initialization
  let bucket_0_15 = 0
  let bucket_16_30 = 0
  let bucket_31_60 = 0
  let bucket_60_plus = 0

  const debtors_0_15 = new Set<string>()
  const debtors_16_30 = new Set<string>()
  const debtors_31_60 = new Set<string>()
  const debtors_60_plus = new Set<string>()

  let totalOutstanding = 0
  const debtorsList: Array<{
    customerId: string
    name: string
    phone: string
    balance: number
    oldestDebtDays: number
  }> = []

  // Process each customer with FIFO allocation
  for (const [customerId, txs] of txsByCustomer.entries()) {
    const credits = txs.filter((t) => t.type === 'CREDIT')
    const payments = txs.filter((t) => t.type === 'PAYMENT')

    const totalCredit = credits.reduce((sum, c) => sum + Number(c.amount), 0)
    const totalPayment = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const netBalance = Math.round((totalCredit - totalPayment) * 100) / 100

    if (netBalance <= 0) {
      continue // Zero or negative debt (customer has paid up or has excess credit)
    }

    totalOutstanding += netBalance

    // FIFO allocation: Historical payments pay off the oldest credit transactions first
    let remainingPaymentToApply = totalPayment
    const unpaidCredits: Array<{ amount: number; date: Date }> = []

    for (const credit of credits) {
      const creditAmt = Number(credit.amount)
      if (remainingPaymentToApply >= creditAmt) {
        remainingPaymentToApply -= creditAmt
      } else if (remainingPaymentToApply > 0) {
        const unpaidPart = creditAmt - remainingPaymentToApply
        remainingPaymentToApply = 0
        unpaidCredits.push({ amount: unpaidPart, date: credit.transactionDate })
      } else {
        unpaidCredits.push({ amount: creditAmt, date: credit.transactionDate })
      }
    }

    let customerOldestDays = 0

    for (const unpaid of unpaidCredits) {
      const ageInDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(unpaid.date).getTime()) / (1000 * 60 * 60 * 24))
      )
      if (ageInDays > customerOldestDays) {
        customerOldestDays = ageInDays
      }

      if (ageInDays <= 15) {
        bucket_0_15 += unpaid.amount
        debtors_0_15.add(customerId)
      } else if (ageInDays <= 30) {
        bucket_16_30 += unpaid.amount
        debtors_16_30.add(customerId)
      } else if (ageInDays <= 60) {
        bucket_31_60 += unpaid.amount
        debtors_31_60.add(customerId)
      } else {
        bucket_60_plus += unpaid.amount
        debtors_60_plus.add(customerId)
      }
    }

    const info = customerMap.get(customerId)
    debtorsList.push({
      customerId,
      name: info?.name ?? 'Unknown Customer',
      phone: info?.phone ?? '',
      balance: netBalance,
      oldestDebtDays: customerOldestDays,
    })
  }

  // Top 5 debtors by balance
  debtorsList.sort((a, b) => b.balance - a.balance)
  const topDebtors = debtorsList.slice(0, 5).map((d) => ({
    customerId: d.customerId,
    name: d.name,
    phone: d.phone,
    balance: d.balance.toFixed(2),
    oldestDebtDays: d.oldestDebtDays,
  }))

  const totalDebtors = debtorsList.length
  const safeTotal = totalOutstanding > 0 ? totalOutstanding : 1

  const buckets = [
    {
      bucket: '0-15',
      label: '0–15 Days',
      amount: bucket_0_15.toFixed(2),
      customerCount: debtors_0_15.size,
      percentage: Math.round((bucket_0_15 / safeTotal) * 1000) / 10,
    },
    {
      bucket: '16-30',
      label: '16–30 Days',
      amount: bucket_16_30.toFixed(2),
      customerCount: debtors_16_30.size,
      percentage: Math.round((bucket_16_30 / safeTotal) * 1000) / 10,
    },
    {
      bucket: '31-60',
      label: '31–60 Days',
      amount: bucket_31_60.toFixed(2),
      customerCount: debtors_31_60.size,
      percentage: Math.round((bucket_31_60 / safeTotal) * 1000) / 10,
    },
    {
      bucket: '60+',
      label: '60+ Days',
      amount: bucket_60_plus.toFixed(2),
      customerCount: debtors_60_plus.size,
      percentage: Math.round((bucket_60_plus / safeTotal) * 1000) / 10,
    },
  ]

  return {
    totalOutstanding: totalOutstanding.toFixed(2),
    totalDebtors,
    buckets,
    topDebtors,
  }
}

// ── 3. Cashflow Time-Series ───────────────────────────────────────────────────

export const getCashflow = async (shopId: string, query: AnalyticsQueryInput) => {
  const { start, end } = parseDateRange(query.range, query.startDate, query.endDate)

  // Fetch transactions in range
  const txs = await prisma.transaction.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(start ? { transactionDate: { gte: start, lte: end } } : { transactionDate: { lte: end } }),
    },
    select: {
      amount: true,
      type: true,
      transactionDate: true,
    },
    orderBy: { transactionDate: 'asc' },
  })

  // Determine effective start date if 'all' was selected
  const effectiveStart =
    start ?? (txs.length > 0 ? new Date(txs[0]!.transactionDate) : new Date(end.getTime() - 30 * 86400000))

  // Determine grouping interval
  const totalDays = Math.max(1, Math.ceil((end.getTime() - effectiveStart.getTime()) / 86400000))
  let groupBy: 'day' | 'week' | 'month' = query.groupBy ?? 'day'
  if (!query.groupBy) {
    if (totalDays <= 31) groupBy = 'day'
    else if (totalDays <= 90) groupBy = 'week'
    else groupBy = 'month'
  }

  // Helper to format date keys
  const formatKey = (d: Date, group: 'day' | 'week' | 'month'): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    if (group === 'day') return `${year}-${month}-${day}`
    if (group === 'month') return `${year}-${month}`
    // For week: find the Monday of the week
    const currentDay = d.getDay()
    const distanceToMonday = (currentDay + 6) % 7
    const monday = new Date(d.getTime() - distanceToMonday * 86400000)
    const mMonth = String(monday.getMonth() + 1).padStart(2, '0')
    const mDay = String(monday.getDate()).padStart(2, '0')
    return `W-${monday.getFullYear()}-${mMonth}-${mDay}`
  }

  const formatLabel = (d: Date, group: 'day' | 'week' | 'month'): string => {
    if (group === 'day') {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }
    if (group === 'month') {
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    }
    const currentDay = d.getDay()
    const distanceToMonday = (currentDay + 6) % 7
    const monday = new Date(d.getTime() - distanceToMonday * 86400000)
    return `Wk of ${monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
  }

  // Pre-generate intervals so time series is continuous
  const intervalsMap = new Map<
    string,
    { key: string; date: string; label: string; creditIssued: number; paymentsCollected: number }
  >()

  const cursor = new Date(effectiveStart)
  cursor.setHours(0, 0, 0, 0)
  const stopDate = new Date(end)
  stopDate.setHours(23, 59, 59, 999)

  while (cursor <= stopDate) {
    const key = formatKey(cursor, groupBy)
    if (!intervalsMap.has(key)) {
      intervalsMap.set(key, {
        key,
        date: cursor.toISOString(),
        label: formatLabel(cursor, groupBy),
        creditIssued: 0,
        paymentsCollected: 0,
      })
    }
    if (groupBy === 'day') {
      cursor.setDate(cursor.getDate() + 1)
    } else if (groupBy === 'week') {
      cursor.setDate(cursor.getDate() + 7)
    } else {
      cursor.setMonth(cursor.getMonth() + 1)
      cursor.setDate(1)
    }
  }

  // Populate data from transactions
  let totalCredit = 0
  let totalPayments = 0

  for (const tx of txs) {
    const d = new Date(tx.transactionDate)
    const key = formatKey(d, groupBy)
    const amt = Number(tx.amount)
    const entry = intervalsMap.get(key)

    if (entry) {
      if (tx.type === 'CREDIT') {
        entry.creditIssued += amt
        totalCredit += amt
      } else {
        entry.paymentsCollected += amt
        totalPayments += amt
      }
    } else {
      // If beyond cursor boundary, create on the fly
      const newEntry = {
        key,
        date: d.toISOString(),
        label: formatLabel(d, groupBy),
        creditIssued: tx.type === 'CREDIT' ? amt : 0,
        paymentsCollected: tx.type === 'PAYMENT' ? amt : 0,
      }
      intervalsMap.set(key, newEntry)
      if (tx.type === 'CREDIT') totalCredit += amt
      else totalPayments += amt
    }
  }

  const timeline = Array.from(intervalsMap.values()).map((item) => ({
    ...item,
    creditIssued: Math.round(item.creditIssued * 100) / 100,
    paymentsCollected: Math.round(item.paymentsCollected * 100) / 100,
    netCashflow: Math.round((item.paymentsCollected - item.creditIssued) * 100) / 100,
  }))

  const netCashflow = totalPayments - totalCredit
  const averageDailyCredit = totalDays > 0 ? totalCredit / totalDays : 0
  const averageDailyPayment = totalDays > 0 ? totalPayments / totalDays : 0

  return {
    groupBy,
    period: {
      range: query.range,
      startDate: effectiveStart.toISOString(),
      endDate: end.toISOString(),
      totalDays,
    },
    summary: {
      totalCredit: totalCredit.toFixed(2),
      totalPayments: totalPayments.toFixed(2),
      netCashflow: netCashflow.toFixed(2),
      averageDailyCredit: averageDailyCredit.toFixed(2),
      averageDailyPayment: averageDailyPayment.toFixed(2),
    },
    timeline,
  }
}

// ── 4. Inventory Insights ─────────────────────────────────────────────────────

export const getInventoryInsights = async (shopId: string, query: AnalyticsQueryInput) => {
  const { start, end } = parseDateRange(query.range, query.startDate, query.endDate)
  const now = new Date()

  // 1. Fetch active products
  const products = await prisma.product.findMany({
    where: { shopId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      price: true,
      quantity: true,
      unit: true,
      lowStockThreshold: true,
      createdAt: true,
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Low stock and out of stock items
  const lowStockItems = products
    .filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price.toFixed(2),
      quantity: p.quantity,
      unit: p.unit,
      lowStockThreshold: p.lowStockThreshold,
    }))

  const outOfStockItems = products
    .filter((p) => p.quantity === 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price.toFixed(2),
      quantity: 0,
      unit: p.unit,
      lowStockThreshold: p.lowStockThreshold,
    }))

  // 2. Fast moving products (SALE stock movements in period)
  const saleMovements = await prisma.stockMovement.findMany({
    where: {
      shopId,
      type: 'SALE',
      ...(start ? { createdAt: { gte: start, lte: end } } : { createdAt: { lte: end } }),
    },
    select: {
      productId: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          price: true,
          quantity: true,
          unit: true,
        },
      },
    },
  })

  const salesByProduct = new Map<
    string,
    {
      product: (typeof saleMovements)[0]['product']
      totalQuantitySold: number
    }
  >()

  for (const sm of saleMovements) {
    if (!sm.product) continue
    const curr = salesByProduct.get(sm.productId) ?? {
      product: sm.product,
      totalQuantitySold: 0,
    }
    curr.totalQuantitySold += sm.quantity
    salesByProduct.set(sm.productId, curr)
  }

  const fastMovingProducts = Array.from(salesByProduct.values())
    .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
    .slice(0, 5)
    .map((item) => {
      const revenue = item.product.price.mul(item.totalQuantitySold).toFixed(2)
      return {
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        quantitySold: item.totalQuantitySold,
        unit: item.product.unit,
        price: item.product.price.toFixed(2),
        totalRevenue: revenue,
        currentStock: item.product.quantity,
      }
    })

  // 3. Dead stock: active products with stock > 0 and no movements in 30+ days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const deadStockProducts = products
    .filter((p) => {
      if (p.quantity <= 0) return false
      const lastMovement = p.movements[0]?.createdAt ?? p.createdAt
      return lastMovement <= thirtyDaysAgo
    })
    .map((p) => {
      const lastMovement = p.movements[0]?.createdAt ?? p.createdAt
      const daysInactive = Math.floor((now.getTime() - lastMovement.getTime()) / (1000 * 60 * 60 * 24))
      const tiedUpCapital = p.price.mul(p.quantity).toFixed(2)
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        price: p.price.toFixed(2),
        tiedUpCapital,
        lastActivityDate: lastMovement.toISOString(),
        daysInactive,
      }
    })
    .sort((a, b) => parseFloat(b.tiedUpCapital) - parseFloat(a.tiedUpCapital))

  // 4. Stockout Projections: velocity based run-rate
  // Use 30 days or period duration to calculate daily velocity
  const effectiveStart = start ?? new Date(now.getTime() - 30 * 86400000)
  const daysInRange = Math.max(1, Math.ceil((end.getTime() - effectiveStart.getTime()) / 86400000))

  const stockoutProjections = products
    .filter((p) => p.quantity > 0)
    .map((p) => {
      const salesData = salesByProduct.get(p.id)
      const unitsSold = salesData?.totalQuantitySold ?? 0
      const dailyVelocity = unitsSold / daysInRange

      let daysUntilStockout: number | null = null
      let hasSufficientData = false

      if (unitsSold > 0 && dailyVelocity > 0) {
        daysUntilStockout = Math.floor(p.quantity / dailyVelocity)
        hasSufficientData = true
      }

      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        currentStock: p.quantity,
        unit: p.unit,
        unitsSoldInPeriod: unitsSold,
        dailyVelocity: dailyVelocity > 0 ? Number(dailyVelocity.toFixed(2)) : 0,
        daysUntilStockout,
        hasSufficientData,
      }
    })
    .sort((a, b) => {
      // Prioritize items with known stockout days ascending, nulls at bottom
      if (a.daysUntilStockout !== null && b.daysUntilStockout !== null) {
        return a.daysUntilStockout - b.daysUntilStockout
      }
      if (a.daysUntilStockout !== null) return -1
      if (b.daysUntilStockout !== null) return 1
      return 0
    })
    .slice(0, 10)

  return {
    summary: {
      totalActiveProducts: products.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      deadStockCount: deadStockProducts.length,
    },
    lowStockItems,
    outOfStockItems,
    fastMovingProducts,
    deadStockProducts,
    stockoutProjections,
  }
}

// ── 5. Supplier Insights ──────────────────────────────────────────────────────

export const getSupplierInsights = async (shopId: string, query: AnalyticsQueryInput) => {
  const { start, end } = parseDateRange(query.range, query.startDate, query.endDate)
  const now = new Date()

  const [posInPeriod, allActivePOs, paymentsInPeriod] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        shopId,
        ...(start ? { orderDate: { gte: start, lte: end } } : { orderDate: { lte: end } }),
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        shopId,
        status: { not: 'CANCELLED' },
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.supplierPayment.findMany({
      where: {
        shopId,
        ...(start ? { paymentDate: { gte: start, lte: end } } : { paymentDate: { lte: end } }),
      },
      select: {
        amount: true,
        supplierId: true,
      },
    }),
  ])

  // Total purchasing spend in period (non-cancelled)
  let totalPurchases = new Prisma.Decimal(0)
  const poStatusMap: Record<string, { count: number; totalAmount: Prisma.Decimal }> = {
    DRAFT: { count: 0, totalAmount: new Prisma.Decimal(0) },
    PLACED: { count: 0, totalAmount: new Prisma.Decimal(0) },
    PARTIALLY_RECEIVED: { count: 0, totalAmount: new Prisma.Decimal(0) },
    RECEIVED: { count: 0, totalAmount: new Prisma.Decimal(0) },
    CANCELLED: { count: 0, totalAmount: new Prisma.Decimal(0) },
  }

  for (const po of posInPeriod) {
    if (po.status !== 'CANCELLED') {
      totalPurchases = totalPurchases.plus(po.totalAmount)
    }
    const stat = poStatusMap[po.status]
    if (stat) {
      stat.count++
      stat.totalAmount = stat.totalAmount.plus(po.totalAmount)
    }
  }

  // Total supplier payments in period
  let totalPaid = new Prisma.Decimal(0)
  for (const pay of paymentsInPeriod) {
    totalPaid = totalPaid.plus(pay.amount)
  }

  // Total all-time outstanding payables
  let totalOutstandingPayables = new Prisma.Decimal(0)
  const payableAgeBuckets = {
    '0-15': { label: '0–15 Days', amount: new Prisma.Decimal(0), count: 0 },
    '16-30': { label: '16–30 Days', amount: new Prisma.Decimal(0), count: 0 },
    '31-60': { label: '31–60 Days', amount: new Prisma.Decimal(0), count: 0 },
    '60+': { label: '60+ Days', amount: new Prisma.Decimal(0), count: 0 },
  }

  for (const po of allActivePOs) {
    const remaining = po.totalAmount.minus(po.paidAmount)
    if (remaining.gt(0)) {
      totalOutstandingPayables = totalOutstandingPayables.plus(remaining)
      const ageInDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(po.orderDate).getTime()) / (1000 * 60 * 60 * 24))
      )
      if (ageInDays <= 15) {
        payableAgeBuckets['0-15'].amount = payableAgeBuckets['0-15'].amount.plus(remaining)
        payableAgeBuckets['0-15'].count++
      } else if (ageInDays <= 30) {
        payableAgeBuckets['16-30'].amount = payableAgeBuckets['16-30'].amount.plus(remaining)
        payableAgeBuckets['16-30'].count++
      } else if (ageInDays <= 60) {
        payableAgeBuckets['31-60'].amount = payableAgeBuckets['31-60'].amount.plus(remaining)
        payableAgeBuckets['31-60'].count++
      } else {
        payableAgeBuckets['60+'].amount = payableAgeBuckets['60+'].amount.plus(remaining)
        payableAgeBuckets['60+'].count++
      }
    }
  }

  // Top Suppliers by Spend in period
  const supplierSpendMap = new Map<
    string,
    {
      supplierId: string
      supplierName: string
      phone: string
      poCount: number
      totalSpend: Prisma.Decimal
      totalPaid: Prisma.Decimal
      outstandingBalance: Prisma.Decimal
    }
  >()

  for (const po of posInPeriod) {
    if (po.status === 'CANCELLED') continue
    const curr = supplierSpendMap.get(po.supplierId) ?? {
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      phone: po.supplier.phone ?? '',
      poCount: 0,
      totalSpend: new Prisma.Decimal(0),
      totalPaid: new Prisma.Decimal(0),
      outstandingBalance: new Prisma.Decimal(0),
    }
    curr.poCount++
    curr.totalSpend = curr.totalSpend.plus(po.totalAmount)
    curr.totalPaid = curr.totalPaid.plus(po.paidAmount)
    curr.outstandingBalance = curr.outstandingBalance.plus(po.totalAmount.minus(po.paidAmount))
    supplierSpendMap.set(po.supplierId, curr)
  }

  const topSuppliersBySpend = Array.from(supplierSpendMap.values())
    .sort((a, b) => (b.totalSpend.minus(a.totalSpend).toNumber()))
    .map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      phone: s.phone,
      poCount: s.poCount,
      totalSpend: s.totalSpend.toFixed(2),
      totalPaid: s.totalPaid.toFixed(2),
      outstandingBalance: s.outstandingBalance.toFixed(2),
    }))

  const poStatusDistribution = Object.entries(poStatusMap).map(([status, val]) => ({
    status,
    count: val.count,
    totalAmount: val.totalAmount.toFixed(2),
  }))

  const payableAging = Object.entries(payableAgeBuckets).map(([key, val]) => ({
    bucket: key,
    label: val.label,
    amount: val.amount.toFixed(2),
    poCount: val.count,
  }))

  return {
    totalPurchases: totalPurchases.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    outstandingPayables: totalOutstandingPayables.toFixed(2),
    poStatusDistribution,
    topSuppliersBySpend,
    payableAging,
  }
}
