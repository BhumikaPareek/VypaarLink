/**
 * modules/auth/routes.ts — Auth route definitions
 *
 * Mounts auth endpoints at (base path set in app.ts):
 *   POST   /api/v1/auth/register
 *   POST   /api/v1/auth/login
 *   GET    /api/v1/auth/me       (protected)
 *   POST   /api/v1/auth/logout
 */

import { Router } from 'express'
import { requestOtp, verifyAndRegister, login, customerLogin, me, logout } from './controller'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../middleware/authenticate'

const router = Router()

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: 'Too many OTP requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})


router.post('/send-otp', otpLimiter, requestOtp)
router.post('/verify-register', otpLimiter, verifyAndRegister)
router.post('/login', login)
router.post('/customer-login', otpLimiter, customerLogin)
router.get('/me', authenticate, me)
router.post('/logout', logout)

export default router

