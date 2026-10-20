import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiAskAssistant, apiGetAssistantSuggestions } from '@/api/assistant'
import type {
  ChatMessage,
  AssistantMetric,
  AssistantDetailItem,
  AssistantActionLink,
} from '@/types/assistant'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/utils/format'

const INTENT_LABELS: Record<string, string> = {
  CUSTOMER_CREDIT: 'Customer Credit',
  CUSTOMER_DEBTORS: 'Top Debtors',
  INVENTORY_LOW_STOCK: 'Low Stock Alert',
  INVENTORY_VALUATION: 'Inventory Valuation',
  INVENTORY_FAST_MOVING: 'Sales Velocity',
  INVENTORY_DEAD_STOCK: 'Dead Stock Audit',
  SALES_SUMMARY: 'Sales Performance',
  CASH_COLLECTIONS: 'Cash Collections',
  SUPPLIER_PAYABLES: 'Supplier Payables',
  SUPPLIER_PURCHASES: 'Purchase Orders',
  BUSINESS_OVERVIEW: 'Business Overview',
  ACTION_REQUEST: 'Read-Only Safety',
  UNSUPPORTED: 'Store Guidance',
}

function MetricCard({ metric }: { metric: AssistantMetric }) {
  const accentBorder = {
    positive: 'border-l-4 border-l-emerald-500 bg-emerald-50/40 text-emerald-950',
    warning: 'border-l-4 border-l-amber-500 bg-amber-50/40 text-amber-950',
    danger: 'border-l-4 border-l-red-500 bg-red-50/40 text-red-950',
    prominent: 'border-l-4 border-l-primary bg-primary/5 text-primary-dark',
    neutral: 'border-l-4 border-l-gray-300 bg-gray-50/70 text-gray-900',
  }[metric.accent || 'neutral']

  return (
    <div className={`p-3.5 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between ${accentBorder}`}>
      <span className="text-xs font-medium text-text-muted leading-tight">{metric.label}</span>
      <span className="text-lg font-bold tracking-tight mt-1 text-text">{metric.value}</span>
    </div>
  )
}

function DetailItemRow({ item }: { item: AssistantDetailItem }) {
  const badgeVariant = item.badgeVariant || 'neutral'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-surface border border-border/70 hover:border-primary/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-text truncate">{item.title}</span>
          {item.badge && <Badge variant={badgeVariant} label={item.badge} size="sm" />}
        </div>
        {item.subtitle && <p className="text-xs text-text-muted mt-0.5">{item.subtitle}</p>}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
        {item.amount && <span className="text-sm font-bold text-text">{item.amount}</span>}
        {item.link && (
          <Link
            to={item.link}
            className="text-xs font-semibold text-primary hover:text-primary-dark hover:underline flex items-center gap-1"
          >
            <span>View</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  )
}

function ActionButtons({ actions }: { actions: AssistantActionLink[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
      <span className="text-xs font-semibold text-text-muted self-center mr-1">Recommended Actions:</span>
      {actions.map((act) => (
        <Link
          key={act.path}
          to={act.path}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <span>{act.label}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      ))}
    </div>
  )
}

function SuggestedQuestions({
  questions,
  onSelect,
}: {
  questions: string[]
  onSelect: (q: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
      <span className="text-xs font-semibold text-text-muted self-center mr-1">Follow-up Questions:</span>
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-primary/25 text-primary hover:bg-primary hover:text-white hover:border-transparent transition-all text-left"
        >
          {q}
        </button>
      ))}
    </div>
  )
}

let msgCounter = 0
function generateMessageId(): string {
  msgCounter += 1
  return `msg-${Date.now()}-${msgCounter}`
}

function getNowIso(): string {
  return new Date().toISOString()
}

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Query starter suggestions
  const { data: suggestionsData, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ['assistant-suggestions'],
    queryFn: apiGetAssistantSuggestions,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })

  // Mutation for asking questions
  const askMutation = useMutation({
    mutationFn: (question: string) => apiAskAssistant(question),
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        timestamp: getNowIso(),
        data,
      }
      setMessages((prev) => [...prev, assistantMsg])
    },
    onError: (err: any, question) => {
      const errorMsg: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        timestamp: getNowIso(),
        error: err?.message || 'Unable to fetch business insights. Please check your connection and try again.',
        failedQuestion: question,
      }
      setMessages((prev) => [...prev, errorMsg])
    },
  })

  const isPending = askMutation.isPending

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  const handleSend = (overrideQuestion?: string) => {
    const questionToSend = (overrideQuestion || input).trim()
    if (!questionToSend || questionToSend.length < 2 || isPending) return

    const userMsg: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      timestamp: getNowIso(),
      content: questionToSend,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!overrideQuestion) {
      setInput('')
    }

    askMutation.mutate(questionToSend)
  }

  // Modern Web Guidance: IME-safe Enter-to-Submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Catch IME composition in browsers & WebKit Safari keyCode 229 bug
      if (e.nativeEvent.isComposing || (e.nativeEvent as any).keyCode === 229) {
        return
      }
      handleSend()
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setInput('')
    textareaRef.current?.focus()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="10" rx="2" strokeWidth={2} />
                <circle cx="12" cy="5" r="2" strokeWidth={2} />
                <path d="M12 7v4" strokeWidth={2} />
                <line x1="8" y1="16" x2="8" y2="16.01" strokeWidth={3} strokeLinecap="round" />
                <line x1="16" y1="16" x2="16" y2="16.01" strokeWidth={3} strokeLinecap="round" />
              </svg>
              Business Assistant
            </h1>
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Ledger Grounding
            </span>
          </div>
          <p className="text-text-muted text-sm mt-1">
            Ask plain-language business questions. All answers are derived directly from your actual customer ledgers, inventory counts, and supplier records.
          </p>
        </div>

        {messages.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleClearChat} className="self-end sm:self-auto">
            <svg className="w-4 h-4 mr-1 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Conversation
          </Button>
        )}
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-col gap-4">
        {/* Empty State / Starter Suggestions Screen */}
        {messages.length === 0 && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text">Namaste! How can I help your store today?</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Choose a suggested question below or type your own question into the box. The assistant checks your real database to give you exact numbers.
              </p>
            </div>

            {/* Value Guarantees Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-border/60">
                <span className="text-lg">🛡️</span>
                <div>
                  <h4 className="text-xs font-bold text-text">Strictly Read-Only</h4>
                  <p className="text-[11px] text-text-muted">Protects ledger & stock integrity</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-border/60">
                <span className="text-lg">📊</span>
                <div>
                  <h4 className="text-xs font-bold text-text">Real Records Only</h4>
                  <p className="text-[11px] text-text-muted">Zero hallucinations or fake data</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-border/60">
                <span className="text-lg">⚡</span>
                <div>
                  <h4 className="text-xs font-bold text-text">Instant Insights</h4>
                  <p className="text-[11px] text-text-muted">FIFO aging, valuation & cashflow</p>
                </div>
              </div>
            </div>

            {/* Categorized Question Chips */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Explore Questions by Category
              </h3>

              {isSuggestionsLoading ? (
                <div className="py-6 text-center text-sm text-text-muted">Loading starter suggestions...</div>
              ) : (
                <div className="space-y-4">
                  {suggestionsData?.categories.map((cat) => (
                    <div key={cat.category} className="space-y-2">
                      <h4 className="text-xs font-semibold text-text">{cat.category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {cat.questions.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleSend(q)}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-gray-50 hover:bg-primary hover:text-white border border-border/80 hover:border-transparent transition-all shadow-2xs text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-primary text-white rounded-2xl rounded-tr-xs p-4 max-w-[85%] sm:max-w-[75%] shadow-sm space-y-1">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-primary-light">
                    <span className="font-semibold">You</span>
                    <span>{formatDateTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )
          }

          // Assistant message with error
          if (msg.error) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-xs p-4 sm:p-5 max-w-[95%] sm:max-w-[85%] shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-bold text-sm">Query Error</span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">{msg.error}</p>
                  {msg.failedQuestion && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSend(msg.failedQuestion)}
                      className="text-xs"
                    >
                      Retry Question
                    </Button>
                  )}
                </div>
              </div>
            )
          }

          // Successful Assistant response
          const data = msg.data!
          const intentLabel = INTENT_LABELS[data.intent] || data.intent

          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-tl-xs p-5 sm:p-6 max-w-[95%] sm:max-w-[88%] shadow-sm space-y-4">
                {/* Assistant Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      VL
                    </div>
                    <div>
                      <span className="text-xs font-bold text-text">VypaarLink Assistant</span>
                      <span className="text-[10px] text-text-muted ml-2">{formatDateTime(msg.timestamp)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-medium bg-gray-100 text-text-muted px-2 py-0.5 rounded-md">
                      {data.period.label}
                    </span>
                    <Badge variant="info" label={intentLabel} size="sm" />
                  </div>
                </div>

                {/* Plain Answer Text */}
                <p className="text-sm text-text leading-relaxed font-normal whitespace-pre-wrap">
                  {data.answer}
                </p>

                {/* Structured Metrics Grid */}
                {data.metrics && data.metrics.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.metrics.map((m, idx) => (
                      <MetricCard key={idx} metric={m} />
                    ))}
                  </div>
                )}

                {/* Structured Details Breakdown */}
                {data.details && data.details.items.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                      Detailed Breakdown
                    </h4>
                    <div className="space-y-1.5">
                      {data.details.items.map((item, idx) => (
                        <DetailItemRow key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Action Links */}
                {data.suggestedActions && data.suggestedActions.length > 0 && (
                  <ActionButtons actions={data.suggestedActions} />
                )}

                {/* Contextual Follow-up Questions */}
                {data.suggestedQuestions && data.suggestedQuestions.length > 0 && (
                  <SuggestedQuestions
                    questions={data.suggestedQuestions}
                    onSelect={(q) => handleSend(q)}
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* Loading Indicator */}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-tl-xs p-4 max-w-[85%] shadow-sm flex items-center gap-3">
              <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="text-xs text-text-muted font-medium">
                Analyzing store ledgers, inventory counts, and invoices...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Box (Sticky Bottom Container) ── */}
      <div className="sticky bottom-4 z-10 bg-surface/95 backdrop-blur-md rounded-2xl border border-border shadow-md p-3 sm:p-4 transition-shadow">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="assistant-input" className="sr-only">
            Ask a business question
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="assistant-input"
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, e.g. 'Who are my top debtors?' or 'Which products are low on stock?'..."
              disabled={isPending}
              className="flex-1 resize-none bg-transparent p-2.5 text-sm text-text placeholder-text-muted focus:outline-none rounded-xl border border-border focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={isPending || !input.trim() || input.trim().length < 2}
              loading={isPending}
              className="h-11 px-4 self-end flex-shrink-0"
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="hidden sm:inline">Ask</span>
            </Button>
          </div>

          <div className="flex justify-between items-center text-[11px] text-text-muted px-1">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[10px]">Enter</kbd> to submit, <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[10px]">Shift + Enter</kbd> for new line</span>
            <span className="hidden sm:inline">🔒 Read-only assistant</span>
          </div>
        </form>
      </div>
    </div>
  )
}
