import { prisma } from '../../lib/prisma'
import {
  getOverview,
  getCreditAging,
  getInventoryInsights,
  getSupplierInsights,
} from '../analytics/service'
import { classifyIntent, extractPeriod, type IntentType } from './intents'
import type {
  AssistantResponseData,
  AssistantMetric,
  AssistantActionLink,
  AssistantDetails,
} from './schemas'

export const getShopForKeeper = async (userId: string) => {
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } })
  if (!shop) throw new Error('Shop not found')
  return shop
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '₹0.00'
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const askBusinessAssistant = async (
  userId: string,
  question: string
): Promise<AssistantResponseData> => {
  const shop = await getShopForKeeper(userId)
  const { intent } = classifyIntent(question)

  // ── 1. Action / Write Request (Reject with guidance) ─────────────────────────
  if (intent === 'ACTION_REQUEST') {
    return {
      question,
      intent: 'ACTION_REQUEST',
      period: {
        label: 'Current',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer:
        'I am your read-only business assistant and cannot modify records, create transactions, or alter inventory. This safety measure protects your financial ledger integrity. Please use the dedicated page in VypaarLink to perform this operation.',
      suggestedActions: [
        { label: 'Customer Management', path: '/customers' },
        { label: 'Inventory & Products', path: '/inventory' },
        { label: 'Purchase Orders', path: '/purchase-orders' },
        { label: 'Record Transactions', path: '/transactions' },
      ],
      suggestedQuestions: [
        'How much credit is still outstanding?',
        'Which products are running low on stock?',
        'How much did I collect in customer repayments this week?',
      ],
    }
  }

  // ── 2. Unsupported Query ───────────────────────────────────────────────────
  if (intent === 'UNSUPPORTED') {
    return {
      question,
      intent: 'UNSUPPORTED',
      period: {
        label: 'Current',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer:
        "I can only answer questions regarding your store's customer credit, inventory, sales, repayments, suppliers, and overall business performance. Here are some questions you can ask:",
      suggestedActions: [
        { label: 'View Dashboard', path: '/dashboard' },
        { label: 'View Analytics', path: '/analytics' },
      ],
      suggestedQuestions: [
        'How much credit is still outstanding?',
        'Which customers have overdue balances?',
        'Which products are running low on stock?',
        'What were my sales this month?',
        'How much do I owe my suppliers?',
      ],
    }
  }

  // ── 3. Customer Debtors & Overdue ──────────────────────────────────────────
  if (intent === 'CUSTOMER_DEBTORS') {
    const aging = await getCreditAging(shop.id)
    const overdueDebtors = aging.topDebtors.filter((d) => d.oldestDebtDays > 15)

    const metrics: AssistantMetric[] = [
      {
        label: 'Total Outstanding Debt',
        value: formatCurrency(aging.totalOutstanding),
        accent: 'prominent',
      },
      {
        label: 'Active Debtors',
        value: String(aging.totalDebtors),
        accent: 'neutral',
      },
    ]

    const criticalBucket = aging.buckets.find((b) => b.bucket === '60+')
    if (criticalBucket && parseFloat(criticalBucket.amount) > 0) {
      metrics.push({
        label: 'Critical Debt (>60 Days)',
        value: formatCurrency(criticalBucket.amount),
        accent: 'danger',
      })
    }

    let answerText = ''
    if (aging.totalDebtors === 0) {
      answerText = 'Great news! There are currently no customers with outstanding or overdue debt.'
    } else {
      answerText = `You have ${aging.totalDebtors} customer${aging.totalDebtors === 1 ? '' : 's'} with outstanding debt totaling ${formatCurrency(aging.totalOutstanding)}.`
      if (overdueDebtors.length > 0) {
        answerText += ` Of these, ${overdueDebtors.length} customer${overdueDebtors.length === 1 ? ' has' : 's have'} debt older than 15 days.`
      }
    }

    const details: AssistantDetails = {
      type: 'debtor_list',
      items: aging.topDebtors.map((d) => ({
        title: d.name,
        subtitle: `Phone: ${d.phone || 'No phone'} • Oldest debt: ${d.oldestDebtDays} days ago`,
        badge:
          d.oldestDebtDays > 60
            ? 'Critical (>60d)'
            : d.oldestDebtDays > 30
            ? 'Overdue (31–60d)'
            : d.oldestDebtDays > 15
            ? 'Due (16–30d)'
            : 'Healthy (0–15d)',
        badgeVariant:
          d.oldestDebtDays > 60
            ? 'danger'
            : d.oldestDebtDays > 30
            ? 'warning'
            : d.oldestDebtDays > 15
            ? 'info'
            : 'success',
        amount: formatCurrency(d.balance),
        link: `/customers/${d.customerId}`,
      })),
    }

    return {
      question,
      intent: 'CUSTOMER_DEBTORS',
      period: {
        label: 'All Time (FIFO Aging)',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer: answerText,
      metrics,
      details: aging.topDebtors.length > 0 ? details : undefined,
      suggestedActions: [
        { label: 'View Full Credit Aging', path: '/analytics' },
        { label: 'View Customer Directory', path: '/customers' },
      ],
      suggestedQuestions: [
        'How much credit is still outstanding?',
        'How much did I collect in customer repayments this week?',
        'Give me a summary of my shop’s performance.',
      ],
    }
  }

  // ── 4. Customer Credit / Outstanding Total ──────────────────────────────────
  if (intent === 'CUSTOMER_CREDIT') {
    const [overviewData, aging] = await Promise.all([
      getOverview(shop.id, { range: 'all' }),
      getCreditAging(shop.id),
    ])

    const totalDebt = overviewData.currentOutstandingCustomerDebt
    const activeDebtors = aging.totalDebtors

    const metrics: AssistantMetric[] = [
      {
        label: 'Total Outstanding Credit',
        value: formatCurrency(totalDebt),
        accent: 'prominent',
      },
      {
        label: 'Active Debtors',
        value: String(activeDebtors),
        accent: 'neutral',
      },
      {
        label: 'All-Time Credit Given',
        value: formatCurrency(overviewData.creditIssued),
        accent: 'warning',
      },
      {
        label: 'All-Time Payments Received',
        value: formatCurrency(overviewData.paymentsCollected),
        accent: 'positive',
      },
    ]

    let answerText = ''
    if (parseFloat(totalDebt) <= 0) {
      answerText = 'You have zero outstanding customer credit. All customer balances are fully cleared.'
    } else {
      answerText = `Your total outstanding customer credit is ${formatCurrency(totalDebt)} across ${activeDebtors} customer${activeDebtors === 1 ? '' : 's'}. Total historical credit issued is ${formatCurrency(overviewData.creditIssued)}, against ${formatCurrency(overviewData.paymentsCollected)} in collected repayments.`
    }

    return {
      question,
      intent: 'CUSTOMER_CREDIT',
      period: {
        label: 'All Time',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer: answerText,
      metrics,
      suggestedActions: [
        { label: 'View Credit Aging', path: '/analytics' },
        { label: 'Manage Customers', path: '/customers' },
      ],
      suggestedQuestions: [
        'Which customers have overdue balances?',
        'How much did I collect in customer repayments this week?',
        'What were my sales this month?',
      ],
    }
  }

  // ── 5. Inventory: Low Stock & Out of Stock ──────────────────────────────────
  if (intent === 'INVENTORY_LOW_STOCK') {
    const insights = await getInventoryInsights(shop.id, { range: '30d' })
    const { lowStockItems, outOfStockItems } = insights

    const metrics: AssistantMetric[] = [
      {
        label: 'Low Stock Products',
        value: String(lowStockItems.length),
        accent: lowStockItems.length > 0 ? 'warning' : 'positive',
      },
      {
        label: 'Out of Stock Products',
        value: String(outOfStockItems.length),
        accent: outOfStockItems.length > 0 ? 'danger' : 'positive',
      },
      {
        label: 'Total Active Products',
        value: String(insights.summary.totalActiveProducts),
        accent: 'neutral',
      },
    ]

    let answerText = ''
    if (outOfStockItems.length === 0 && lowStockItems.length === 0) {
      answerText = `All ${insights.summary.totalActiveProducts} active products in your inventory have adequate stock levels. None are low or out of stock.`
    } else {
      const parts = []
      if (outOfStockItems.length > 0) {
        parts.push(`${outOfStockItems.length} product${outOfStockItems.length === 1 ? ' is' : 's are'} completely out of stock`)
      }
      if (lowStockItems.length > 0) {
        parts.push(`${lowStockItems.length} product${lowStockItems.length === 1 ? ' is' : 's are'} running low`)
      }
      answerText = `Inventory Alert: ${parts.join(' and ')}. Consider creating a restock purchase order.`
    }

    const criticalItems = [...outOfStockItems, ...lowStockItems]
    const details: AssistantDetails = {
      type: 'product_list',
      items: criticalItems.slice(0, 8).map((p) => ({
        title: p.name,
        subtitle: `Category: ${p.category || 'General'} • Reorder Threshold: ${p.lowStockThreshold} ${p.unit}`,
        badge: p.quantity === 0 ? 'Out of Stock' : `Low: ${p.quantity} ${p.unit}`,
        badgeVariant: p.quantity === 0 ? 'danger' : 'warning',
        amount: formatCurrency(p.price),
        link: '/inventory',
      })),
    }

    return {
      question,
      intent: 'INVENTORY_LOW_STOCK',
      period: {
        label: 'Current Inventory',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer: answerText,
      metrics,
      details: criticalItems.length > 0 ? details : undefined,
      suggestedActions: [
        { label: 'Go to Inventory', path: '/inventory' },
        { label: 'Create Purchase Order', path: '/purchase-orders' },
      ],
      suggestedQuestions: [
        'Which products sell the most?',
        'What is my current inventory valuation?',
        'Do I have any dead stock?',
      ],
    }
  }

  // ── 6. Inventory: Valuation ─────────────────────────────────────────────────
  if (intent === 'INVENTORY_VALUATION') {
    const overview = await getOverview(shop.id, { range: 'all' })

    const metrics: AssistantMetric[] = [
      {
        label: 'Inventory Retail Value',
        value: formatCurrency(overview.inventoryRetailValue),
        accent: 'prominent',
      },
      {
        label: 'Inventory Cost Basis',
        value: formatCurrency(overview.inventoryCostBasis),
        accent: 'neutral',
      },
      {
        label: 'Active Products',
        value: String(overview.totalProductsCount),
        accent: 'neutral',
      },
    ]

    const answerText = `Your active inventory has a total retail selling valuation of ${formatCurrency(overview.inventoryRetailValue)} across ${overview.totalProductsCount} products. The estimated inventory cost basis (derived from your purchase order costs) is ${formatCurrency(overview.inventoryCostBasis)}.`

    return {
      question,
      intent: 'INVENTORY_VALUATION',
      period: {
        label: 'Current Stock',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer: answerText,
      metrics,
      suggestedActions: [
        { label: 'View Inventory Details', path: '/inventory' },
        { label: 'View Analytics Dashboard', path: '/analytics' },
      ],
      suggestedQuestions: [
        'Which products are running low on stock?',
        'Which products sell the most?',
        'How much do I owe my suppliers?',
      ],
    }
  }

  // ── 7. Inventory: Fast-Moving Products ──────────────────────────────────────
  if (intent === 'INVENTORY_FAST_MOVING') {
    const period = extractPeriod(question, '30d')
    const insights = await getInventoryInsights(shop.id, {
      range: period.range === 'today' || period.range === 'last_month' ? 'custom' : period.range,
      startDate: period.startDate?.toISOString(),
      endDate: period.endDate.toISOString(),
    })

    const items = insights.fastMovingProducts

    let answerText = ''
    if (items.length === 0) {
      answerText = `No recorded sales movements were found for ${period.label.toLowerCase()}.`
    } else {
      const top = items[0]!
      answerText = `During ${period.label.toLowerCase()}, your top selling product was "${top.name}" with ${top.quantitySold} ${top.unit} sold, generating ${formatCurrency(top.totalRevenue)} in revenue.`
    }

    const details: AssistantDetails = {
      type: 'product_list',
      items: items.map((p) => ({
        title: p.name,
        subtitle: `Sold: ${p.quantitySold} ${p.unit} • Current Stock: ${p.currentStock} ${p.unit}`,
        badge: 'High Velocity',
        badgeVariant: 'success',
        amount: formatCurrency(p.totalRevenue),
        link: '/inventory',
      })),
    }

    return {
      question,
      intent: 'INVENTORY_FAST_MOVING',
      period: {
        label: period.label,
        startDate: period.startDate ? period.startDate.toISOString() : null,
        endDate: period.endDate.toISOString(),
      },
      answer: answerText,
      details: items.length > 0 ? details : undefined,
      suggestedActions: [
        { label: 'View Inventory Velocity', path: '/analytics' },
        { label: 'View Stock Inventory', path: '/inventory' },
      ],
      suggestedQuestions: [
        'Which products are running low on stock?',
        'Do I have any dead stock?',
        'What were my sales this month?',
      ],
    }
  }

  // ── 8. Inventory: Dead Stock ────────────────────────────────────────────────
  if (intent === 'INVENTORY_DEAD_STOCK') {
    const insights = await getInventoryInsights(shop.id, { range: '30d' })
    const deadStock = insights.deadStockProducts

    const metrics: AssistantMetric[] = [
      {
        label: 'Dead Stock Products',
        value: String(deadStock.length),
        accent: deadStock.length > 0 ? 'warning' : 'positive',
      },
    ]

    let answerText = ''
    if (deadStock.length === 0) {
      answerText = 'Excellent! You have no stagnant dead stock. All active products have recorded movements within the last 30 days.'
    } else {
      const totalTiedUp = deadStock.reduce((acc, p) => acc + parseFloat(p.tiedUpCapital), 0)
      metrics.push({
        label: 'Total Tied-Up Capital',
        value: formatCurrency(totalTiedUp),
        accent: 'warning',
      })
      answerText = `You have ${deadStock.length} active product${deadStock.length === 1 ? '' : 's'} with zero movement in over 30 days, tying up ${formatCurrency(totalTiedUp)} in working capital. Consider promotional discounts to free up cash.`
    }

    const details: AssistantDetails = {
      type: 'product_list',
      items: deadStock.slice(0, 6).map((p) => ({
        title: p.name,
        subtitle: `Quantity: ${p.quantity} ${p.unit} • Inactive for ${p.daysInactive} days`,
        badge: `${p.daysInactive}d inactive`,
        badgeVariant: 'warning',
        amount: formatCurrency(p.tiedUpCapital),
        link: '/inventory',
      })),
    }

    return {
      question,
      intent: 'INVENTORY_DEAD_STOCK',
      period: {
        label: 'Last 30+ Days',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer: answerText,
      metrics,
      details: deadStock.length > 0 ? details : undefined,
      suggestedActions: [
        { label: 'Manage Inventory', path: '/inventory' },
        { label: 'View Inventory Analytics', path: '/analytics' },
      ],
      suggestedQuestions: [
        'Which products are running low on stock?',
        'What is my current inventory valuation?',
        'Which products sell the most?',
      ],
    }
  }

  // ── 9. Cash Collections / Repayments ────────────────────────────────────────
  if (intent === 'CASH_COLLECTIONS') {
    const period = extractPeriod(question, '30d')
    const overview = await getOverview(shop.id, {
      range: period.range === 'today' || period.range === 'last_month' ? 'custom' : period.range,
      startDate: period.startDate?.toISOString(),
      endDate: period.endDate.toISOString(),
    })

    const collected = overview.paymentsCollected
    const count = overview.paymentTransactionsCount

    const metrics: AssistantMetric[] = [
      {
        label: 'Repayments Collected',
        value: formatCurrency(collected),
        accent: 'positive',
      },
      {
        label: 'Payment Transactions',
        value: String(count),
        accent: 'neutral',
      },
      {
        label: 'Credit Issued (Same Period)',
        value: formatCurrency(overview.creditIssued),
        accent: 'warning',
      },
    ]

    const answerText = `During ${period.label.toLowerCase()}, you collected ${formatCurrency(collected)} in customer repayments across ${count} payment transaction${count === 1 ? '' : 's'}. In the same period, you issued ${formatCurrency(overview.creditIssued)} in new credit.`

    return {
      question,
      intent: 'CASH_COLLECTIONS',
      period: {
        label: period.label,
        startDate: period.startDate ? period.startDate.toISOString() : null,
        endDate: period.endDate.toISOString(),
      },
      answer: answerText,
      metrics,
      suggestedActions: [
        { label: 'View Payments Ledger', path: '/payments' },
        { label: 'View Cashflow Trends', path: '/analytics' },
      ],
      suggestedQuestions: [
        'How much credit is still outstanding?',
        'What were my sales this month?',
        'How much do I owe my suppliers?',
      ],
    }
  }

  // ── 10. Sales Summary / Performance ─────────────────────────────────────────
  if (intent === 'SALES_SUMMARY') {
    const period = extractPeriod(question, '30d')
    const overview = await getOverview(shop.id, {
      range: period.range === 'today' || period.range === 'last_month' ? 'custom' : period.range,
      startDate: period.startDate?.toISOString(),
      endDate: period.endDate.toISOString(),
    })

    const creditSales = overview.creditIssued
    const count = overview.creditTransactionsCount

    const metrics: AssistantMetric[] = [
      {
        label: 'Credit Sales Volume',
        value: formatCurrency(creditSales),
        accent: 'prominent',
      },
      {
        label: 'Transactions Count',
        value: String(count),
        accent: 'neutral',
      },
      {
        label: 'Cash Repayments',
        value: formatCurrency(overview.paymentsCollected),
        accent: 'positive',
      },
    ]

    const answerText = `For ${period.label.toLowerCase()}, your recorded credit sales totaled ${formatCurrency(creditSales)} across ${count} transaction${count === 1 ? '' : 's'}. Customer repayments collected in this period were ${formatCurrency(overview.paymentsCollected)}.`

    return {
      question,
      intent: 'SALES_SUMMARY',
      period: {
        label: period.label,
        startDate: period.startDate ? period.startDate.toISOString() : null,
        endDate: period.endDate.toISOString(),
      },
      answer: answerText,
      metrics,
      suggestedActions: [
        { label: 'View Transactions', path: '/transactions' },
        { label: 'View Cashflow Analytics', path: '/analytics' },
      ],
      suggestedQuestions: [
        'How much credit is still outstanding?',
        'How much did I collect in customer repayments this week?',
        'Which products sell the most?',
      ],
    }
  }

  // ── 11. Supplier Payables ───────────────────────────────────────────────────
  if (intent === 'SUPPLIER_PAYABLES') {
    const suppliers = await getSupplierInsights(shop.id, { range: 'all' })
    const payables = suppliers.outstandingPayables

    const metrics: AssistantMetric[] = [
      {
        label: 'Total Outstanding Payables',
        value: formatCurrency(payables),
        accent: parseFloat(payables) > 0 ? 'danger' : 'positive',
      },
      {
        label: 'Purchases Total',
        value: formatCurrency(suppliers.totalPurchases),
        accent: 'neutral',
      },
      {
        label: 'Total Paid to Suppliers',
        value: formatCurrency(suppliers.totalPaid),
        accent: 'positive',
      },
    ]

    let answerText = ''
    if (parseFloat(payables) <= 0) {
      answerText = 'You have no outstanding supplier payables! All non-cancelled purchase orders are fully paid.'
    } else {
      answerText = `You currently owe ${formatCurrency(payables)} in outstanding payables to suppliers across your active purchase orders.`
    }

    const details: AssistantDetails = {
      type: 'supplier_list',
      items: suppliers.topSuppliersBySpend
        .filter((s) => parseFloat(s.outstandingBalance) > 0)
        .slice(0, 5)
        .map((s) => ({
          title: s.supplierName,
          subtitle: `Phone: ${s.phone || 'No phone'} • Total Spend: ${formatCurrency(s.totalSpend)}`,
          badge: 'Unpaid Balance',
          badgeVariant: 'danger',
          amount: formatCurrency(s.outstandingBalance),
          link: '/purchase-orders',
        })),
    }

    return {
      question,
      intent: 'SUPPLIER_PAYABLES',
      period: {
        label: 'All Time Active POs',
        startDate: null,
        endDate: new Date().toISOString(),
      },
      answer: answerText,
      metrics,
      details: details.items.length > 0 ? details : undefined,
      suggestedActions: [
        { label: 'View Purchase Orders', path: '/purchase-orders' },
        { label: 'Manage Suppliers', path: '/suppliers' },
      ],
      suggestedQuestions: [
        'What were my supplier purchases this month?',
        'How much credit is still outstanding?',
        'Give me a summary of my shop’s performance.',
      ],
    }
  }

  // ── 12. Supplier Purchases ──────────────────────────────────────────────────
  if (intent === 'SUPPLIER_PURCHASES') {
    const period = extractPeriod(question, '30d')
    const suppliers = await getSupplierInsights(shop.id, {
      range: period.range === 'today' || period.range === 'last_month' ? 'custom' : period.range,
      startDate: period.startDate?.toISOString(),
      endDate: period.endDate.toISOString(),
    })

    const metrics: AssistantMetric[] = [
      {
        label: 'Purchases in Period',
        value: formatCurrency(suppliers.totalPurchases),
        accent: 'prominent',
      },
      {
        label: 'Paid to Suppliers',
        value: formatCurrency(suppliers.totalPaid),
        accent: 'positive',
      },
      {
        label: 'Active Payables',
        value: formatCurrency(suppliers.outstandingPayables),
        accent: parseFloat(suppliers.outstandingPayables) > 0 ? 'danger' : 'neutral',
      },
    ]

    const answerText = `During ${period.label.toLowerCase()}, you placed ${formatCurrency(suppliers.totalPurchases)} in purchase orders (excluding cancelled orders) and paid ${formatCurrency(suppliers.totalPaid)} to suppliers.`

    return {
      question,
      intent: 'SUPPLIER_PURCHASES',
      period: {
        label: period.label,
        startDate: period.startDate ? period.startDate.toISOString() : null,
        endDate: period.endDate.toISOString(),
      },
      answer: answerText,
      metrics,
      suggestedActions: [
        { label: 'View Purchase Orders', path: '/purchase-orders' },
        { label: 'Supplier Intelligence', path: '/analytics' },
      ],
      suggestedQuestions: [
        'How much do I owe my suppliers?',
        'Which products are running low on stock?',
        'What were my sales this month?',
      ],
    }
  }

  // ── 13. Business Overview / Shop Performance ────────────────────────────────
  const overview = await getOverview(shop.id, { range: '30d' })

  const metrics: AssistantMetric[] = [
    {
      label: 'Outstanding Customer Debt',
      value: formatCurrency(overview.currentOutstandingCustomerDebt),
      accent: 'prominent',
    },
    {
      label: 'Collected Repayments (30d)',
      value: formatCurrency(overview.paymentsCollected),
      accent: 'positive',
    },
    {
      label: 'Credit Issued (30d)',
      value: formatCurrency(overview.creditIssued),
      accent: 'warning',
    },
    {
      label: 'Inventory Retail Value',
      value: formatCurrency(overview.inventoryRetailValue),
      accent: 'neutral',
    },
    {
      label: 'Supplier Payables',
      value: formatCurrency(overview.supplierOutstandingPayable),
      accent: parseFloat(overview.supplierOutstandingPayable) > 0 ? 'danger' : 'neutral',
    },
    {
      label: 'Active Customers',
      value: String(overview.activeCustomersCount),
      accent: 'neutral',
    },
  ]

  const answerText = `Here is your shop's performance snapshot: You currently have ${formatCurrency(overview.currentOutstandingCustomerDebt)} in outstanding customer credit across ${overview.activeCustomersCount} connected customers. Over the last 30 days, you collected ${formatCurrency(overview.paymentsCollected)} in repayments and issued ${formatCurrency(overview.creditIssued)} in credit. Your store inventory has a retail valuation of ${formatCurrency(overview.inventoryRetailValue)}, and outstanding supplier payables stand at ${formatCurrency(overview.supplierOutstandingPayable)}.`

  return {
    question,
    intent: 'BUSINESS_OVERVIEW',
    period: {
      label: 'Last 30 Days & Current Balances',
      startDate: overview.period.startDate,
      endDate: overview.period.endDate,
    },
    answer: answerText,
    metrics,
    suggestedActions: [
      { label: 'Full Analytics Dashboard', path: '/analytics' },
      { label: 'Customer Directory', path: '/customers' },
      { label: 'Manage Inventory', path: '/inventory' },
    ],
    suggestedQuestions: [
      'Who are my top debtors?',
      'Which products are running low on stock?',
      'How much do I owe my suppliers?',
    ],
  }
}

export const getAssistantSuggestions = () => {
  return [
    {
      category: 'Customer Credit & Debt',
      questions: [
        'How much credit is still outstanding?',
        'Which customers have overdue balances?',
        'Who are my top debtors?',
      ],
    },
    {
      category: 'Inventory & Stock',
      questions: [
        'Which products are running low on stock?',
        'What is my current inventory valuation?',
        'Which products sell the most?',
        'Do I have any dead stock?',
      ],
    },
    {
      category: 'Cashflow & Collections',
      questions: [
        'How much did I collect in customer repayments this week?',
        'What were my sales this month?',
        'What were my collections today?',
      ],
    },
    {
      category: 'Suppliers & Payables',
      questions: [
        'How much do I owe my suppliers?',
        'What were my supplier purchases this month?',
      ],
    },
    {
      category: 'Business Performance',
      questions: ['Give me a summary of my shop’s performance.'],
    },
  ]
}
