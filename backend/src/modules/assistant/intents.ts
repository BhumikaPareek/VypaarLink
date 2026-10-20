export type IntentType =
  | 'CUSTOMER_CREDIT'
  | 'CUSTOMER_DEBTORS'
  | 'INVENTORY_LOW_STOCK'
  | 'INVENTORY_VALUATION'
  | 'INVENTORY_FAST_MOVING'
  | 'INVENTORY_DEAD_STOCK'
  | 'SALES_SUMMARY'
  | 'CASH_COLLECTIONS'
  | 'SUPPLIER_PAYABLES'
  | 'SUPPLIER_PURCHASES'
  | 'BUSINESS_OVERVIEW'
  | 'ACTION_REQUEST'
  | 'UNSUPPORTED'

export type ExtractedPeriod = {
  range: 'today' | '7d' | '30d' | 'month' | 'last_month' | 'all'
  label: string
  startDate: Date | null
  endDate: Date
}

export const extractPeriod = (question: string, defaultRange: 'all' | '30d' = '30d'): ExtractedPeriod => {
  const q = question.toLowerCase()
  const now = new Date()
  let range: ExtractedPeriod['range'] = defaultRange
  let label = defaultRange === 'all' ? 'All Time' : 'Last 30 Days'
  let startDate: Date | null = null
  const endDate: Date = now

  if (q.includes('today')) {
    range = 'today'
    label = 'Today'
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    startDate = todayStart
  } else if (q.includes('yesterday')) {
    range = 'today'
    label = 'Yesterday'
    const yStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    yStart.setHours(0, 0, 0, 0)
    const yEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    yEnd.setHours(23, 59, 59, 999)
    return { range, label, startDate: yStart, endDate: yEnd }
  } else if (q.includes('this week') || q.includes('past week') || q.includes('last 7 days') || q.includes('7 days') || q.includes('week')) {
    range = '7d'
    label = 'Last 7 Days'
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (q.includes('last month')) {
    range = 'last_month'
    label = 'Last Month'
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { range, label, startDate: prevMonthStart, endDate: prevMonthEnd }
  } else if (q.includes('this month') || q.includes('current month') || q.includes('month')) {
    range = 'month'
    label = 'This Month'
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (q.includes('all time') || q.includes('overall') || q.includes('cumulative') || q.includes('total debt')) {
    range = 'all'
    label = 'All Time'
    startDate = null
  } else if (defaultRange === '30d') {
    range = '30d'
    label = 'Last 30 Days'
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { range, label, startDate, endDate }
}

export const classifyIntent = (question: string): { intent: IntentType; reason: string } => {
  const q = question.toLowerCase().trim()

  // ── 1. Distinguish Inquiries vs Mutation Requests ───────────────────────────
  // Inquiry prefixes indicate questions seeking information rather than mutations
  const inquiryPrefixes = [
    'how much',
    'how many',
    'how is',
    'how are',
    'how was',
    'how were',
    'how do i',
    'how can i',
    "how's",
    'what is',
    'what are',
    'what was',
    'what were',
    'what did',
    "what's",
    'who owes',
    'who has',
    'who is',
    'who are',
    'who ',
    'which customer',
    'which supplier',
    'which product',
    'which item',
    'which bill',
    'which ',
    'did i pay',
    'did i receive',
    'did i collect',
    'did i ',
    'have i paid',
    'have i ',
    'do i owe',
    'do i have',
    'do i ',
    'does ',
    'is there',
    'are there',
    'show me',
    'show ',
    'list ',
    'give me',
    'tell me',
    'view ',
    'check ',
    'display ',
  ]

  // Strip polite or conversational auxiliary prefixes (e.g., "Please register...", "Can you create...")
  const politePrefixRegex =
    /^(please|pls|kindly|can you please|could you please|would you please|can you|could you|would you|can we|could we|help me to|help me|i want to|i need to|i would like to|i'd like to|i want you to|i need you to|i would like you to|i'd like you to|let's|lets)\s+/i

  const stripped = q.replace(politePrefixRegex, '').trim()

  // Check if stripped prompt or original prompt is an inquiry seeking data
  const isExplicitInquiry = inquiryPrefixes.some(
    (prefix) => q.startsWith(prefix) || stripped.startsWith(prefix)
  )

  // Action verbs and target entities for mutations
  const actionVerbs = [
    'create',
    'add',
    'register',
    'new',
    'record',
    'insert',
    'save',
    'post',
    'delete',
    'remove',
    'cancel',
    'archive',
    'drop',
    'update',
    'modify',
    'change',
    'set',
    'edit',
    'mark',
    'increase',
    'decrease',
    'adjust',
    'reduce',
    'restock',
    'pay',
    'clear',
  ]

  const actionTargets = [
    'customer',
    'product',
    'item',
    'stock',
    'inventory',
    'supplier',
    'payment',
    'repayment',
    'transaction',
    'order',
    'purchase order',
    'po',
    'bill',
    'invoice',
    'debt',
    'balance',
    'udhaar',
    'price',
    'quantity',
  ]

  // Detect explicit mutation phrasing
  const startsWithActionVerb = actionVerbs.some(
    (verb) => stripped === verb || stripped.startsWith(verb + ' ')
  )
  const hasActionTarget = actionTargets.some((target) => stripped.includes(target) || q.includes(target))

  // Natural mutation idioms like "mark ... as paid", "increase stock", "record a repayment"
  const isIdiomaticMutation =
    /mark\s+.*(as\s+)?paid/i.test(q) ||
    /mark\s+.*(as\s+)?received/i.test(q) ||
    /(increase|decrease|adjust|reduce|add\s+to|cut)\s+(the\s+)?(stock|quantity|inventory)/i.test(q) ||
    /record\s+(a\s+)?(repayment|payment|transaction|sale|credit)/i.test(q) ||
    /register\s+(a\s+)?(new\s+)?(customer|supplier)/i.test(q) ||
    /create\s+(a\s+)?(new\s+)?(product|customer|supplier|order|po|bill)/i.test(q) ||
    /delete\s+(this\s+|the\s+|a\s+)?(customer|supplier|product|item|order)/i.test(q) ||
    /pay\s+(this\s+|the\s+)?(supplier|bill|order|po)/i.test(q)

  const isMutationRequest = !isExplicitInquiry && (isIdiomaticMutation || (startsWithActionVerb && hasActionTarget))

  if (isMutationRequest) {
    return {
      intent: 'ACTION_REQUEST',
      reason: 'The question requests a database creation, update, or deletion action.',
    }
  }

  // ── 2. Customer Debtors & Overdue (Specific customer debtors / aging inquiry)
  if (
    q.includes('who owes') ||
    q.includes('which customer') ||
    q.includes('which customers') ||
    q.includes('top debtor') ||
    q.includes('top debtors') ||
    q.includes('overdue balance') ||
    q.includes('overdue customer') ||
    q.includes('pending customer') ||
    q.includes('unpaid customer') ||
    q.includes('debtor') ||
    q.includes('debtors') ||
    q.includes('credit aging') ||
    q.includes('aging') ||
    q.includes('customers with outstanding') ||
    q.includes('customers with debt') ||
    q.includes('customers who owe')
  ) {
    return { intent: 'CUSTOMER_DEBTORS', reason: 'Customer debtors and overdue credit inquiry' }
  }

  // ── 3. Customer Credit Total / Outstanding Balances ─────────────────────────
  if (
    q.includes('credit') ||
    q.includes('udhaar') ||
    q.includes('outstanding balance') ||
    q.includes('total credit') ||
    q.includes('customer balance') ||
    q.includes('customer debt') ||
    q.includes('credit given') ||
    q.includes('credit issued') ||
    q.includes('lent') ||
    q.includes('how much is owed to me') ||
    q.includes('how much do customers owe')
  ) {
    return { intent: 'CUSTOMER_CREDIT', reason: 'Customer credit and outstanding balance inquiry' }
  }

  // ── 4. Inventory: Low Stock / Out of Stock ──────────────────────────────────
  if (
    q.includes('low stock') ||
    q.includes('out of stock') ||
    q.includes('running low') ||
    q.includes('empty stock') ||
    q.includes('reorder') ||
    q.includes('shortage') ||
    q.includes('stock alert') ||
    q.includes('need restocking') ||
    q.includes('restock needed')
  ) {
    return { intent: 'INVENTORY_LOW_STOCK', reason: 'Low stock and replenishment inquiry' }
  }

  // ── 5. Inventory: Fast-moving / Top Selling ─────────────────────────────────
  if (
    q.includes('sell the most') ||
    q.includes('top sell') ||
    q.includes('best sell') ||
    q.includes('fast moving') ||
    q.includes('popular item') ||
    q.includes('highest selling') ||
    q.includes('most sold') ||
    q.includes('top product') ||
    q.includes('top products') ||
    q.includes('best selling')
  ) {
    return { intent: 'INVENTORY_FAST_MOVING', reason: 'Fast moving and top selling products inquiry' }
  }

  // ── 6. Inventory: Dead Stock / Stagnant ──────────────────────────────────────
  if (
    q.includes('dead stock') ||
    q.includes('stagnant') ||
    q.includes('not selling') ||
    q.includes('unsold') ||
    q.includes('slow moving') ||
    q.includes('no movement') ||
    q.includes('zero movement') ||
    q.includes('inactive product') ||
    q.includes('inactive stock')
  ) {
    return { intent: 'INVENTORY_DEAD_STOCK', reason: 'Dead stock and inactive inventory inquiry' }
  }

  // ── 7. Inventory: Valuation / Value ─────────────────────────────────────────
  if (
    q.includes('inventory value') ||
    q.includes('stock value') ||
    q.includes('worth of stock') ||
    q.includes('worth of my stock') ||
    (q.includes('worth') && (q.includes('stock') || q.includes('inventory'))) ||
    q.includes('inventory valuation') ||
    q.includes('cost basis') ||
    q.includes('value of inventory') ||
    q.includes('value of my stock') ||
    q.includes('how much is my stock worth') ||
    q.includes('worth of inventory')
  ) {
    return { intent: 'INVENTORY_VALUATION', reason: 'Inventory valuation and cost basis inquiry' }
  }

  // ── 8. Cash Collections / Repayments ────────────────────────────────────────
  if (
    q.includes('repayment') ||
    q.includes('repayments') ||
    q.includes('collection') ||
    q.includes('collections') ||
    q.includes('payment collected') ||
    q.includes('payments collected') ||
    q.includes('collected') ||
    q.includes('received from customer') ||
    q.includes('cash in') ||
    q.includes('cash collected') ||
    q.includes('customer payment') ||
    q.includes('customer payments') ||
    q.includes('payments received') ||
    q.includes('collected from customer')
  ) {
    return { intent: 'CASH_COLLECTIONS', reason: 'Customer repayment collections inquiry' }
  }

  // ── 9. Sales Summary / Revenue ──────────────────────────────────────────────
  if (
    q.includes('sale') ||
    q.includes('sales') ||
    q.includes('revenue') ||
    q.includes('turnover') ||
    q.includes('how much did i sell') ||
    q.includes('credit sale') ||
    q.includes('credit sales') ||
    q.includes('sales volume')
  ) {
    return { intent: 'SALES_SUMMARY', reason: 'Store sales volume and revenue inquiry' }
  }

  // ── 10. Supplier Payables / Liabilities ─────────────────────────────────────
  if (
    q.includes('owe my supplier') ||
    q.includes('owe supplier') ||
    q.includes('owe suppliers') ||
    q.includes('supplier debt') ||
    q.includes('supplier payable') ||
    q.includes('supplier payables') ||
    q.includes('unpaid supplier') ||
    q.includes('unpaid suppliers') ||
    q.includes('unpaid bill') ||
    q.includes('unpaid bills') ||
    q.includes('payable') ||
    q.includes('payables') ||
    q.includes('supplier balance') ||
    q.includes('supplier liability') ||
    q.includes('supplier liabilities') ||
    q.includes('how much do i owe')
  ) {
    return { intent: 'SUPPLIER_PAYABLES', reason: 'Supplier liabilities and payables inquiry' }
  }

  // ── 11. Supplier Purchases / Orders ─────────────────────────────────────────
  if (
    q.includes('purchase order') ||
    q.includes('purchase orders') ||
    q.includes('supplier purchase') ||
    q.includes('supplier purchases') ||
    q.includes('stock purchase') ||
    q.includes('supplier payment') ||
    q.includes('supplier payments') ||
    q.includes('paid to supplier') ||
    q.includes('paid to suppliers') ||
    q.includes('pay my supplier') ||
    q.includes('pay my suppliers') ||
    q.includes('paid supplier') ||
    q.includes('paid suppliers') ||
    q.includes('recent purchase') ||
    q.includes('recent purchases') ||
    q.includes('bought from supplier') ||
    q.includes('purchased from supplier') ||
    q.includes('supplier') ||
    q.includes('suppliers')
  ) {
    return { intent: 'SUPPLIER_PURCHASES', reason: 'Supplier orders and purchase history inquiry' }
  }

  // ── 12. Business Overview / Shop Performance ────────────────────────────────
  if (
    q.includes('summary') ||
    q.includes('performance') ||
    q.includes('overview') ||
    q.includes('how is my shop doing') ||
    q.includes('how is my business doing') ||
    q.includes('how is business doing') ||
    (q.includes('how is') && (q.includes('business') || q.includes('shop') || q.includes('store'))) ||
    q.includes('business health') ||
    q.includes('store health') ||
    q.includes('report') ||
    q.includes('dashboard') ||
    q.includes('overall')
  ) {
    return { intent: 'BUSINESS_OVERVIEW', reason: 'Store business overview and performance summary' }
  }

  return {
    intent: 'UNSUPPORTED',
    reason: 'The question does not match any known business domain.',
  }
}
