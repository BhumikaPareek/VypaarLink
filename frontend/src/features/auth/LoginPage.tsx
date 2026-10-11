import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiLogin, apiSendOtp, apiCustomerLogin } from '@/api/auth'
import { useAuthContext } from '@/store/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ApiError } from '@/types/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthContext()

  const [role, setRole] = useState<'SHOPKEEPER' | 'CUSTOMER'>('SHOPKEEPER')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: ({ user }) => {
      setUser(user)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: ApiError) => {
      if (err.errors) {
        const map: Record<string, string> = {}
        err.errors.forEach((e) => { map[e.field] = e.message })
        setFieldErrors(map)
      }
    },
  })

  const sendOtpMutation = useMutation({
    mutationFn: apiSendOtp,
    onSuccess: () => {
      setOtpSent(true)
      setResendCooldown(60)
      const timer = setInterval(() => {
        setResendCooldown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        })
      }, 1000)
    },
    onError: (err: ApiError) => {
      if (err.errors) {
        const map: Record<string, string> = {}
        err.errors.forEach((e) => { map[e.field] = e.message })
        setFieldErrors(map)
      }
    },
  })

  const customerLoginMutation = useMutation({
    mutationFn: () => apiCustomerLogin(phone, otp),
    onSuccess: ({ user }) => {
      setUser(user)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: ApiError) => {
      if (err.errors) {
        const map: Record<string, string> = {}
        err.errors.forEach((e) => { map[e.field] = e.message })
        setFieldErrors(map)
      }
    },
  })

  function handleShopkeeperSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    loginMutation.mutate({ phone, password })
  }

  function handleCustomerSendOtp(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    sendOtpMutation.mutate({ phone, intent: 'CUSTOMER_LOGIN' })
  }

  function handleCustomerVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    customerLoginMutation.mutate()
  }

  const isLoading = loginMutation.isPending || sendOtpMutation.isPending || customerLoginMutation.isPending
  const generalError = loginMutation.error || sendOtpMutation.error || customerLoginMutation.error

  return (
    <div className="min-h-screen bg-bg flex font-sans">
      {/* Left panel - branding (Emerald Commerce Theme) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col p-6 lg:p-8 xl:p-10 relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary-dark rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-primary-light rounded-full opacity-10 blur-3xl"></div>
        
        {/* Header */}
        <div className="relative z-10 flex-none">
          <div className="text-white text-3xl font-bold tracking-tight flex items-center gap-2">
            <svg className="w-8 h-8 text-tangerine" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            VypaarLink
          </div>
          <p className="text-primary-light text-lg mt-2 font-medium">Har Hisaab, Ek Jagah.</p>
        </div>

        {/* Main Content Group */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 py-4 xl:py-6">
          <div className="w-full flex-shrink min-h-0 flex items-center justify-center">
            {/* Custom Kirana Shop & Ledger SVG Illustration */}
            <svg className="w-full max-w-[480px] xl:max-w-[540px] h-auto drop-shadow-2xl max-h-[clamp(240px,40vh,450px)]" viewBox="0 0 650 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background Atmosphere */}
            <circle cx="300" cy="200" r="180" fill="#064E3B" fillOpacity="0.4" />
            <circle cx="300" cy="200" r="130" fill="#064E3B" fillOpacity="0.8" />
            <path d="M50 350 Q 300 420 550 350" stroke="#064E3B" strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />
            
            {/* Connection Arc */}
            <path d="M220 180 Q 300 130 380 180" stroke="#F97316" strokeWidth="3" strokeDasharray="6 6" fill="none" />
            <circle cx="300" cy="155" r="16" fill="#F97316" />
            <path d="M295 155 L305 155 M300 150 L300 160" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

            {/* Shopkeeper Dashboard (Left) - Kirana Context */}
            <g transform="translate(60, 100)">
              {/* Awning/Storefront */}
              <path d="M-10 -10 L190 -10 L180 15 L0 15 Z" fill="#F97316" />
              <path d="M0 15 L20 30 L40 15 L60 30 L80 15 L100 30 L120 15 L140 30 L160 15 L180 30" fill="#F97316" opacity="0.8" />
              
              <rect x="0" y="0" width="180" height="220" rx="12" fill="#FAFAF7" stroke="#066B55" strokeWidth="6" />
              <rect x="0" y="0" width="180" height="50" rx="12" fill="#066B55" />
              <rect x="0" y="40" width="180" height="10" fill="#066B55" />
              
              <circle cx="30" cy="25" r="10" fill="#F97316" />
              <rect x="55" y="21" width="70" height="8" rx="4" fill="#d1fae5" />
              
              {/* Ledger Items */}
              <g transform="translate(0, 20)">
                <rect x="15" y="55" width="150" height="32" rx="6" fill="#FFFFFF" stroke="#e5e7eb" strokeWidth="2" />
                <circle cx="35" cy="71" r="8" fill="#F97316" />
                <rect x="55" y="67" width="50" height="4" rx="2" fill="#17252A" />
                <rect x="55" y="75" width="30" height="4" rx="2" fill="#64748B" />
                <text x="150" y="75" fill="#F97316" fontSize="12" fontWeight="bold" textAnchor="end">₹850</text>
              </g>

              <g transform="translate(0, 65)">
                <rect x="15" y="55" width="150" height="32" rx="6" fill="#FFFFFF" stroke="#e5e7eb" strokeWidth="2" />
                <circle cx="35" cy="71" r="8" fill="#066B55" />
                <rect x="55" y="67" width="40" height="4" rx="2" fill="#17252A" />
                <rect x="55" y="75" width="25" height="4" rx="2" fill="#64748B" />
                <text x="150" y="75" fill="#066B55" fontSize="12" fontWeight="bold" textAnchor="end">Paid</text>
              </g>
              
              <g transform="translate(0, 110)">
                <rect x="15" y="55" width="150" height="32" rx="6" fill="#FFFFFF" stroke="#e5e7eb" strokeWidth="2" />
                <circle cx="35" cy="71" r="8" fill="#F97316" />
                <rect x="55" y="67" width="60" height="4" rx="2" fill="#17252A" />
                <rect x="55" y="75" width="35" height="4" rx="2" fill="#64748B" />
                <text x="150" y="75" fill="#F97316" fontSize="12" fontWeight="bold" textAnchor="end">₹120</text>
              </g>
            </g>

            {/* Customer Phone (Right) */}
            <g transform="translate(360, 60)">
              {/* Phone Body */}
              <rect x="0" y="0" width="160" height="280" rx="24" fill="#17252A" />
              <rect x="6" y="6" width="148" height="268" rx="20" fill="#FAFAF7" />
              
              {/* Notch */}
              <rect x="50" y="6" width="60" height="15" rx="6" fill="#17252A" />
              
              {/* Screen App Header */}
              <rect x="6" y="6" width="148" height="60" rx="18" fill="#066B55" />
              <rect x="6" y="50" width="148" height="16" fill="#066B55" />
              
              {/* Customer Avatar & Name */}
              <circle cx="35" cy="40" r="12" fill="#F97316" />
              <rect x="55" y="36" width="50" height="8" rx="4" fill="#FAFAF7" />
              
              {/* Total Outstanding Card */}
              <rect x="18" y="80" width="124" height="60" rx="8" fill="#FFFFFF" stroke="#e5e7eb" strokeWidth="2" />
              <text x="80" y="105" fill="#64748B" fontSize="10" textAnchor="middle">Total Outstanding</text>
              <text x="80" y="125" fill="#066B55" fontSize="16" fontWeight="bold" textAnchor="middle">₹ 970</text>

              {/* Transactions List */}
              <g transform="translate(0, 30)">
                <rect x="18" y="130" width="124" height="35" rx="6" fill="#e5e7eb" fillOpacity="0.4" />
                <circle cx="35" cy="147" r="8" fill="#F97316" />
                <rect x="50" y="141" width="35" height="4" rx="2" fill="#17252A" />
                <rect x="50" y="149" width="20" height="4" rx="2" fill="#64748B" />
                <circle cx="125" cy="147" r="6" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
                <path d="M123 147 l2 2 l3 -4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              
              <g transform="translate(0, 75)">
                <rect x="18" y="130" width="124" height="35" rx="6" fill="#e5e7eb" fillOpacity="0.4" />
                <circle cx="35" cy="147" r="8" fill="#066B55" />
                <rect x="50" y="141" width="30" height="4" rx="2" fill="#17252A" />
                <rect x="50" y="149" width="25" height="4" rx="2" fill="#64748B" />
                <circle cx="125" cy="147" r="6" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
                <path d="M123 147 l2 2 l3 -4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            </g>

            {/* Floating Badges */}
            <g transform="translate(60, 45)">
              <rect x="0" y="0" width="90" height="30" rx="15" fill="#FFFFFF" stroke="#066B55" strokeWidth="2" />
              <circle cx="15" cy="15" r="6" fill="#066B55" />
              <text x="30" y="20" fill="#066B55" fontSize="12" fontWeight="bold">Trusted</text>
            </g>

            <g transform="translate(535, 110)">
              <rect x="0" y="0" width="100" height="30" rx="15" fill="#FFFFFF" stroke="#F97316" strokeWidth="2" />
              <circle cx="15" cy="15" r="6" fill="#10B981" />
              <text x="30" y="20" fill="#F97316" fontSize="12" fontWeight="bold">Confirmed</text>
            </g>
          </svg>
          </div>
          
          <div className="text-center space-y-2 max-w-md mx-auto mt-4 xl:mt-6 flex-none">
            <h2 className="text-[clamp(1.25rem,2.5vh,1.875rem)] font-semibold text-white tracking-tight leading-snug">
              Every transaction recorded.<br/>
              Every balance transparent.
            </h2>
            <p className="text-primary-light text-[clamp(0.875rem,2vh,1.125rem)] font-medium">
              Every relationship built on trust.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-bg relative">
        <div className="w-full max-w-md mx-auto relative z-10">
          
          <div className="lg:hidden mb-8 text-center flex flex-col items-center">
            <svg className="w-10 h-10 text-primary mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <div className="text-primary text-2xl font-bold tracking-tight">VypaarLink</div>
            <p className="text-text-muted text-sm mt-1">Har Hisaab, Ek Jagah.</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text">Welcome back</h1>
            <p className="text-text-muted text-sm mt-1">Sign in to your VypaarLink account</p>
          </div>

          {/* Role Selector */}
          {!otpSent && (
            <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'SHOPKEEPER' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text'}`}
                onClick={() => { setRole('SHOPKEEPER'); setFieldErrors({}); setPhone(''); setPassword(''); }}
              >
                Shopkeeper
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'CUSTOMER' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text'}`}
                onClick={() => { setRole('CUSTOMER'); setFieldErrors({}); setPhone(''); }}
              >
                Customer
              </button>
            </div>
          )}

          {generalError && !generalError.errors && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-5">
              <p className="text-sm text-red-700">
                {(generalError as ApiError)?.message ?? 'Something went wrong. Please try again.'}
              </p>
            </div>
          )}

          {role === 'SHOPKEEPER' ? (
            <form onSubmit={handleShopkeeperSubmit} noValidate className="space-y-4">
              <Input
                label="Phone number"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={fieldErrors['phone']}
                required
                disabled={isLoading}
                autoComplete="tel"
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors['password']}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <Button type="submit" variant="primary" size="lg" loading={isLoading} disabled={isLoading} className="w-full bg-primary hover:bg-primary-dark border-transparent text-white shadow-md">
                {isLoading ? 'Signing in...' : 'Sign in as Shopkeeper'}
              </Button>
              <p className="pt-2 text-center text-sm text-text-muted">
                New shopkeeper?{' '}
                <Link to="/register" className="text-primary font-medium hover:text-primary-dark hover:underline">
                  Create business account
                </Link>
              </p>
            </form>
          ) : (
            <>
              {!otpSent ? (
                <form onSubmit={handleCustomerSendOtp} noValidate className="space-y-4">
                  <Input
                    label="Registered Mobile Number"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={fieldErrors['phone']}
                    required
                    disabled={isLoading}
                    autoComplete="tel"
                    autoFocus
                  />
                  <Button type="submit" variant="primary" size="lg" loading={isLoading} disabled={isLoading} className="w-full bg-primary hover:bg-primary-dark border-transparent text-white shadow-md">
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                  <p className="pt-2 text-center text-xs text-text-muted">
                    Customers do not need to register. You can log in as soon as a shopkeeper adds you.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleCustomerVerifyOtp} noValidate className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-text-muted">Enter the 6-digit OTP sent to</p>
                    <p className="font-semibold text-text">+91 {phone}</p>
                    <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-primary hover:underline mt-1">Change number</button>
                  </div>
                  <Input
                    label="One-Time Password (OTP)"
                    type="text"
                    inputMode="numeric"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    error={fieldErrors['otp']}
                    required
                    disabled={isLoading}
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    className="text-center text-xl tracking-widest"
                  />
                  <Button type="submit" variant="primary" size="lg" loading={isLoading} disabled={isLoading || otp.length !== 6} className="w-full bg-primary hover:bg-primary-dark border-transparent text-white shadow-md">
                    {isLoading ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                  
                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={handleCustomerSendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className="text-sm text-primary hover:text-primary-dark font-medium disabled:text-gray-400 disabled:no-underline"
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
