export type AnalyticsRange = '7d' | '30d' | 'month' | 'all' | 'custom'

export type AnalyticsFilter = {
  range: AnalyticsRange
  startDate?: string
  endDate?: string
  groupBy?: 'day' | 'week' | 'month'
}

export type AnalyticsOverview = {
  creditIssued: string
  paymentsCollected: string
  netCreditChange: string
  currentOutstandingCustomerDebt: string
  creditTransactionsCount: number
  paymentTransactionsCount: number
  inventoryRetailValue: string
  inventoryCostBasis: string
  lowStockCount: number
  outOfStockCount: number
  totalProductsCount: number
  supplierOutstandingPayable: string
  activeCustomersCount: number
  activeSuppliersCount: number
  period: {
    range: string
    startDate: string | null
    endDate: string
  }
}

export type AgingBucket = {
  bucket: string
  label: string
  amount: string
  customerCount: number
  percentage: number
}

export type TopDebtor = {
  customerId: string
  name: string
  phone: string
  balance: string
  oldestDebtDays: number
}

export type CreditAgingData = {
  totalOutstanding: string
  totalDebtors: number
  buckets: AgingBucket[]
  topDebtors: TopDebtor[]
}

export type CashflowInterval = {
  key: string
  date: string
  label: string
  creditIssued: number
  paymentsCollected: number
  netCashflow: number
}

export type CashflowData = {
  groupBy: 'day' | 'week' | 'month'
  period: {
    range: string
    startDate: string
    endDate: string
    totalDays: number
  }
  summary: {
    totalCredit: string
    totalPayments: string
    netCashflow: string
    averageDailyCredit: string
    averageDailyPayment: string
  }
  timeline: CashflowInterval[]
}

export type FastMovingProduct = {
  productId: string
  name: string
  sku: string | null
  category: string | null
  quantitySold: number
  unit: string
  price: string
  totalRevenue: string
  currentStock: number
}

export type DeadStockProduct = {
  productId: string
  name: string
  sku: string | null
  category: string | null
  quantity: number
  unit: string
  price: string
  tiedUpCapital: string
  lastActivityDate: string
  daysInactive: number
}

export type StockoutProjection = {
  productId: string
  name: string
  category: string | null
  currentStock: number
  unit: string
  unitsSoldInPeriod: number
  dailyVelocity: number
  daysUntilStockout: number | null
  hasSufficientData: boolean
}

export type InventoryItemSummary = {
  id: string
  name: string
  sku: string | null
  category: string | null
  price: string
  quantity: number
  unit: string
  lowStockThreshold: number
}

export type InventoryInsightsData = {
  summary: {
    totalActiveProducts: number
    lowStockCount: number
    outOfStockCount: number
    deadStockCount: number
  }
  lowStockItems: InventoryItemSummary[]
  outOfStockItems: InventoryItemSummary[]
  fastMovingProducts: FastMovingProduct[]
  deadStockProducts: DeadStockProduct[]
  stockoutProjections: StockoutProjection[]
}

export type POStatusDist = {
  status: string
  count: number
  totalAmount: string
}

export type TopSupplierSpend = {
  supplierId: string
  supplierName: string
  phone: string
  poCount: number
  totalSpend: string
  totalPaid: string
  outstandingBalance: string
}

export type PayableAgingBucket = {
  bucket: string
  label: string
  amount: string
  poCount: number
}

export type SupplierInsightsData = {
  totalPurchases: string
  totalPaid: string
  outstandingPayables: string
  poStatusDistribution: POStatusDist[]
  topSuppliersBySpend: TopSupplierSpend[]
  payableAging: PayableAgingBucket[]
}
