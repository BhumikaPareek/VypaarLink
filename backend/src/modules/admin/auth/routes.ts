/**
 * modules/admin/auth/routes.ts — Routes for Platform Admin authentication
 *
 * Mounts at /api/v1/admin/auth:
 *   POST /login
 *   POST /logout
 *   GET  /me
 */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { adminLogin, adminLogout, adminMe } from './controller'
import { authenticateAdmin } from '../../../middleware/authenticateAdmin'

const router = Router()

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: 'Too many administrator login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/login', adminLoginLimiter, adminLogin)
router.post('/logout', adminLogout)
router.get('/me', authenticateAdmin, adminMe)

export default router
