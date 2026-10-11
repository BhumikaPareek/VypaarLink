/**
 * features/auth/RegisterPage.tsx - VypaarLink registration page
 */

import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiRegister, apiSendOtp } from '@/api/auth'
import { useAuthContext } from '@/store/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ApiError } from '@/types/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthContext()

  const [step, setStep] = useState<1 | 2>(1)
  
  // Form State
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'SHOPKEEPER' | 'CUSTOMER'>('SHOPKEEPER')
  
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const otpMutation = useMutation({
    mutationFn: apiSendOtp,
    onSuccess: () => {
      setStep(2)
      setServerError(null)
      setFieldErrors({})
    },
    onError: (err: ApiError) => {
      if (err.errors) {
        const map: Record<string, string> = {}
        err.errors.forEach((e) => { map[e.field] = e.message })
        setFieldErrors(map)
      } else {
        setServerError(err.message ?? 'Failed to send OTP')
      }
    },
  })

  const registerMutation = useMutation({
    mutationFn: apiRegister,
    onSuccess: ({ user }) => {
      setUser(user)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: ApiError) => {
      if (err.errors) {
        const map: Record<string, string> = {}
        err.errors.forEach((e) => { map[e.field] = e.message })
        setFieldErrors(map)
      } else {
        setServerError(err.message ?? 'Registration failed')
      }
    },
  })

  function handleSendOtp(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setServerError(null)
    otpMutation.mutate({ phone })
  }

  function handleVerifyAndRegister(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setServerError(null)
    registerMutation.mutate({
      name,
      phone,
      email: email || undefined,
      password,
      role,
      otp,
    })
  }

  const isLoading = otpMutation.isPending || registerMutation.isPending

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/2 bg-green-600 flex-col justify-between p-12">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">VypaarLink</div>
          <p className="text-green-100 text-sm mt-1">Digital business companion</p>
        </div>
        <div className="text-white space-y-4">
          <h2 className="text-2xl font-semibold leading-snug">
            Secure digital ledger for kirana stores.
          </h2>
          <p className="text-green-100 text-sm leading-relaxed">
            Register or securely claim your customer account using mobile verification.
          </p>
        </div>
        <p className="text-green-200 text-xs">© 2026 VypaarLink</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile branding */}
          <div className="lg:hidden mb-8 text-center">
            <div className="text-green-600 text-2xl font-bold">VypaarLink</div>
            <p className="text-gray-500 text-sm">Digital business companion</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 ? 'Create your account' : 'Verify & Complete'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1 ? 'Start managing your business digitally' : `Enter the 6-digit OTP sent to ${phone}`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} noValidate className="space-y-5">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-2">
                  I am a <span className="text-red-500">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {(['SHOPKEEPER', 'CUSTOMER'] as const).map((r) => (
                    <label
                      key={r}
                      className={[
                        'flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer',
                        'transition-colors duration-150',
                        role === r
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={role === r}
                        onChange={() => setRole(r)}
                        className="sr-only"
                        disabled={isLoading}
                      />
                      <span className="text-sm font-medium">
                        {r === 'SHOPKEEPER' ? '🏪 Shopkeeper' : '👤 Customer'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Input
                label="Phone number"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={fieldErrors['phone']}
                hint="Used to securely verify your identity"
                required
                disabled={isLoading}
                autoComplete="tel"
                autoFocus
              />

              {serverError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{serverError}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={otpMutation.isPending}
                disabled={isLoading || !phone}
                className="w-full mt-2"
              >
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} noValidate className="space-y-4">
              <Input
                label="6-Digit OTP"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                error={fieldErrors['otp']}
                required
                disabled={isLoading}
                autoFocus
                className="text-center text-xl tracking-widest font-mono"
              />

              <Input
                label="Full name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors['name']}
                required
                disabled={isLoading}
                autoComplete="name"
              />

              <Input
                label="Email (optional)"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors['email']}
                disabled={isLoading}
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors['password']}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />

              {serverError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{serverError}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={registerMutation.isPending}
                disabled={isLoading || otp.length !== 6 || !name || !password}
                className="w-full mt-4"
              >
                Verify & Create Account
              </Button>
              
              <button 
                type="button" 
                onClick={() => { setStep(1); setServerError(null); }}
                className="text-sm text-green-600 w-full text-center hover:underline mt-2"
                disabled={isLoading}
              >
                Change Phone Number
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-green-600 font-medium hover:text-green-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
