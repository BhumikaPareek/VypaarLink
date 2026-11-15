/**
 * modules/admin/dashboard/routes.ts — Admin Dashboard routes
 *
 * All routes require PLATFORM_ADMIN authentication
 */

import { Router } from 'express'
import { authenticateAdmin } from '../../../middleware/authenticateAdmin'
import { requireAdmin } from '../../../middleware/requireAdmin'
import { getMetrics, getShops, getComplaints } from './controller'

const router = Router()

// Guard all data endpoints with admin authentication and role verification
router.use(authenticateAdmin)
router.use(requireAdmin)

router.get('/metrics', getMetrics)
router.get('/shops', getShops)
router.get('/complaints', getComplaints)

export default router
